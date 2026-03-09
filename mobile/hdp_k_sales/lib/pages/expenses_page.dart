import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hdp_k_sales/main.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class ExpensesPage extends StatefulWidget {
  const ExpensesPage({super.key});

  @override
  State<ExpensesPage> createState() => _ExpensesPageState();
}

class _ExpensesPageState extends State<ExpensesPage> {
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _categoryController = TextEditingController();
  String _paymentMethod = 'cash';
  bool _isLoading = false;
  bool _isSaving = false;
  List<Map<String, dynamic>> _recentExpenses = [];
  final currencyFormat = NumberFormat.currency(symbol: 'KES ', decimalDigits: 2);

  @override
  void initState() {
    super.initState();
    _fetchExpenses();
  }

  Future<void> _fetchExpenses() async {
    setState(() => _isLoading = true);
    try {
      final user = supabase.auth.currentUser;
      final response = await supabase
          .from('expenses')
          .select()
          .eq('created_by', user?.id ?? '')
          .order('created_at', ascending: false)
          .limit(20);
      
      setState(() {
        _recentExpenses = List<Map<String, dynamic>>.from(response);
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _saveExpense() async {
    if (_amountController.text.isEmpty || _descriptionController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all required fields')));
      return;
    }

    setState(() => _isSaving = true);
    try {
      final user = supabase.auth.currentUser;
      final amount = double.tryParse(_amountController.text) ?? 0.0;
      
      await supabase.from('expenses').insert({
        'category': _categoryController.text.isEmpty ? 'General' : _categoryController.text,
        'description': _descriptionController.text,
        'amount': amount,
        'expense_date': DateTime.now().toIso8601String().split('T')[0],
        'payment_method': _paymentMethod,
        'created_by': user?.id,
      });

      if (mounted) {
        _amountController.clear();
        _descriptionController.clear();
        _categoryController.clear();
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Expense logged successfully')));
        _fetchExpenses();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: Text('Record Expenses', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Input Form
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
              boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Amount (KES)',
                    prefixIcon: const Icon(Icons.payments_outlined),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _categoryController,
                  decoration: InputDecoration(
                    labelText: 'Category (e.g. Fuel, Lunch, Parking)',
                    prefixIcon: const Icon(Icons.category_outlined),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _descriptionController,
                  decoration: InputDecoration(
                    labelText: 'Description / Notes',
                    prefixIcon: const Icon(Icons.description_outlined),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _paymentMethod,
                  decoration: InputDecoration(
                    labelText: 'Payment Method',
                    prefixIcon: const Icon(Icons.account_balance_wallet_outlined),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'cash', child: Text('Cash')),
                    DropdownMenuItem(value: 'mobile_money', child: Text('M-Pesa')),
                    DropdownMenuItem(value: 'bank_transfer', child: Text('Bank Transfer')),
                  ],
                  onChanged: (val) => setState(() => _paymentMethod = val!),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _isSaving ? null : _saveExpense,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF6600),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.all(16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSaving 
                    ? const CircularProgressIndicator(color: Colors.white) 
                    : const Text('SUBMIT EXPENSE', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          // Recent History
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : _recentExpenses.isEmpty
                ? const Center(child: Text('No recent expenses recorded.'))
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text('Recent Log', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
                      ),
                      Expanded(
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          itemCount: _recentExpenses.length,
                          itemBuilder: (context, index) {
                            final e = _recentExpenses[index];
                            return Card(
                              color: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                side: BorderSide(color: Colors.grey[200]!),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                leading: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(color: Colors.red[50], shape: BoxShape.circle),
                                  child: const Icon(Icons.arrow_upward, color: Colors.red, size: 20),
                                ),
                                title: Text(e['description'] ?? 'No description', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                                subtitle: Text('${e['category']} • ${e['expense_date']}', style: GoogleFonts.inter(fontSize: 12)),
                                trailing: Text(currencyFormat.format(e['amount']), style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.red)),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
