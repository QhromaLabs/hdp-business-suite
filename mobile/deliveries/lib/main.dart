import 'package:flutter/material.dart';
import 'package:hdp_deliveries/services/supabase_service.dart';
import 'package:hdp_deliveries/pages/login_page.dart';
import 'package:hdp_deliveries/pages/dashboard_page.dart';
import 'package:hdp_deliveries/pages/main_screen.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseService.initialize();
  
  final prefs = await SharedPreferences.getInstance();
  final phone = prefs.getString('agent_phone');
  
  runApp(MyApp(initialRoute: phone != null ? '/dashboard' : '/login'));
}

class MyApp extends StatelessWidget {
  final String initialRoute;
  const MyApp({super.key, required this.initialRoute});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HDP Deliveries',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFFFF6600), // HDP Orange
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF6600),
          primary: const Color(0xFFFF6600),
          secondary: const Color(0xFF1A1A1A), // Dark Gray/Black
        ),
        useMaterial3: true,
      ),
      initialRoute: initialRoute,
      routes: {
        '/login': (context) => const LoginPage(),
        '/dashboard': (context) => const MainScreen(),
      },
    );
  }
}
