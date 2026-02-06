import 'package:flutter/material.dart';
import 'package:hdp_deliveries/services/supabase_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _phoneController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Set initial +254 prefix
    _phoneController.text = '+254';
    
    _phoneController.addListener(() {
      if (_errorMessage != null) {
        setState(() => _errorMessage = null);
      }
      
      // Auto-format phone number
      String text = _phoneController.text;
      
      // Always ensure it starts with +254
      if (!text.startsWith('+254')) {
        // If user deleted the prefix, restore it
        if (text.isEmpty || text == '+') {
          _phoneController.value = const TextEditingValue(
            text: '+254',
            selection: TextSelection.collapsed(offset: 4),
          );
          return;
        }
        
        // If they pasted or typed without prefix, add it
        // Remove any leading zeros or +254 variations first
        text = text.replaceFirst(RegExp(r'^[\+]?254'), '').replaceFirst(RegExp(r'^0+'), '');
        text = '+254$text';
      }
      
      // Strip leading zero after +254
      if (text.startsWith('+2540')) {
        text = '+254${text.substring(5)}';
      }
      
      // Update if changed
      if (text != _phoneController.text) {
        final cursorPos = text.length;
        _phoneController.value = TextEditingValue(
          text: text,
          selection: TextSelection.collapsed(offset: cursorPos),
        );
      }
    });
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      setState(() => _errorMessage = 'Please enter your phone number');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Check if this phone belongs to a delivery agent
      final agentData = await SupabaseService.verifyPhone(phone);
      
      if (agentData == null) {
        if (mounted) {
          setState(() {
            _errorMessage = 'Access Denied.\nNumber not found or not authorized.';
          });
        }
        return;
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('agent_phone', phone);
      await prefs.setString('agent_name', agentData['name'] ?? '');
      await prefs.setString('agent_user_id', agentData['id']?.toString() ?? '');
      
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/dashboard');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = 'Error: ${e.toString()}');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 48.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 48),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF6600).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.local_shipping_outlined, size: 64, color: Color(0xFFFF6600)),
                ),
                const SizedBox(height: 32),
                Text(
                  'Welcome Back',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 32, 
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Logistics Hub Access',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 16, 
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 48),
                
                // Error Display Box (Optional visual emphasis)
                if (_errorMessage != null && !_errorMessage!.contains('Please enter'))
                  Container(
                    margin: const EdgeInsets.only(bottom: 24),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: GoogleFonts.inter(color: Colors.red[700], fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),

                TextField(
                  controller: _phoneController,
                  style: GoogleFonts.inter(fontSize: 16),
                  decoration: InputDecoration(
                    labelText: 'Mobile Number',
                    hintText: '+254712345678',
                    labelStyle: GoogleFonts.inter(color: Colors.grey[600]),
                    errorText: _errorMessage?.contains('Please enter') == true ? _errorMessage : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey[300]!),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey[300]!),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFFF6600), width: 2),
                    ),
                    prefixIcon: const Icon(Icons.phone_android_rounded, color: Colors.grey),
                  ),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF6600),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                    shadowColor: const Color(0xFFFF6600).withOpacity(0.4),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(
                          'Continue', 
                          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                ),
                const SizedBox(height: 32),
                Text(
                  'Authorized personnel only.\nCopyright © HDP 2026',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[400]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
