import 'package:flutter/material.dart';
import 'package:hdp_k_sales/pages/home_page.dart';
import 'package:hdp_k_sales/pages/pos_page.dart';
import 'package:hdp_k_sales/pages/analytics_page.dart';
import 'package:hdp_k_sales/pages/crm_page.dart';
import 'package:hdp_k_sales/widgets/nav_bar_item.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

  late List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      HomePage(onTabChange: _onItemTapped),
      POSPage(onTabChange: _onItemTapped),
      const AnalyticsPage(),
      CRMPage(onTabChange: _onItemTapped),
    ];
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
            right: 24,
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
        ],
      ),
    );
  }
}
