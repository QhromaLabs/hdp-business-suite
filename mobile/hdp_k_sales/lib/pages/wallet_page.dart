
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'package:hdp_k_sales/main.dart';

class WalletPage extends StatefulWidget {
  const WalletPage({super.key});

  @override
  State<WalletPage> createState() => _WalletPageState();
}

class _WalletPageState extends State<WalletPage> {
  final User? user = supabase.auth.currentUser;
  bool _isLoading = true;
  double _totalEarnings = 0.0;
  double _pendingWithdrawals = 0.0;
  double _paidWithdrawals = 0.0;
  List<Map<String, dynamic>> _transactions = [];

  // Withdrawal Form
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _fetchWalletData();
    _fetchEmployeeDetails();
  }

  Future<void> _fetchEmployeeDetails() async {
    final response = await supabase
        .from('employees')
        .select('phone')
        .eq('user_id', user?.id ?? '')
        .maybeSingle();
    
    if (response != null && response['phone'] != null) {
      _phoneController.text = response['phone'];
    }
  }

  Future<void> _fetchWalletData() async {
    setState(() => _isLoading = true);
    try {
      // Get Employee ID from User ID
      final employeeRes = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user?.id ?? '')
          .single();
      
      final employeeId = employeeRes['id'];

      // 1. Fetch Commissions (Earnings)
      final commissionsRes = await supabase
          .from('sales_commissions')
          .select('amount, created_at, order_id, status')
          .eq('sales_agent_id', employeeId)
          .order('created_at', ascending: false);
      
      // 2. Fetch Withdrawals (Debits)
      final withdrawalsRes = await supabase
          .from('withdrawal_requests')
          .select('amount, requested_at, status')
          .eq('sales_agent_id', employeeId)
          .order('requested_at', ascending: false);

      double totalEarned = 0;
      double pendingW = 0;
      double paidW = 0;

      List<Map<String, dynamic>> mixedTransactions = [];

      for (var c in commissionsRes) {
        double amt = (c['amount'] as num).toDouble();
        totalEarned += amt;
        mixedTransactions.add({
          'type': 'commission',
          'amount': amt,
          'date': DateTime.parse(c['created_at']),
          'status': 'earned', // Commissions are technically 'earned' immediately in this logic
          'reference': 'Order #${c['order_id'].toString().substring(0, 8)}...' 
        });
      }

      for (var w in withdrawalsRes) {
        double amt = (w['amount'] as num).toDouble();
        String status = w['status'];
        if (status == 'paid') paidW += amt;
        if (status == 'pending' || status == 'approved') pendingW += amt;

        mixedTransactions.add({
          'type': 'withdrawal',
          'amount': -amt, // Negative for display
          'date': DateTime.parse(w['requested_at']),
          'status': status,
          'reference': 'Withdrawal to M-Pesa'
        });
      }

      // Sort by date desc
      mixedTransactions.sort((a, b) => b['date'].compareTo(a['date']));

      setState(() {
        _totalEarnings = totalEarned;
        _pendingWithdrawals = pendingW;
        _paidWithdrawals = paidW;
        _transactions = mixedTransactions;
      });

    } catch (e) {
      debugPrint('Error fetching wallet: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading wallet details: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _requestWithdrawal() async {
    final amount = double.tryParse(_amountController.text);
    final phone = _phoneController.text;

    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invalid amount')));
      return;
    }
    
    double available = _totalEarnings - _paidWithdrawals - _pendingWithdrawals;
    if (amount > available) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Insufficient funds')));
      return;
    }

    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Phone number required')));
      return;
    }

    setState(() => _isSubmitting = true);
    try {
       final employeeRes = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user?.id ?? '')
          .single();
      
      await supabase.from('withdrawal_requests').insert({
        'sales_agent_id': employeeRes['id'],
        'amount': amount,
        'phone_number': phone,
        'status': 'pending'
      });

      if (mounted) {
        Navigator.pop(context); // Close dialog
        _amountController.clear();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Withdrawal request sent!')));
        _fetchWalletData(); // Refresh info
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Request failed. Try again.')));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showWithdrawModal() {
    double available = _totalEarnings - _paidWithdrawals - _pendingWithdrawals;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Request Withdrawal", style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text("Available: KES ${NumberFormat('#,##0').format(available)}", 
              style: GoogleFonts.inter(fontSize: 14, color: Colors.grey)),
            const SizedBox(height: 20),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: "Amount (KES)",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: "M-Pesa Phone Number",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _requestWithdrawal,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF6600),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSubmitting 
                  ? const CircularProgressIndicator(color: Colors.white) 
                  : const Text("SUBMIT REQUEST", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);
    double availableBalance = _totalEarnings - _paidWithdrawals - _pendingWithdrawals;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text("My Wallet", style: GoogleFonts.inter(color: Colors.black, fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.black),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchWalletData,
          )
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600)))
        : RefreshIndicator(
            onRefresh: _fetchWalletData,
            color: const Color(0xFFFF6600),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Wallet Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2C3E50), Color(0xFF000000)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 15,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Available Balance", 
                          style: GoogleFonts.inter(color: Colors.white.withOpacity(0.7), fontSize: 14)),
                        const SizedBox(height: 8),
                        Text(currencyFormat.format(availableBalance), 
                          style: GoogleFonts.inter(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text("Total Earned", style: GoogleFonts.inter(color: Colors.white54, fontSize: 12)),
                                  Text(currencyFormat.format(_totalEarnings), 
                                    style: GoogleFonts.inter(color: Colors.greenAccent, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text("Pending Out", style: GoogleFonts.inter(color: Colors.white54, fontSize: 12)),
                                  Text(currencyFormat.format(_pendingWithdrawals), 
                                    style: GoogleFonts.inter(color: Colors.orangeAccent, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _showWithdrawModal,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFFF6600),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: const Text("REQUEST WITHDRAWAL"),
                          ),
                        )
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  Text("Transaction History", style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  
                  if (_transactions.isEmpty) 
                     Container(
                       width: double.infinity,
                       padding: const EdgeInsets.all(32),
                       decoration: BoxDecoration(
                         color: Colors.white,
                         borderRadius: BorderRadius.circular(16),
                       ),
                       child: Column(
                         children: [
                           Icon(Icons.history, size: 48, color: Colors.grey[300]),
                           const SizedBox(height: 12),
                           Text("No transactions yet", style: GoogleFonts.inter(color: Colors.grey)),
                         ],
                       ),
                     )
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _transactions.length,
                      itemBuilder: (context, index) {
                        final txn = _transactions[index];
                        final isCredit = txn['type'] == 'commission';
                        final double amount = (txn['amount'] as num).toDouble();
                        
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.withOpacity(0.1)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: isCredit ? Colors.green.withOpacity(0.1) : Colors.orange.withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                                  color: isCredit ? Colors.green : Colors.orange,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(txn['reference'], style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                                    Text(
                                      DateFormat('MMM dd, yyyy • hh:mm a').format(txn['date']),
                                      style: GoogleFonts.inter(color: Colors.grey, fontSize: 12),
                                    ),
                                    if (!isCredit)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 4.0),
                                        child: Text(
                                          txn['status'].toString().toUpperCase(), 
                                          style: GoogleFonts.inter(
                                            color: txn['status'] == 'paid' ? Colors.blue : 
                                                   txn['status'] == 'rejected' ? Colors.red : Colors.orange,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w900
                                          ),
                                        ),
                                      )
                                  ],
                                ),
                              ),
                              Text(
                                currencyFormat.format(amount),
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.bold,
                                  color: isCredit ? Colors.green : Colors.black,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                   const SizedBox(height: 40),
                ],
              ),
            ),
          ),
    );
  }
}
