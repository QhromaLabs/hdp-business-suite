
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hdp_k_sales/main.dart'; // for supabase client
import 'package:hdp_k_sales/services/ping_service.dart';

class CustomerDetailsPage extends StatefulWidget {
  final Map<String, dynamic> customer;
  final Function(int)? onTabChange;

  const CustomerDetailsPage({super.key, required this.customer, this.onTabChange});

  @override
  State<CustomerDetailsPage> createState() => _CustomerDetailsPageState();
}

class _CustomerDetailsPageState extends State<CustomerDetailsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;
  List<Map<String, dynamic>> _orders = [];
  List<Map<String, dynamic>> _logs = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    setState(() => _isLoading = true);
    try {
      final user = supabase.auth.currentUser;

      // Fetch Orders (Filtered by created_by = this agent)
      final ordersRes = await supabase
          .from('sales_orders')
          .select('id, order_number, total_amount, status, created_at, notes')
          .eq('customer_id', widget.customer['id'])
          .eq('created_by', user?.id ?? '')
          .order('created_at', ascending: false);
      
      // Fetch Logs (sales_feedback)
      final logsRes = await supabase
          .from('sales_feedback')
          .select('*')
          .eq('customer_id', widget.customer['id'])
          .order('created_at', ascending: false);

      if (mounted) {
        setState(() {
          _orders = List<Map<String, dynamic>>.from(ordersRes);
          _logs = List<Map<String, dynamic>>.from(logsRes);
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching details: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.customer;
    final dist = c['distance'] as double?;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: Text('Customer Profile', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.black)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: Column(
        children: [
          // Header Card
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        shape: BoxShape.circle,
                      ),
                      child: Text(c['name'][0].toUpperCase(), style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.grey[700])),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c['name'], style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text(c['phone'] ?? 'No Phone', style: GoogleFonts.inter(color: Colors.grey[600], fontSize: 14)),
                          const SizedBox(height: 8),
                          if (dist != null)
                             Row(
                               children: [
                                 const Icon(Icons.location_on, size: 16, color: Color(0xFFFF6600)),
                                 const SizedBox(width: 4),
                                 Text('${(dist / 1000).toStringAsFixed(1)} km away', style: GoogleFonts.inter(color: const Color(0xFFFF6600), fontWeight: FontWeight.w600)),
                               ],
                             ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                 // Location Details
                 if (c['address'] != null || c['last_lat'] != null)
                   Container(
                     padding: const EdgeInsets.all(12),
                     decoration: BoxDecoration(
                       color: Colors.blue[50], // Light blue for location context
                       borderRadius: BorderRadius.circular(12),
                       border: Border.all(color: Colors.blue.withOpacity(0.1)),
                     ),
                     child: Row(
                       children: [
                         Icon(Icons.map, color: Colors.blue[700]),
                         const SizedBox(width: 12),
                         Expanded(
                           child: Text(
                             c['address'] ?? 'Pinned Location available', 
                             style: GoogleFonts.inter(color: Colors.blue[900], fontWeight: FontWeight.w500),
                           ),
                         ),
                       ],
                     ),
                   ),
              ],
            ),
          ),
          
          // Tabs
          Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              labelColor: const Color(0xFFFF6600),
              unselectedLabelColor: Colors.grey,
              indicatorColor: const Color(0xFFFF6600),
              labelStyle: GoogleFonts.inter(fontWeight: FontWeight.bold),
              tabs: const [
                Tab(text: "Orders"),
                Tab(text: "Logs (Visits)"),
              ],
            ),
          ),
          
          // Content
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600)))
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOrdersTab(),
                    _buildLogsTab(),
                  ],
                ),
          ),
          
          // Log Visit Button (Small, secondary)
          Padding(
             padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
             child: OutlinedButton.icon(
               onPressed: _showLogVisitModal,
               icon: const Icon(Icons.edit_note, size: 18),
               label: const Text("Log Visit / Note"),
               style: OutlinedButton.styleFrom(
                 foregroundColor: Colors.grey[800],
                 side: BorderSide(color: Colors.grey[300]!),
                 minimumSize: const Size(double.infinity, 45)
               ),
             ),
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.startFloat,
      floatingActionButton: FloatingActionButton(
        onPressed: () {
         widget.onTabChange?.call(1);
        },
        backgroundColor: const Color(0xFFFF6600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
        child: const Icon(Icons.add, color: Colors.white, size: 28),
      ),
    );
  }

  Widget _buildOrdersTab() {
    if (_orders.isEmpty) {
      return _emptyState(
        "No orders found", 
        "Record New Sale",
        () {
           Navigator.pop(context);
           widget.onTabChange?.call(1); // Go to POS
        }
      );
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _orders.length,
      itemBuilder: (context, index) {
        final order = _orders[index];
        final amount = (order['total_amount'] as num).toDouble();
        final date = DateTime.parse(order['created_at']);
        final status = order['status'].toString().toUpperCase();
        
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Order #${order['order_number'] ?? '---'}', 
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold)
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${DateFormat('MMM dd, yyyy').format(date)} • $status',
                    style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
              Text(
                NumberFormat.currency(symbol: 'KES ').format(amount),
                style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLogsTab() {
    if (_logs.isEmpty) {
      return _emptyState(
        "No visit logs found",
        "Log First Visit",
        _showLogVisitModal
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _logs.length,
      itemBuilder: (context, index) {
        final log = _logs[index];
        final date = DateTime.parse(log['created_at']);
        final type = (log['feedback_type'] ?? 'visit').toString().toUpperCase();
        
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(8)),
                    child: Text(type, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue[800])),
                  ),
                  Text(DateFormat('MMM dd, hh:mm a').format(date), style: GoogleFonts.inter(color: Colors.grey, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 12),
              Text(log['content'] ?? '', style: GoogleFonts.inter(fontSize: 14)),
            ],
          ),
        );
      },
    );
  }

  Widget _emptyState(String msg, String btnLabel, VoidCallback onBtnPressed) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.inbox, size: 48, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(msg, style: GoogleFonts.inter(color: Colors.grey)),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: onBtnPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFFFF6600),
              side: const BorderSide(color: Color(0xFFFF6600)),
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: Text(btnLabel),
          )
        ],
      ),
    );
  }

  void _showLogVisitModal() {
    // Basic implementation for quick logging
     final feedbackCtrl = TextEditingController();
    String type = 'visit';
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 24),
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Log Visit', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: type,
                decoration: const InputDecoration(labelText: 'Interaction Type', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'visit', child: Text('Site Visit')),
                  DropdownMenuItem(value: 'call', child: Text('Phone Call')),
                  DropdownMenuItem(value: 'payment_followup', child: Text('Payment Follow-up')),
                ],
                onChanged: (val) => setModalState(() => type = val!),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: feedbackCtrl,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: isSubmitting ? null : () async {
                  if (feedbackCtrl.text.isEmpty) return;
                  setModalState(() => isSubmitting = true);
                  try {
                    final user = supabase.auth.currentUser;
                    final res = await supabase.from('sales_feedback').insert({
                      'sales_rep_id': user?.id,
                      'customer_id': widget.customer['id'],
                      'feedback_type': type,
                      'content': feedbackCtrl.text,
                      'status': 'open'
                    }).select().single();
                    
                    // Verify Location
                    PingService.verifyAndLog(
                      recordType: 'log',
                      recordId: res['id'],
                      userId: user?.id,
                    );
                    if (mounted) {
                      Navigator.pop(ctx);
                      _fetchDetails(); // Refresh logs
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Log saved successfully')));
                    }
                  } catch (e) {
                     if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error saving log: $e')));
                  } finally {
                    if (mounted) setModalState(() => isSubmitting = false);
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFF6600), foregroundColor: Colors.white, padding: const EdgeInsets.all(16)),
                child: isSubmitting ? const CircularProgressIndicator(color: Colors.white) : const Text('SAVE LOG'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
