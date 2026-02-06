import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:hdp_deliveries/services/supabase_service.dart';
import 'package:hdp_deliveries/widgets/order_details_modal.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HistoryPage extends StatefulWidget {
  const HistoryPage({super.key});

  @override
  State<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends State<HistoryPage> {
  List<Map<String, dynamic>> _historyOrders = [];
  bool _isLoading = true;
  String? _agentUserId;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => _isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final phone = prefs.getString('agent_phone');
      _agentUserId = prefs.getString('agent_user_id');
      
      if (phone != null) {
        final allOrders = await SupabaseService.getOrdersByPhone(phone); 
        setState(() {
          _historyOrders = allOrders.where((o) => o['status'] == 'delivered').toList();
          
          // Sort by completion date desc
          _historyOrders.sort((a, b) {
             final aDate = a['delivery_completed_at'] ?? a['updated_at'] ?? a['created_at'];
             final bDate = b['delivery_completed_at'] ?? b['updated_at'] ?? b['created_at'];
             return (bDate ?? '').compareTo(aDate ?? '');
          });
          // descending
          _historyOrders = _historyOrders.reversed.toList();
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
  
  void _handleOrderClick(Map<String, dynamic> order) {
    if (_agentUserId == null) return;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => OrderDetailsModal(
        order: order,
        agentUserId: _agentUserId!,
        // No status updates expected from history
        onStatusUpdated: null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: Text('History', style: GoogleFonts.inter(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(onPressed: _fetchHistory, icon: const Icon(Icons.refresh, color: Colors.black))
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600)))
          : _historyOrders.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history, size: 48, color: Colors.grey[300]),
                      const SizedBox(height: 12),
                      Text("No completed deliveries yet", style: GoogleFonts.inter(color: Colors.grey)),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: _historyOrders.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final order = _historyOrders[index];
                    final completedAt = order['delivery_completed_at'] ?? order['updated_at'];
                    
                    return GestureDetector(
                      onTap: () => _handleOrderClick(order),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey[200]!),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.green.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.check, color: Colors.green, size: 16),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text("Order #${order['order_number']}", 
                                    style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                                  Text(
                                    completedAt != null 
                                      ? "Delivered: ${DateFormat('MMM d, HH:mm').format(DateTime.parse(completedAt))}"
                                      : "Delivered",
                                    style: GoogleFonts.inter(fontSize: 12, color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
