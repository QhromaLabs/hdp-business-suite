import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hdp_k_sales/main.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:hdp_k_sales/pages/customer_details_page.dart';

class CRMPage extends StatefulWidget {
  final Function(int)? onTabChange;
  const CRMPage({super.key, this.onTabChange});

  @override
  State<CRMPage> createState() => _CRMPageState();
}

class _CRMPageState extends State<CRMPage> {
  // Data
  List<Map<String, dynamic>> customers = [];
  List<Map<String, dynamic>> filteredCustomers = [];
  Position? _currentPosition;

  // State
  bool _isLoading = true;
  String _searchQuery = '';
  String _filter = 'all'; // all, nearby, credit

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      // 1. Get Current Location
      try {
        _currentPosition = await Geolocator.getCurrentPosition();
      } catch (e) {
        print("Could not get location: $e");
      }

      // 2. Fetch Customers with their last order location from sales_orders
      // We'll use a RPC or a complex query. 
      // For simplicity, let's fetch customers and then fetch their last order locations
      final custRes = await supabase
          .from('customers')
          .select('id, name, phone, customer_type, credit_balance, credit_limit')
          .eq('is_active', true)
          .order('name');

      // Fetch last known locations from sales_orders
      final ordersRes = await supabase
          .from('sales_orders')
          .select('customer_id, latitude, longitude, created_at')
          .not('latitude', 'is', null)
          .order('created_at', ascending: false);

      // Map last location to customer
      final Map<String, Map<String, double>> lastLocations = {};
      for (var o in ordersRes) {
        final cid = o['customer_id'];
        if (cid != null && !lastLocations.containsKey(cid)) {
          lastLocations[cid] = {
            'lat': (o['latitude'] as num).toDouble(),
            'lng': (o['longitude'] as num).toDouble(),
          };
        }
      }

      if (mounted) {
        setState(() {
          customers = List<Map<String, dynamic>>.from(custRes).map((c) {
            final loc = lastLocations[c['id']];
            double? distance;
            if (loc != null && _currentPosition != null) {
              distance = Geolocator.distanceBetween(
                _currentPosition!.latitude,
                _currentPosition!.longitude,
                loc['lat']!,
                loc['lng']!,
              );
            }
            return {
              ...c,
              'last_lat': loc?['lat'],
              'last_lng': loc?['lng'],
              'distance': distance,
            };
          }).toList();
          
          _applyFilters();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _applyFilters() {
    setState(() {
      filteredCustomers = customers.where((c) {
        final matchesSearch = c['name'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
                             (c['phone']?.toString().toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);
        
        if (!matchesSearch) return false;

        if (_filter == 'nearby') return c['distance'] != null && c['distance'] < 5000; // Within 5km
        if (_filter == 'credit') return (c['credit_balance'] ?? 0) > 0;
        
        return true;
      }).toList();

      if (_filter == 'nearby') {
        filteredCustomers.sort((a, b) => (a['distance'] as double? ?? 999999).compareTo(b['distance'] as double? ?? 999999));
      } else {
        filteredCustomers.sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
      }
    });
  }

  void _showFeedbackModal(Map<String, dynamic> customer) {
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
              Text('Log Visit: ${customer['name']}', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
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
                decoration: const InputDecoration(labelText: 'Feedback / Notes', border: OutlineInputBorder(), hintText: 'What happened during the visit?'),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: isSubmitting ? null : () async {
                  if (feedbackCtrl.text.isEmpty) return;
                  setModalState(() => isSubmitting = true);
                  try {
                    final user = supabase.auth.currentUser;
                    await supabase.from('sales_feedback').insert({
                      'sales_rep_id': user?.id,
                      'customer_id': customer['id'],
                      'feedback_type': type,
                      'content': feedbackCtrl.text,
                      'status': 'open'
                    });
                    if (mounted) Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Feedback logged successfully')));
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                  } finally {
                    setModalState(() => isSubmitting = false);
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFF6600), foregroundColor: Colors.white, padding: const EdgeInsets.all(16)),
                child: isSubmitting ? const CircularProgressIndicator(color: Colors.white) : const Text('SUBMIT FEEDBACK'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: Text('Field CRM', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchData),
        ],
      ),
      body: Column(
        children: [
          // Filter Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                TextField(
                  onChanged: (val) {
                    _searchQuery = val;
                    _applyFilters();
                  },
                  decoration: InputDecoration(
                    hintText: 'Search customers...',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: Colors.grey[100],
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _filterChip('All', 'all'),
                      const SizedBox(width: 8),
                      _filterChip('Nearby (<5km)', 'nearby'),
                      const SizedBox(width: 8),
                      _filterChip('With Balance', 'credit'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Customer List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600)))
                : filteredCustomers.isEmpty
                    ? Center(child: Text('No customers found', style: GoogleFonts.inter(color: Colors.grey)))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredCustomers.length,
                        itemBuilder: (context, index) {
                          final c = filteredCustomers[index];
                          final balance = (c['credit_balance'] as num?)?.toDouble() ?? 0.0;
                          final dist = c['distance'] as double?;

                          return Card(
                            color: Colors.white,
                            elevation: 0,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: BorderSide(color: Colors.grey[200]!),
                            ),
                            child: InkWell(
                              onTap: () {
                                Navigator.push(
                                  context, 
                                  MaterialPageRoute(builder: (_) => CustomerDetailsPage(
                                    customer: c,
                                    onTabChange: widget.onTabChange,
                                  ))
                                );
                              },
                              borderRadius: BorderRadius.circular(16),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(c['name'], style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
                                        ),
                                        if (dist != null)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(color: Colors.blue[50], borderRadius: BorderRadius.circular(8)),
                                            child: Text('${(dist / 1000).toStringAsFixed(1)} km', style: GoogleFonts.inter(fontSize: 12, color: Colors.blue[700], fontWeight: FontWeight.w600)),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(c['phone'] ?? 'No phone', style: GoogleFonts.inter(color: Colors.grey, fontSize: 13)),
                                    const SizedBox(height: 12),
                                    const SizedBox(height: 12),
                                    Row(
                                      children: [
                                        // Removed Balance Display as per request
                                        // Added prominent location indicator if available
                                        if (c['address'] != null || dist != null)
                                          Expanded(
                                            child: Row(
                                              children: [
                                                Icon(Icons.location_on, size: 16, color: Colors.grey[600]),
                                                const SizedBox(width: 4),
                                                Expanded(
                                                  child: Text(
                                                    c['address'] ?? (dist != null ? '${(dist / 1000).toStringAsFixed(1)} km away' : 'Location available'),
                                                      maxLines: 1, overflow: TextOverflow.ellipsis,
                                                      style: GoogleFonts.inter(fontSize: 13, color: Colors.grey[700]),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        
                                        if (c['address'] == null && dist == null)
                                           Text("No location info", style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[400])),

                                        if (c['address'] != null || dist != null) // Only spacer if we have content on left
                                          const SizedBox(width: 8),

                                        // Keep "Log Visit" as a quick action or remove if it is in details? 
                                        // User said "opens the customer info... below is log history".
                                        // The action can be inside.
                                        // Let's keep a chevron to indicate navigation.
                                        const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.startFloat,
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          widget.onTabChange?.call(1); // POS Tab
        },
        backgroundColor: const Color(0xFFFF6600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
        child: const Icon(Icons.add, color: Colors.white, size: 28),
      ),
    );
  }

  Widget _filterChip(String label, String value) {
    final isSelected = _filter == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (sel) {
        if (sel) {
          setState(() => _filter = value);
          _applyFilters();
        }
      },
      selectedColor: const Color(0xFFFF6600).withOpacity(0.1),
      labelStyle: GoogleFonts.inter(color: isSelected ? const Color(0xFFFF6600) : Colors.black, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal),
      side: BorderSide(color: isSelected ? const Color(0xFFFF6600) : Colors.grey[300]!),
      backgroundColor: Colors.white,
    );
  }
}
