import 'package:flutter/material.dart';
import 'package:hdp_k_sales/main.dart';
import 'package:hdp_k_sales/pages/home_page.dart';
import 'package:hdp_k_sales/pages/pos_page.dart';
import 'package:hdp_k_sales/pages/analytics_page.dart';
import 'package:hdp_k_sales/pages/crm_page.dart';
import 'package:hdp_k_sales/widgets/nav_bar_item.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _selectedIndex = 0;
  Map<String, dynamic>? _employeeProfile;
  final User? user = supabase.auth.currentUser;

  late List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _fetchEmployeeProfile();
    _pages = [
      HomePage(onTabChange: _onItemTapped, scaffoldKey: _scaffoldKey),
      POSPage(onTabChange: _onItemTapped),
      AnalyticsPage(scaffoldKey: _scaffoldKey),
      CRMPage(onTabChange: _onItemTapped),
    ];
  }

  Future<void> _fetchEmployeeProfile() async {
    final response = await supabase
        .from('employees')
        .select()
        .eq('email', user?.email ?? '')
        .maybeSingle();
    if (mounted && response != null) {
      setState(() {
        _employeeProfile = response;
      });
    }
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: _buildDrawer(),
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Main Content
          IndexedStack(
            index: _selectedIndex,
            children: _pages,
          ),
          
          // Floating Bottom Navigation
          Positioned(
            bottom: 24,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(40),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.15),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    NavBarItem(
                      icon: Icons.home_rounded,
                      label: 'Home',
                      isSelected: _selectedIndex == 0,
                      onTap: () => _onItemTapped(0),
                    ),
                    const SizedBox(width: 8),
                    NavBarItem(
                      icon: Icons.point_of_sale_rounded,
                      label: 'POS',
                      isSelected: _selectedIndex == 1,
                      onTap: () => _onItemTapped(1),
                    ),
                    const SizedBox(width: 8),
                    NavBarItem(
                      icon: Icons.analytics_rounded,
                      label: 'Analytics',
                      isSelected: _selectedIndex == 2,
                      onTap: () => _onItemTapped(2),
                    ),
                    const SizedBox(width: 8),
                    NavBarItem(
                      icon: Icons.people_rounded,
                      label: 'Customers',
                      isSelected: _selectedIndex == 3,
                      onTap: () => _onItemTapped(3),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
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
              _onItemTapped(1);
            },
          ),
          ListTile(
            leading: const Icon(Icons.account_balance_wallet, color: Colors.orange),
            title: Text('My Wallet & Earnings', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            onTap: () {
              Navigator.pop(context);
              Navigator.of(context).pushNamed('/wallet');
            },
          ),
          ListTile(
            leading: const Icon(Icons.people),
            title: Text('My Customers', style: GoogleFonts.inter()),
            onTap: () {
              Navigator.pop(context);
              _onItemTapped(3);
            },
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
