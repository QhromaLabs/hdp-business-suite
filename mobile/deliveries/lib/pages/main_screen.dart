import 'package:flutter/material.dart';
import 'package:hdp_deliveries/pages/dashboard_page.dart';
import 'package:hdp_deliveries/pages/global_map_page.dart';
import 'package:hdp_deliveries/pages/history_page.dart';
import 'package:hdp_deliveries/widgets/nav_bar_item.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

  final List<Widget> _pages = const [
    DashboardPage(),
    GlobalMapPage(),
    HistoryPage(),
  ];

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
            bottom: 24, // Floating margin
            right: 24,  // Right aligned
            // We use right alignment as requested: "Alight the bottom navigtion bar to the right"
            // But usually nav bars are full width or center. 
            // The prompt says: "Alight the bottom navigtion bar to the right and make it floating with a rounded, white background."
            // This might mean the *items* are right aligned or the whole bar is a capsule floating on right?
            // "floating bottom floating bottom nav... Alight the bottom navigtion bar to the right"
            // I'll make it a capsule on the right side.
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
                    icon: Icons.map_rounded,
                    label: 'Map',
                    isSelected: _selectedIndex == 1,
                    onTap: () => _onItemTapped(1),
                  ),
                  const SizedBox(width: 8),
                  NavBarItem(
                    icon: Icons.history_rounded,
                    label: 'History',
                    isSelected: _selectedIndex == 2,
                    onTap: () => _onItemTapped(2),
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
