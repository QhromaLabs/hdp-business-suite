import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hdp_k_sales/pages/login_page.dart';
import 'package:hdp_k_sales/pages/home_page.dart';
import 'package:hdp_k_sales/pages/splash_page.dart';
import 'package:hdp_k_sales/pages/pos_page.dart';
import 'package:hdp_k_sales/pages/signup_page.dart';
import 'package:hdp_k_sales/pages/crm_page.dart';
import 'package:hdp_k_sales/pages/wallet_page.dart';
import 'package:hdp_k_sales/pages/analytics_page.dart';
import 'package:hdp_k_sales/pages/settings_page.dart';
import 'package:hdp_k_sales/pages/main_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://nygxnxrasprjmxetvudk.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3hueHJhc3Byam14ZXR2dWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMDI4NjQsImV4cCI6MjA4MTY3ODg2NH0.ZMZmCFWhfT62rul3HFcWNq2mjrCpa4dantQIVOxR1qM',
  );

  runApp(const MyApp());
}

final supabase = Supabase.instance.client;

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HDP(k) SALES',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFFFF6600), // HDP Orange
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF6600),
          primary: const Color(0xFFFF6600),
          secondary: const Color(0xFF1A1A1A), // Dark Gray/Black
        ),
        useMaterial3: true,
        fontFamily: 'Roboto', // Default, we can use Google Fonts later
      ),
      home: const MainScreen(),
      routes: {
        '/login': (context) => const LoginPage(),
        '/home': (context) => const MainScreen(), // Redirects to MainScreen now
        '/pos': (context) => const POSPage(),
        '/signup': (context) => const SignUpPage(),
        '/crm': (context) => const CRMPage(),
        '/wallet': (context) => const WalletPage(),
        '/analytics': (context) => const AnalyticsPage(),
        '/settings': (context) => const SettingsPage(),
      },
    );
  }
}
