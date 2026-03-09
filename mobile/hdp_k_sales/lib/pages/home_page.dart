import 'package:flutter/material.dart';
import 'package:hdp_k_sales/main.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'dart:async';

class HomePage extends StatefulWidget {
  final Function(int)? onTabChange;
  final GlobalKey<ScaffoldState>? scaffoldKey;
  
  const HomePage({super.key, this.onTabChange, this.scaffoldKey});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with SingleTickerProviderStateMixin {
  final User? user = supabase.auth.currentUser;
  bool _isLoading = true;
  bool _isPinging = false;
  String _statusMessage = "Ready";
  
  // Dashboard Data
  double _monthlyTarget = 0.0;
  double _monthlyActual = 0.0;
  double _commissionEarned = 0.0;
  List<dynamic> _recentSales = [];
  Map<String, dynamic>? _employeeProfile;
  bool _isOnDuty = false;
  String? _attendanceId;
  Timer? _pingTimer;

  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

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
        // Link the user_id if it's missing
        await supabase
            .from('employees')
            .update({'user_id': user!.id})
            .eq('id', response['id']);
        
        // Re-fetch the updated profile
        final updatedResponse = await supabase
            .from('employees')
            .select()
            .eq('id', response['id'])
            .single();
        _employeeProfile = updatedResponse;
      } else {
        _employeeProfile = response;
      }
      _fetchDutyStatus(); // Fetch status once profile is known
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
          // Agent is on duty if they checked in and haven't checked out yet
          _isOnDuty = response['check_in'] != null && response['check_out'] == null;
          
          if (_isOnDuty) {
            _startPeriodicPing();
          } else {
            _stopPeriodicPing();
          }
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
    
    final now = DateTime.now();
    final hour = now.hour;
    
    // Auto Clock-out check: If after 8:00 PM and still on duty, auto clock out
    if (hour >= 20 && _isOnDuty) {
      _toggleDuty(false);
      return;
    }

    // Modal Triggers
    if (!_isOnDuty) {
      // Morning / First open: If not on duty, ask to clock in
      _showDutyChoiceModal(isClockOut: false);
    } else if (hour >= 19 && _isOnDuty) {
      // Evening: If on duty after 7:00 PM (and before 8 PM), ask if time to clock out
      _showDutyChoiceModal(isClockOut: true);
    }
  }

  void _showDutyChoiceModal({required bool isClockOut}) {
    showModalBottomSheet(
      context: context,
      isDismissible: !isClockOut, // Force decision for clock in/out check usually, but let's allow dismiss for now
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
            Icon(
              isClockOut ? Icons.bedtime_outlined : Icons.wb_sunny_outlined,
              size: 48,
              color: const Color(0xFFFF6600),
            ),
            const SizedBox(height: 16),
            Text(
              isClockOut ? "Time to wrap up?" : "Start your shift?",
              style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              isClockOut 
                ? "It's past 7:00 PM. Would you like to clock out for the day?"
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
                onPressed: () {
                  Navigator.pop(ctx);
                  _toggleDuty(!isClockOut);
                },
                child: Text(
                  isClockOut ? "YES, CLOCK OUT" : "YES, ON DUTY",
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
            if (!isClockOut) ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text("NOT YET", style: TextStyle(color: Colors.grey[600])),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _startPeriodicPing() {
    if (_pingTimer != null) return; // Already running
    
    debugPrint("Starting periodic location pings (every 5 minutes)");
    // Duty ping: every 5 minutes for better real-time tracking
    _pingTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      if (_isOnDuty && mounted) {
        _pingLocation();
      } else {
        _stopPeriodicPing();
      }
    });
  }

  void _stopPeriodicPing() {
    if (_pingTimer != null) {
      debugPrint("Stopping periodic location pings");
      _pingTimer?.cancel();
      _pingTimer = null;
    }
  }

  Future<void> _toggleDuty(bool value) async {
    if (_employeeProfile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Employee profile not loaded. Please refresh.'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isLoading = true);
    
    try {
      final today = DateTime.now().toIso8601String().split('T')[0];
      final now = DateTime.now().toUtc().toIso8601String();

      if (value) {
        // Clock In
        if (_attendanceId == null) {
          final response = await supabase.from('attendance').insert({
            'employee_id': _employeeProfile!['id'],
            'date': today,
            'check_in': now,
            'status': 'present',
          }).select().single();
          _attendanceId = response['id'];
        } else {
          // Already has a record for today, update it (do not overwrite initial check_in!)
          await supabase.from('attendance').update({
            'check_out': null,
            'status': 'present',
          }).eq('id', _attendanceId!);
        }

        await supabase.from('attendance_logs').insert({
          'employee_id': _employeeProfile!['id'],
          'attendance_id': _attendanceId,
          'action': 'clock_in',
          'timestamp': now,
        });
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Clocked in successfully'), backgroundColor: Colors.green),
          );
        }
        // Auto-ping location on clock in
        _pingLocation();
        _startPeriodicPing();
      } else {
        // Clock Out
        if (_attendanceId != null) {
          await supabase.from('attendance').update({
            'check_out': now,
          }).eq('id', _attendanceId!);

          await supabase.from('attendance_logs').insert({
            'employee_id': _employeeProfile!['id'],
            'attendance_id': _attendanceId,
            'action': 'clock_out',
            'timestamp': now,
          });
          
          _stopPeriodicPing();

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Clocked out successfully'), backgroundColor: Colors.orange),
            );
          }
        }
      }
      await _fetchDutyStatus();
    } catch (e) {
      debugPrint("Error toggling duty: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchSalesTargets() async {
    final now = DateTime.now();
    final firstDayOfMonth = DateTime(now.year, now.month, 1).toIso8601String();
    
    final response = await supabase
        .from('sales_targets')
        .select()
        .eq('user_id', user?.id ?? '')
        .gte('target_month', firstDayOfMonth)
        .maybeSingle();

    // Fetch commission earned as well
    final commissionRes = await supabase
        .from('sales_commissions')
        .select('amount')
        .eq('sales_agent_id', _employeeProfile?['id'] ?? '')
        .gte('created_at', firstDayOfMonth);
    
    final commissionTotal = commissionRes.fold<double>(0, (sum, comm) => sum + (comm['amount'] as num).toDouble());

    if (mounted) {
      setState(() {
        if (response != null) {
          _monthlyTarget = (response['target_amount'] as num).toDouble();
          _monthlyActual = (response['achieved_amount'] as num).toDouble();
        }
        _commissionEarned = commissionTotal;
      });
    }
  }

  Future<void> _fetchRecentSales() async {
    final now = DateTime.now();
    // Fetch last 7 days for weekly history
    final startOfWeek = now.subtract(const Duration(days: 7));
    final startDate = DateTime(startOfWeek.year, startOfWeek.month, startOfWeek.day).toIso8601String();

    final response = await supabase
        .from('sales_orders')
        .select('*, customers(name)')
        .eq('created_by', user?.id ?? '')
        .gte('created_at', startDate)
        .order('created_at', ascending: false);
    
    if (mounted) {
      setState(() {
        _recentSales = response;
      });
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    _stopPeriodicPing();
    super.dispose();
  }

  Future<void> _verifyPermissions() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
  }

  void _listenForLocationRequests() {
    final user = supabase.auth.currentUser;
    if (user == null) return;

    // Listen for location requests from admin
    supabase.channel('public:location_requests').onPostgresChanges(
      event: PostgresChangeEvent.insert,
      schema: 'public',
      table: 'location_requests',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'sales_rep_id',
        value: user.id,
      ),
      callback: (payload) {
        _handleAdminRequest(payload.newRecord);
      },
    ).subscribe();

    // Listen for sales target updates
    supabase.channel('public:sales_targets').onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'sales_targets',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'user_id',
        value: user.id,
      ),
      callback: (payload) {
        _fetchSalesTargets();
      },
    ).subscribe();

    // Listen for new sales orders
    supabase.channel('public:sales_orders').onPostgresChanges(
      event: PostgresChangeEvent.insert,
      schema: 'public',
      table: 'sales_orders',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'created_by',
        value: user.id,
      ),
      callback: (payload) {
        // Run both in parallel for speed
        Future.wait([
          _fetchRecentSales(),
          _fetchSalesTargets(),
        ]);
      },
    ).subscribe();
  }

  void _handleAdminRequest(Map<String, dynamic> request) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Location Request", 
          style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        content: const Text("Admin is requesting your live location for verification."),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _pingLocation(requestId: request['id']);
            },
            child: const Text("Send Now"),
          ),
        ],
      ),
    );
  }

  Future<void> _pingLocation({String? requestId}) async {
    setState(() {
      _isPinging = true;
      _statusMessage = "Locating...";
    });

    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      await supabase.from('user_locations').insert({
        'user_id': user?.id,
        'latitude': position.latitude,
        'longitude': position.longitude,
      });

      if (requestId != null) {
        await supabase.from('location_requests').update({
          'status': 'responded',
          'responded_at': DateTime.now().toIso8601String(),
        }).eq('id', requestId);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location shared'), backgroundColor: Colors.black),
        );
      }
      setState(() => _statusMessage = "Shared: ${position.latitude.toStringAsFixed(2)}, ${position.longitude.toStringAsFixed(2)}");

    } catch (e) {
      setState(() => _statusMessage = "Failed");
    } finally {
      setState(() => _isPinging = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);
    double progress = _monthlyTarget > 0 ? (_monthlyActual / _monthlyTarget) : 0.0;
    if (progress > 1.0) progress = 1.0;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.menu, color: Colors.black),
          onPressed: () => widget.scaffoldKey?.currentState?.openDrawer(),
        ),
        title: Text("Revenue Engine", 
          style: GoogleFonts.inter(color: Colors.black, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.black),
            onPressed: () => Navigator.of(context).pushNamed('/settings').then((_) => _refreshData()),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.black),
            onPressed: _refreshData,
          ),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600)))
        : RefreshIndicator(
            onRefresh: _refreshData,
            color: const Color(0xFFFF6600),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(),
                  const SizedBox(height: 24),
                  _buildTargetCard(currencyFormat, progress),
                  const SizedBox(height: 24),
                  _buildQuickActions(),
                  const SizedBox(height: 24),
                  _buildRecentSalesHeader(),
                  const SizedBox(height: 16),
                  _buildRecentSalesList(currencyFormat),
                  const SizedBox(height: 100), // Bottom spacer for nav
        ],
              ),
            ),
          ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Good Day,",
              style: GoogleFonts.inter(fontSize: 16, color: Colors.grey[600]),
            ),
            Text(
              _employeeProfile?['full_name'] ?? user?.email?.split('@')[0] ?? 'Agent',
              style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.black),
            ),
          ],
        ),
        Column(
          children: [
            Transform.scale(
              scale: 0.8,
              child: Switch(
                value: _isOnDuty,
                onChanged: _isLoading ? null : _toggleDuty,
                activeColor: const Color(0xFFFF6600),
                activeTrackColor: const Color(0xFFFF6600).withOpacity(0.2),
              ),
            ),
            Text(
              _isOnDuty ? "ON DUTY" : "OFF DUTY",
              style: GoogleFonts.inter(
                fontSize: 10, 
                fontWeight: FontWeight.bold, 
                color: _isOnDuty ? const Color(0xFFFF6600) : Colors.grey
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTargetCard(NumberFormat formatter, double progress) {
    return InkWell(
      onTap: () => Navigator.of(context).pushNamed('/wallet').then((_) => _refreshData()),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFF6600), Color(0xFFFF9933)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFFF6600).withOpacity(0.3),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Commission Earned", 
                  style: GoogleFonts.inter(color: Colors.white.withOpacity(0.8), fontSize: 14)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text("${(progress * 100).toInt()}% Target", 
                    style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(formatter.format(_commissionEarned), 
              style: GoogleFonts.inter(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
            Text("Monthly Sales: ${formatter.format(_monthlyActual)} / ${formatter.format(_monthlyTarget)}", 
              style: GoogleFonts.inter(color: Colors.white.withOpacity(0.7), fontSize: 12)),
            const SizedBox(height: 20),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: Colors.white.withOpacity(0.2),
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                minHeight: 8,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return Row(
      children: [
        _buildActionItem(Icons.account_balance_wallet, "Withdraw", () => Navigator.of(context).pushNamed('/wallet').then((_) => _refreshData()), false),
        const SizedBox(width: 12),
        _buildActionItem(Icons.people, "Customers", () => widget.onTabChange?.call(3), false),
        const SizedBox(width: 12),
        _buildActionItem(Icons.insights, "Analytics", () => widget.onTabChange?.call(2), false),
      ],
    );
  }

  Widget _buildActionItem(IconData icon, String label, VoidCallback? onTap, bool loading) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Column(
            children: [
              loading 
                ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFFF6600)))
                : Icon(icon, color: Colors.black, size: 24),
              const SizedBox(height: 8),
              Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentSalesHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text("Weekly Sales History", 
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
        TextButton(
          onPressed: () => _refreshData(),
          child: Text("Refresh", style: GoogleFonts.inter(color: const Color(0xFFFF6600))),
        ),
      ],
    );
  }

  Widget _buildRecentSalesList(NumberFormat formatter) {
    if (_recentSales.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Icon(Icons.shopping_bag_outlined, size: 48, color: Colors.grey[300]),
            const SizedBox(height: 12),
            Text("No sales recorded yet", style: GoogleFonts.inter(color: Colors.grey)),
          ],
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _recentSales.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final sale = _recentSales[index];
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
                    color: const Color(0xFFFF6600).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
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
    final currencyFormat = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Order Details', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
            ),
            const Divider(),
            Expanded(
              child: FutureBuilder<List<dynamic>>(
                future: supabase.from('sales_order_items').select('*, product_variants(variant_name)').eq('order_id', order['id']),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600)));
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('Error: ${snapshot.error}'));
                  }
                  final items = snapshot.data ?? [];
                  return ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      _buildDetailRow('Order #', order['order_number'] ?? order['id'].toString().substring(0, 8)),
                      _buildDetailRow('Date', DateFormat('MMM dd, yyyy HH:mm').format(DateTime.parse(order['created_at']))),
                      _buildDetailRow('Customer', order['customers']?['name'] ?? 'Walk-in'),
                      const SizedBox(height: 24),
                      Text('ITEMS', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                      const SizedBox(height: 12),
                      ...items.map((item) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item['product_variants']?['variant_name'] ?? 'Unknown Item', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                                Text('Qty: ${item['quantity']} @ ${currencyFormat.format(item['unit_price'])}', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                              ],
                            ),
                            Text(currencyFormat.format(item['total_price']), style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                          ],
                        ),
                      )),
                      const Divider(height: 48),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('TOTAL', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
                          Text(currencyFormat.format(order['total_amount']), style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFFFF6600))),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.inter(color: Colors.grey[600])),
          Text(value, style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
