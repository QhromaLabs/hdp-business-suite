import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:hdp_deliveries/services/supabase_service.dart';
import 'package:hdp_deliveries/pages/order_map_page.dart';

class OrderDetailsModal extends StatefulWidget {
  final Map<String, dynamic> order;
  final String agentUserId;
  final Function(Map<String, dynamic>)? onStatusUpdated;

  const OrderDetailsModal({
    super.key,
    required this.order, 
    required this.agentUserId,
    this.onStatusUpdated
  });

  @override
  State<OrderDetailsModal> createState() => _OrderDetailsModalState();
}

class _OrderDetailsModalState extends State<OrderDetailsModal> {
  late Map<String, dynamic> _order;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _order = Map.from(widget.order);
  }

  Future<void> _updateStatus(String action) async {
    setState(() => _isLoading = true);
    try {
      if (action == 'start') {
        await SupabaseService.startDelivery(_order['id'], widget.agentUserId);
        setState(() {
          _order['status'] = 'in_transit';
        });
        widget.onStatusUpdated?.call(_order);
      } else if (action == 'done') {
        await SupabaseService.markAsDelivered(_order['id'], widget.agentUserId);
        setState(() {
          _order['status'] = 'delivered';
        });
        widget.onStatusUpdated?.call(_order);
        if (mounted) Navigator.pop(context); // Close only on done
      } else if (action == 'accept') {
        await SupabaseService.acceptOrder(_order['id'], widget.agentUserId);
        setState(() {
          _order['status'] = 'dispatched';
        });
        widget.onStatusUpdated?.call(_order);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final address = _order['address_name'] ?? _order['delivery_address'] ?? 'No address provided';
    final lat = _order['latitude'] as num?;
    final lng = _order['longitude'] as num?;
    final status = _order['status'] as String;
    final customerName = _order['customer_name'] ?? 'Guest Customer';
    final businessName = _order['business_name'];
    final items = _order['order_items'] as List<dynamic>? ?? [];

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 24),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            
            Expanded(
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.symmetric(horizontal: 24),
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Order #${_order['order_number']}",
                              style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, height: 1.2),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                             Container(
                               padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                               decoration: BoxDecoration(
                                 color: status == 'in_transit' ? Colors.blue[50] : 
                                        status == 'dispatched' ? Colors.green[50] : Colors.grey[50],
                                 borderRadius: BorderRadius.circular(8),
                               ),
                               child: Text(
                                 status == 'in_transit' ? "In Transit" : 
                                 status == 'dispatched' ? "Dispatched" : 
                                 status.toUpperCase(),
                                 style: GoogleFonts.inter(
                                   fontSize: 12, 
                                   color: status == 'in_transit' ? Colors.blue : 
                                          status == 'dispatched' ? Colors.green : Colors.grey, 
                                   fontWeight: FontWeight.w600
                                 ),
                               ),
                             ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close, color: Colors.grey),
                      )
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Product Details Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Products", style: GoogleFonts.inter(fontSize: 14, color: Colors.grey[600], fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        if (items.isEmpty)
                          Text("No items info", style: GoogleFonts.inter(fontStyle: FontStyle.italic, color: Colors.grey))
                        else
                          ...items.map((item) => Padding(
                            padding: const EdgeInsets.only(bottom: 8.0),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    border: Border.all(color: Colors.grey[300]!),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    "${item['quantity']}x",
                                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    "${item['name']} ${item['variant'] != null ? '(${item['variant']})' : ''}",
                                    style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w500),
                                  ),
                                ),
                              ],
                            ),
                          )).toList(),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Customer Details Card
                  Column(
                    children: [
                       _buildDetailRow(Icons.person_outline, "Customer", 
                         businessName != null ? "$customerName\n$businessName" : customerName
                       ),
                       _buildDetailRow(Icons.location_on_outlined, "Delivery Location", address),
                       if (lat != null && lng != null)
                         Padding(
                          padding: const EdgeInsets.only(left: 44, bottom: 20),
                          child: Row(
                            children: [
                              Text(
                                "${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}",
                                style: GoogleFonts.inter(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                         ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Actions or Status
                  if (status == 'delivered') ...[
                     Center(
                      child: Column(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green, size: 64),
                          const SizedBox(height: 8),
                          Text("Delivery Completed", style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green)),
                          const SizedBox(height: 24),
                        ],
                      ),
                    )
                  ] else if (status == 'in_transit') ...[
                    // Layout for In Transit: Big Map Button
                    if (lat != null && lng != null)
                      SizedBox(
                        width: double.infinity,
                        height: 60,
                        child: ElevatedButton.icon(
                          onPressed: () {
                             Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => OrderMapPage(
                                  destLat: lat.toDouble(),
                                  destLng: lng.toDouble(),
                                  orderId: _order['id'],
                                  customerName: customerName,
                                  addressName: address,
                                ),
                              ),
                            );
                          },
                          icon: const Icon(Icons.navigation, size: 28),
                          label: const Text("NAVIGATE TO STORE", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                            elevation: 4,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ),
                      
                    const SizedBox(height: 16),
                    
                    SizedBox(
                      width: double.infinity,
                      child: TextButton(
                        onPressed: _isLoading ? null : () => _updateStatus('done'),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          foregroundColor: Colors.green,
                        ),
                        child: _isLoading 
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text("Mark as Delivered", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ] else ...[
                     // Dispatched Layout
                     if (lat != null && lng != null)
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => OrderMapPage(
                                destLat: lat.toDouble(),
                                destLng: lng.toDouble(),
                                orderId: _order['id'],
                                customerName: customerName,
                                addressName: address,
                                ),
                              ),
                            );
                          },
                        icon: const Icon(Icons.map_outlined),
                        label: const Text("View Map & Navigate"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: Colors.black,
                          elevation: 0,
                          side: const BorderSide(color: Colors.grey),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      
                    const SizedBox(height: 16),
                    
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : () => _updateStatus('start'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF6600),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 2,
                        ),
                        child: _isLoading 
                         ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                         : const Text("START DELIVERY", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    ),
                  ],

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.grey[400], size: 24),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.inter(color: Colors.grey[600], fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(value, style: GoogleFonts.inter(color: Colors.black87, fontSize: 16, height: 1.3)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
