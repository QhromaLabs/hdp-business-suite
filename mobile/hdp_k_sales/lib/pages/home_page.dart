import 'package:flutter/material.dart';
import 'package:hdp_k_sales/main.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

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
  List<dynamic> _recentSales = [];
  Map<String, dynamic>? _employeeProfile;

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

  Future<void> _refreshData() async {
    setState(() => _isLoading = true);
    try {
      await Future.wait([
        _fetchEmployeeProfile(),
        _fetchSalesTargets(),
        _fetchRecentSales(),
      ]);
    } catch (e) {
      debugPrint("Error refreshing data: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchEmployeeProfile() async {
    final response = await supabase
        .from('employees')
        .select()
        .eq('email', user?.email ?? '')
        .maybeSingle();
    if (response != null) {
      _employeeProfile = response;
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

    if (response != null) {
      _monthlyTarget = (response['target_amount'] as num).toDouble();
      _monthlyActual = (response['achieved_amount'] as num).toDouble();
    }
  }

  Future<void> _fetchRecentSales() async {
    final response = await supabase
        .from('sales_orders')
        .select('*, customers(full_name)')
        .eq('created_by', user?.id ?? '')
        .order('created_at', ascending: false)
        .limit(5);
    
    _recentSales = response;
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _verifyPermissions() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
  }

  void _listenForLocationRequests() {
    supabase.channel('public:location_requests').onPostgresChanges(
      event: PostgresChangeEvent.insert,
      schema: 'public',
      table: 'location_requests',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'sales_rep_id',
        value: user?.id ?? '',
      ),
      callback: (payload) {
        _handleAdminRequest(payload.newRecord);
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
        iconTheme: const IconThemeData(color: Colors.black),
        title: Text("Revenue Engine", 
          style: GoogleFonts.inter(color: Colors.black, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.black),
            onPressed: _refreshData,
          ),
        ],
      ),
      drawer: _buildDrawer(),
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
                  const SizedBox(height: 12),
                  _buildRecentSalesList(currencyFormat),
                ],
              ),
            ),
          ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).pushNamed('/pos'),
        backgroundColor: Colors.black,
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text("NEW SALE", style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
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
    );
  }

  Widget _buildTargetCard(NumberFormat formatter, double progress) {
    return Container(
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
              Text("Monthly Target", 
                style: GoogleFonts.inter(color: Colors.white.withOpacity(0.8), fontSize: 14)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text("${(progress * 100).toInt()}%", 
                  style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(formatter.format(_monthlyActual), 
            style: GoogleFonts.inter(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
          Text("of ${formatter.format(_monthlyTarget)}", 
            style: GoogleFonts.inter(color: Colors.white.withOpacity(0.7), fontSize: 14)),
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
    );
  }

  Widget _buildQuickActions() {
    return Row(
      children: [
        _buildActionItem(Icons.location_on, "Sync Loc", _isPinging ? null : () => _pingLocation(), _isPinging),
        const SizedBox(width: 12),
        _buildActionItem(Icons.people, "Customers", () {}, false), // To be implemented
        const SizedBox(width: 12),
        _buildActionItem(Icons.insights, "Analytics", () {}, false),
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
        Text("Recent Sales", 
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
        TextButton(
          onPressed: () {},
          child: Text("See All", style: GoogleFonts.inter(color: const Color(0xFFFF6600))),
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
        final customerName = sale['customers']?['full_name'] ?? 'Walk-in Customer';
        final amount = (sale['total_amount'] as num).toDouble();
        final date = DateTime.parse(sale['created_at']);
        
        return Container(
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
        );
      },
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            accountName: Text(_employeeProfile?['full_name'] ?? "Sales Rep", 
              style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            accountEmail: Text(user?.email ?? ""),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                (_employeeProfile?['full_name'] ?? user?.email ?? 'A')[0].toUpperCase(),
                style: GoogleFonts.inter(color: const Color(0xFFFF6600), fontWeight: FontWeight.bold, fontSize: 24),
              ),
            ),
            decoration: const BoxDecoration(color: Color(0xFFFF6600)),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard),
            title: Text('Dashboard', style: GoogleFonts.inter()),
            onTap: () => Navigator.pop(context),
          ),
          ListTile(
            leading: const Icon(Icons.shopping_cart),
            title: Text('New Sale (POS)', style: GoogleFonts.inter()),
            onTap: () {
              Navigator.pop(context);
              Navigator.of(context).pushNamed('/pos');
            },
          ),
          ListTile(
            leading: const Icon(Icons.account_balance_wallet, color: Colors.orange), // Use orange for emphasis
            title: Text('My Wallet & Earnings', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            onTap: () {
              Navigator.pop(context);
              Navigator.of(context).pushNamed('/wallet');
            },
          ),
          ListTile(
            leading: const Icon(Icons.people),
            title: Text('My Customers', style: GoogleFonts.inter()),
            onTap: () {},
          ),
          const Spacer(),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: Text('Logout', style: GoogleFonts.inter(color: Colors.red)),
            onTap: () async {
              await supabase.auth.signOut();
              if (mounted) Navigator.of(context).pushReplacementNamed('/login');
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
