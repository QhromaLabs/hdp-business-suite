import 'package:flutter/material.dart';
import 'package:hdp_k_sales/main.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:async';

class HomePage extends StatefulWidget {
  final Function(int)? onTabChange;
  final GlobalKey<ScaffoldState>? scaffoldKey;

  const HomePage({super.key, this.onTabChange, this.scaffoldKey});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with TickerProviderStateMixin {
  final User? user = supabase.auth.currentUser;
  bool _isLoading = true;
  bool _isPinging = false;

  // Dashboard Data
  double _monthlyTarget = 0.0;
  double _monthlyActual = 0.0;
  double _commissionEarned = 0.0;
  List<dynamic> _recentSales = [];
  Map<String, dynamic>? _employeeProfile;
  bool _isOnDuty = false;
  String? _attendanceId;
  Timer? _pingTimer;

  int _salesLimit = 5;

  // Greeting animation
  late AnimationController _greetingAnimController;
  late Animation<double> _greetingOpacity;
  late Animation<Offset> _greetingSlide;

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  }

  @override
  void initState() {
    super.initState();

    _greetingAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _greetingOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _greetingAnimController, curve: Curves.easeOut),
    );
    _greetingSlide = Tween<Offset>(begin: const Offset(0, -0.6), end: Offset.zero).animate(
      CurvedAnimation(parent: _greetingAnimController, curve: Curves.easeOut),
    );
    _greetingAnimController.forward();

    _refreshData();
    _listenForLocationRequests();
    _verifyPermissions();
  }

  Future<void> _refreshData({bool showLoading = true}) async {
    if (showLoading) setState(() => _isLoading = true);
    try {
      await Future.wait([
        _fetchEmployeeProfile(),
        _fetchSalesTargets(),
        _fetchRecentSales(),
        _fetchDutyStatus(),
      ]);
      _checkAutoModal();
    } catch (e) {
      debugPrint("Error refreshing data: $e");
    } finally {
      if (mounted && showLoading) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchEmployeeProfile() async {
    final response = await supabase
        .from('employees')
        .select()
        .eq('email', user?.email ?? '')
        .eq('is_active', true)
        .maybeSingle();

    if (response != null) {
      if (response['user_id'] == null && user != null) {
        await supabase.from('employees').update({'user_id': user!.id}).eq('id', response['id']);
        final updated = await supabase.from('employees').select().eq('id', response['id']).single();
        _employeeProfile = updated;
      } else {
        _employeeProfile = response;
      }
      _fetchDutyStatus();
    }
  }

  Future<void> _fetchDutyStatus() async {
    if (_employeeProfile == null) return;
    final today = DateTime.now().toIso8601String().split('T')[0];
    final response = await supabase
        .from('attendance')
        .select()
        .eq('employee_id', _employeeProfile!['id'])
        .eq('date', today)
        .maybeSingle();

    if (mounted) {
      setState(() {
        if (response != null) {
          _attendanceId = response['id'];
          _isOnDuty = response['check_in'] != null && response['check_out'] == null;
          if (_isOnDuty) _startPeriodicPing(); else _stopPeriodicPing();
        } else {
          _isOnDuty = false;
          _attendanceId = null;
          _stopPeriodicPing();
        }
      });
    }
  }

  void _checkAutoModal() {
    if (!mounted) return;
    final hour = DateTime.now().hour;
    if (hour >= 20 && _isOnDuty) { _toggleDuty(false); return; }
    if (!_isOnDuty) {
      _showDutyChoiceModal(isClockOut: false);
    } else if (hour >= 19 && _isOnDuty) {
      _showDutyChoiceModal(isClockOut: true);
    }
  }

  void _showDutyChoiceModal({required bool isClockOut}) {
    showModalBottomSheet(
      context: context,
      isDismissible: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 24),
            Icon(isClockOut ? Icons.bedtime_outlined : Icons.wb_sunny_outlined, size: 48, color: const Color(0xFFFF6600)),
            const SizedBox(height: 16),
            Text(isClockOut ? "Time to wrap up?" : "Start your shift?",
              style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(
              isClockOut ? "It's past 7:00 PM. Would you like to clock out for the day?"
                : "Welcome! Ready to start your duty and log your location?",
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: Colors.grey[600]),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF6600),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: () { Navigator.pop(ctx); _toggleDuty(!isClockOut); },
                child: Text(isClockOut ? "YES, CLOCK OUT" : "YES, ON DUTY",
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
            if (!isClockOut) ...[
              const SizedBox(height: 12),
              TextButton(onPressed: () => Navigator.pop(ctx),
                child: Text("NOT YET", style: TextStyle(color: Colors.grey[600]))),
            ],
          ],
        ),
      ),
    );
  }

  void _startPeriodicPing() {
    if (_pingTimer != null) return;
    _pingTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      if (_isOnDuty && mounted) _pingLocation(); else _stopPeriodicPing();
    });
  }

  void _stopPeriodicPing() {
    _pingTimer?.cancel();
    _pingTimer = null;
  }

  Future<void> _toggleDuty(bool value) async {
    if (_employeeProfile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Employee profile not loaded.'), backgroundColor: Colors.red));
      return;
    }
    setState(() => _isLoading = true);
    try {
      final today = DateTime.now().toIso8601String().split('T')[0];
      final now = DateTime.now().toUtc().toIso8601String();
      if (value) {
        if (_attendanceId == null) {
          final res = await supabase.from('attendance').insert({
            'employee_id': _employeeProfile!['id'], 'date': today,
            'check_in': now, 'status': 'present',
          }).select().single();
          _attendanceId = res['id'];
        } else {
          await supabase.from('attendance').update({'check_out': null, 'status': 'present'}).eq('id', _attendanceId!);
        }
        await supabase.from('attendance_logs').insert({
          'employee_id': _employeeProfile!['id'], 'attendance_id': _attendanceId,
          'action': 'clock_in', 'timestamp': now,
        });
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Clocked in successfully'), backgroundColor: Colors.green));
        _pingLocation();
        _startPeriodicPing();
      } else {
        if (_attendanceId != null) {
          await supabase.from('attendance').update({'check_out': now}).eq('id', _attendanceId!);
          await supabase.from('attendance_logs').insert({
            'employee_id': _employeeProfile!['id'], 'attendance_id': _attendanceId,
            'action': 'clock_out', 'timestamp': now,
          });
          _stopPeriodicPing();
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Clocked out successfully'), backgroundColor: Colors.orange));
        }
      }
      await _fetchDutyStatus();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchSalesTargets() async {
    final now = DateTime.now();
    final firstDayOfMonth = DateTime(now.year, now.month, 1).toIso8601String();

    // Monthly sales target (goal is measured in KES of sales, not commission)
    final targetRes = await supabase.from('sales_targets').select().eq('user_id', user?.id ?? '').gte('target_month', firstDayOfMonth).maybeSingle();

    // Actual sales this month — summed directly from orders (not the stale achieved_amount column)
    final actualRes = await supabase.from('sales_orders').select('total_amount').eq('created_by', user?.id ?? '').gte('created_at', firstDayOfMonth);
    final actualTotal = actualRes.fold<double>(0, (sum, o) => sum + (o['total_amount'] as num).toDouble());

    // Commission — all-time total (commission is a separate metric from the sales goal)
    String? empId = _employeeProfile?['id'];
    if (empId == null) {
      final emp = await supabase.from('employees').select('id').eq('user_id', user?.id ?? '').maybeSingle();
      empId = emp?['id'];
    }
    double commissionTotal = 0;
    if (empId != null) {
      final commRes = await supabase.from('sales_commissions').select('amount').eq('sales_agent_id', empId);
      commissionTotal = commRes.fold<double>(0, (sum, c) => sum + (c['amount'] as num).toDouble());
    }

    if (mounted) {
      setState(() {
        _monthlyActual = actualTotal;
        if (targetRes != null) _monthlyTarget = (targetRes['target_amount'] as num).toDouble();
        _commissionEarned = commissionTotal;
      });
    }
  }

  Future<void> _fetchRecentSales() async {
    final response = await supabase
        .from('sales_orders')
        .select('*, customers(id, name, address, phone, latitude, longitude)')
        .eq('created_by', user?.id ?? '')
        .order('created_at', ascending: false)
        .limit(50);
    if (mounted) setState(() => _recentSales = response);
  }

  @override
  void dispose() {
    _greetingAnimController.dispose();
    _stopPeriodicPing();
    super.dispose();
  }

  Future<void> _verifyPermissions() async {
    LocationPermission p = await Geolocator.checkPermission();
    if (p == LocationPermission.denied) await Geolocator.requestPermission();
  }

  void _listenForLocationRequests() {
    final u = supabase.auth.currentUser;
    if (u == null) return;
    supabase.channel('public:location_requests').onPostgresChanges(
      event: PostgresChangeEvent.insert, schema: 'public', table: 'location_requests',
      filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'sales_rep_id', value: u.id),
      callback: (payload) => _handleAdminRequest(payload.newRecord),
    ).subscribe();
    supabase.channel('public:sales_targets').onPostgresChanges(
      event: PostgresChangeEvent.all, schema: 'public', table: 'sales_targets',
      filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'user_id', value: u.id),
      callback: (_) => _fetchSalesTargets(),
    ).subscribe();
    supabase.channel('public:sales_orders').onPostgresChanges(
      event: PostgresChangeEvent.insert, schema: 'public', table: 'sales_orders',
      filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'created_by', value: u.id),
      callback: (_) => Future.wait([_fetchRecentSales(), _fetchSalesTargets()]),
    ).subscribe();
  }

  void _handleAdminRequest(Map<String, dynamic> request) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Location Request", style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        content: const Text("Admin is requesting your live location."),
        actions: [
          TextButton(
            onPressed: () { Navigator.pop(context); _pingLocation(requestId: request['id']); },
            child: const Text("Send Now"),
          ),
        ],
      ),
    );
  }

  Future<void> _pingLocation({String? requestId}) async {
    setState(() => _isPinging = true);
    try {
      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      await supabase.from('user_locations').insert({'user_id': user?.id, 'latitude': position.latitude, 'longitude': position.longitude});
      if (requestId != null) {
        await supabase.from('location_requests').update({'status': 'responded', 'responded_at': DateTime.now().toIso8601String()}).eq('id', requestId);
      }
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Location shared'), backgroundColor: Colors.black));
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isPinging = false);
    }
  }

  Future<void> _openWhatsApp(String message) async {
    final encoded = Uri.encodeComponent(message);
    final waUri = Uri.parse('whatsapp://send?text=$encoded');
    final fallback = Uri.parse('https://wa.me/?text=$encoded');
    if (await canLaunchUrl(waUri)) {
      await launchUrl(waUri);
    } else {
      await launchUrl(fallback, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);
    double progress = _monthlyTarget > 0 ? (_monthlyActual / _monthlyTarget).clamp(0.0, 1.0) : 0.0;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: SafeArea(
        child: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600)))
          : RefreshIndicator(
              onRefresh: _refreshData,
              color: const Color(0xFFFF6600),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 20),
                    _buildTargetCard(currencyFormat, progress),
                    const SizedBox(height: 20),
                    _buildQuickActions(),
                    const SizedBox(height: 16),
                    _buildDutyToggle(),
                    const SizedBox(height: 24),
                    _buildRecentSalesHeader(),
                    const SizedBox(height: 16),
                    _buildRecentSalesList(currencyFormat),
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SlideTransition(
                position: _greetingSlide,
                child: FadeTransition(
                  opacity: _greetingOpacity,
                  child: Text(_greeting,
                    style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFFFF6600), fontWeight: FontWeight.w600)),
                ),
              ),
              Text(
                _employeeProfile?['full_name'] ?? user?.email?.split('@')[0] ?? 'Agent',
                style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.menu_rounded, size: 28, color: Colors.black87),
          onPressed: () => widget.scaffoldKey?.currentState?.openDrawer(),
          padding: EdgeInsets.zero,
        ),
      ],
    );
  }

  Widget _buildDutyToggle() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: _isOnDuty ? const Color(0xFFFF6600).withOpacity(0.08) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _isOnDuty ? const Color(0xFFFF6600).withOpacity(0.3) : Colors.grey[200]!),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _isOnDuty ? const Color(0xFFFF6600).withOpacity(0.15) : Colors.grey[100],
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _isOnDuty ? Icons.work_rounded : Icons.work_off_rounded,
                  color: _isOnDuty ? const Color(0xFFFF6600) : Colors.grey,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _isOnDuty ? 'ON DUTY' : 'OFF DUTY',
                    style: GoogleFonts.inter(
                      fontSize: 13, fontWeight: FontWeight.bold,
                      color: _isOnDuty ? const Color(0xFFFF6600) : Colors.grey[600],
                    ),
                  ),
                  Text(
                    _isOnDuty ? 'Location tracking active' : 'Tap to start your shift',
                    style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[500]),
                  ),
                ],
              ),
            ],
          ),
          Switch(
            value: _isOnDuty,
            onChanged: _isLoading ? null : _toggleDuty,
            activeColor: const Color(0xFFFF6600),
            activeTrackColor: const Color(0xFFFF6600).withOpacity(0.2),
          ),
        ],
      ),
    );
  }

  Widget _buildTargetCard(NumberFormat formatter, double progress) {
    final pct = (progress * 100).toInt();
    final remaining = (_monthlyTarget - _monthlyActual).clamp(0.0, double.infinity);

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6600), Color(0xFFFF9933)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [BoxShadow(color: const Color(0xFFFF6600).withOpacity(0.28), blurRadius: 14, offset: const Offset(0, 6))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Clearly named: this is a SALES goal, not a commission target
              Text('Monthly Sales Goal',
                style: GoogleFonts.inter(color: Colors.white.withOpacity(0.9), fontSize: 13, fontWeight: FontWeight.w600)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                child: Text('$pct% achieved',
                  style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Main value = actual sales (KES sold this month), NOT commission
          Text(formatter.format(_monthlyActual),
            style: GoogleFonts.inter(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold)),
          Text('Sales this month  ·  Target: ${formatter.format(_monthlyTarget)}',
            style: GoogleFonts.inter(color: Colors.white.withOpacity(0.75), fontSize: 12)),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.white.withOpacity(0.22),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              minHeight: 9,
            ),
          ),
          const SizedBox(height: 10),
          // Commission shown as a secondary line — clearly separate from the sales goal
          Row(
            children: [
              const Icon(Icons.account_balance_wallet_outlined, size: 13, color: Colors.white70),
              const SizedBox(width: 5),
              Text(
                _monthlyTarget > 0 && progress < 1.0
                  ? 'Commission: ${formatter.format(_commissionEarned)}  ·  ${formatter.format(remaining)} to go'
                  : 'Commission earned: ${formatter.format(_commissionEarned)}',
                style: GoogleFonts.inter(color: Colors.white.withOpacity(0.8), fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Row(
      children: [
        _buildActionItem(Icons.point_of_sale_rounded, "Record Sale", () => widget.onTabChange?.call(1)),
        const SizedBox(width: 10),
        _buildActionItem(Icons.account_balance_wallet_rounded, "Wallet", () => Navigator.of(context).pushNamed('/wallet').then((_) => _refreshData())),
        const SizedBox(width: 10),
        _buildActionItem(Icons.people_rounded, "Customers", () => widget.onTabChange?.call(3)),
        const SizedBox(width: 10),
        _buildActionItem(Icons.insights_rounded, "Analytics", () => widget.onTabChange?.call(2)),
      ],
    );
  }

  Widget _buildActionItem(IconData icon, String label, VoidCallback? onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Column(
            children: [
              Icon(icon, color: Colors.black, size: 22),
              const SizedBox(height: 6),
              Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentSalesHeader() {
    final displayed = _recentSales.length;
    final showing = _salesLimit < displayed;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text("Recent Sales History",
          style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.bold)),
        Row(
          children: [
            InkWell(
              onTap: _fetchRecentSales,
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.all(6),
                child: Icon(Icons.refresh, size: 18, color: Colors.grey[600]),
              ),
            ),
            if (displayed > 5)
              TextButton(
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: () => setState(() => _salesLimit = showing ? displayed : 5),
                child: Text(showing ? "See More" : "Show Less",
                  style: GoogleFonts.inter(color: const Color(0xFFFF6600), fontSize: 13)),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildRecentSalesList(NumberFormat formatter) {
    if (_recentSales.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        child: Column(
          children: [
            Icon(Icons.shopping_bag_outlined, size: 48, color: Colors.grey[300]),
            const SizedBox(height: 12),
            Text("No sales recorded yet", style: GoogleFonts.inter(color: Colors.grey)),
          ],
        ),
      );
    }

    final visible = _recentSales.take(_salesLimit).toList();

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: visible.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final sale = visible[index];
        final customerName = sale['customers']?['name'] ?? 'Walk-in Customer';
        final amount = (sale['total_amount'] as num).toDouble();
        final date = DateTime.parse(sale['created_at']);

        return InkWell(
          onTap: () => _showOrderDetails(sale),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[100]!),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF6600).withOpacity(0.1), shape: BoxShape.circle),
                  child: const Icon(Icons.receipt_long, color: Color(0xFFFF6600), size: 20),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(customerName, style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                      Text(DateFormat('MMM dd, hh:mm a').format(date),
                        style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                ),
                Text(formatter.format(amount),
                  style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.black)),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showOrderDetails(Map<String, dynamic> order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _OrderDetailsSheet(
        order: order,
        onWhatsApp: _openWhatsApp,
        onLocationSaved: _fetchRecentSales,
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.inter(color: Colors.grey[600], fontSize: 13)),
          Flexible(child: Text(value, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13), textAlign: TextAlign.right)),
        ],
      ),
    );
  }
}

// ─── Order Details Sheet ────────────────────────────────────────────────────

class _OrderDetailsSheet extends StatefulWidget {
  final Map<String, dynamic> order;
  final Future<void> Function(String) onWhatsApp;
  final VoidCallback onLocationSaved;

  const _OrderDetailsSheet({
    required this.order,
    required this.onWhatsApp,
    required this.onLocationSaved,
  });

  @override
  State<_OrderDetailsSheet> createState() => _OrderDetailsSheetState();
}

class _OrderDetailsSheetState extends State<_OrderDetailsSheet> {
  late String? _address;
  late double? _custLat;
  late double? _custLng;
  bool _savingLocation = false;
  List<dynamic>? _items;
  bool _loadingItems = true;

  static const _orange = Color(0xFFFF6600);

  @override
  void initState() {
    super.initState();
    final cust = widget.order['customers'];
    _address = cust?['address'] as String?;
    _custLat = (cust?['latitude'] as num?)?.toDouble();
    _custLng = (cust?['longitude'] as num?)?.toDouble();
    _loadItems();
  }

  Future<void> _loadItems() async {
    final res = await supabase
        .from('sales_order_items')
        .select('*, product_variants(variant_name, products(name))')
        .eq('order_id', widget.order['id']);
    if (mounted) setState(() { _items = res; _loadingItems = false; });
  }

  String _productName(Map item) {
    final pName = item['product_variants']?['products']?['name'] ?? '';
    final vName = item['product_variants']?['variant_name'] ?? '';
    if (vName.isEmpty || vName == 'Standard' || vName == 'Default' || vName == pName) return pName;
    return '$pName $vName'.trim();
  }

  String get _locationText {
    if (_address != null && _address!.isNotEmpty) return _address!;
    if (_custLat != null && _custLng != null) return 'GPS ${_custLat!.toStringAsFixed(5)}, ${_custLng!.toStringAsFixed(5)}';
    // Fall back to order-level GPS (where sale was made)
    final oLat = widget.order['latitude'];
    final oLng = widget.order['longitude'];
    if (oLat != null && oLng != null) return 'Order GPS ${(oLat as num).toStringAsFixed(5)}, ${(oLng as num).toStringAsFixed(5)}';
    return '';
  }

  bool get _hasLocation => _locationText.isNotEmpty;

  void _showEditLocation() {
    final addrCtrl = TextEditingController(text: _address ?? '');
    bool isGettingGps = false;
    double? tempLat = _custLat;
    double? tempLng = _custLng;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: Container(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 20),
                Text('Edit Customer Location', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Saved globally for this customer', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[500])),
                const SizedBox(height: 20),
                TextField(
                  controller: addrCtrl,
                  decoration: InputDecoration(
                    labelText: 'Address / Location Name',
                    prefixIcon: const Icon(Icons.place_outlined, color: Colors.grey),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: _orange, width: 2),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: isGettingGps ? null : () async {
                    setS(() => isGettingGps = true);
                    try {
                      LocationPermission perm = await Geolocator.checkPermission();
                      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
                      if (perm == LocationPermission.whileInUse || perm == LocationPermission.always) {
                        final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
                        setS(() { tempLat = pos.latitude; tempLng = pos.longitude; });
                        if (addrCtrl.text.isEmpty) addrCtrl.text = 'Pinned Location';
                      }
                    } catch (_) {}
                    setS(() => isGettingGps = false);
                  },
                  icon: isGettingGps
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.my_location, size: 18),
                  label: Text(tempLat != null ? 'GPS: ${tempLat!.toStringAsFixed(4)}, ${tempLng!.toStringAsFixed(4)}' : 'Pin GPS Location'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _orange,
                    side: const BorderSide(color: _orange),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _savingLocation ? null : () async {
                    Navigator.pop(ctx);
                    await _saveLocation(addrCtrl.text.trim(), tempLat, tempLng);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _orange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text('SAVE LOCATION', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _saveLocation(String address, double? lat, double? lng) async {
    final customerId = widget.order['customers']?['id'] ?? widget.order['customer_id'];
    if (customerId == null) return;
    setState(() => _savingLocation = true);
    try {
      final updates = <String, dynamic>{};
      if (address.isNotEmpty) updates['address'] = address;
      if (lat != null) updates['latitude'] = lat;
      if (lng != null) updates['longitude'] = lng;
      if (updates.isEmpty) return;

      await supabase.from('customers').update(updates).eq('id', customerId);
      if (mounted) {
        setState(() {
          if (address.isNotEmpty) _address = address;
          if (lat != null) _custLat = lat;
          if (lng != null) _custLng = lng;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location saved'), backgroundColor: Colors.green));
        widget.onLocationSaved();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _savingLocation = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);
    final order = widget.order;
    final customerName = order['customers']?['name'] ?? 'Walk-in';

    // Build WhatsApp message
    final itemLines = (_items ?? []).map((item) {
      return '• ${_productName(item)} x${item['quantity']} (${fmt.format(item['total_price'])})';
    }).join('\n');

    final locationLine = _hasLocation ? _locationText : 'Location not recorded';
    final whatsAppMessage =
        '🛒 *Delivery Order*\n\n'
        'Customer: $customerName\n'
        'Location: $locationLine\n\n'
        'Items:\n$itemLines\n\n'
        'Total: ${fmt.format(order['total_amount'])}\n\n'
        'Please confirm delivery. Thank you!';

    return Container(
      height: MediaQuery.of(context).size.height * 0.82,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Order Details', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _loadingItems
                ? const Center(child: CircularProgressIndicator(color: _orange))
                : ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      // Order meta
                      _row('Order #', (order['order_number'] ?? order['id'].toString().substring(0, 8)).toString().toUpperCase()),
                      _row('Date', DateFormat('MMM dd, yyyy HH:mm').format(DateTime.parse(order['created_at']))),
                      _row('Customer', customerName),
                      _row('Payment', (order['payment_method'] ?? '').toString().toUpperCase()),
                      const SizedBox(height: 16),

                      // Location row with edit
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('LOCATION', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey[500], letterSpacing: 1)),
                                const SizedBox(height: 4),
                                _hasLocation
                                    ? Text(_locationText, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600))
                                    : Text('No location saved', style: GoogleFonts.inter(fontSize: 13, color: Colors.red[400])),
                              ],
                            ),
                          ),
                          TextButton.icon(
                            onPressed: _showEditLocation,
                            icon: const Icon(Icons.edit_location_alt_outlined, size: 16),
                            label: Text(_hasLocation ? 'Edit' : 'Add', style: GoogleFonts.inter(fontSize: 12)),
                            style: TextButton.styleFrom(foregroundColor: _orange, padding: const EdgeInsets.symmetric(horizontal: 8)),
                          ),
                        ],
                      ),
                      const Divider(height: 28),

                      // Items
                      Text('ITEMS', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey[500], letterSpacing: 1)),
                      const SizedBox(height: 10),
                      ...(_items ?? []).map((item) {
                        final name = _productName(item);
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 7),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(name.isEmpty ? 'Item' : name,
                                        style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                                    Text('${item['quantity']} × ${fmt.format(item['unit_price'])}',
                                        style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[500])),
                                  ],
                                ),
                              ),
                              Text(fmt.format(item['total_price']),
                                  style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                            ],
                          ),
                        );
                      }),
                      const Divider(height: 28),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('TOTAL', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold)),
                          Text(fmt.format(order['total_amount']),
                            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: _orange)),
                        ],
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () => widget.onWhatsApp(whatsAppMessage),
                          icon: const FaIcon(FontAwesomeIcons.whatsapp, size: 18, color: Colors.white),
                          label: Text('Send to Delivery', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF25D366),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 0,
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.inter(color: Colors.grey[600], fontSize: 13)),
          Flexible(child: Text(value, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13), textAlign: TextAlign.right)),
        ],
      ),
    );
  }
}
