import 'package:flutter/material.dart';
import 'package:hdp_deliveries/services/supabase_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hdp_deliveries/widgets/order_details_modal.dart';
import 'dart:async';
import 'package:geolocator/geolocator.dart' as geolocator;

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  List<Map<String, dynamic>> _orders = [];
  bool _isLoading = true;
  String? _agentPhone;
  String? _agentName;
  String? _agentUserId;
  Timer? _locationTimer;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      String? phone = prefs.getString('agent_phone');
      String? name = prefs.getString('agent_name');
      String? userId = prefs.getString('agent_user_id');

      // Auto-fix for sessions with missing/empty userId
      if (phone != null && (userId == null || userId.isEmpty)) {
        try {
          final data = await SupabaseService.verifyPhone(phone);
          if (data != null && data['id'] != null) {
            userId = data['id'].toString();
            await prefs.setString('agent_user_id', userId);
            if (data['name'] != null) {
              name = data['name'];
              await prefs.setString('agent_name', name!);
            }
          }
        } catch (e) {
          debugPrint('Auto-fix failed: $e');
        }
      }

      setState(() {
        _agentPhone = phone;
        _agentName = name;
        _agentUserId = userId;
      });

      if (phone != null) {
        final allOrders = await SupabaseService.getOrdersByPhone(phone);
        // Filter for active orders only (dispatched or in_transit)
        final activeOrders = allOrders.where((o) => 
          o['status'] == 'dispatched' || o['status'] == 'in_transit'
        ).toList();
        setState(() => _orders = activeOrders);
        _checkTracking(activeOrders);
      } else {
        if (mounted) Navigator.of(context).pushReplacementNamed('/login');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error fetching data: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _checkTracking(List<Map<String, dynamic>> orders) {
    final hasInTransit = orders.any((o) => o['status'] == 'in_transit');
    if (hasInTransit) {
      _startTracking();
    } else {
      _stopTracking();
    }
  }

  void _startTracking() {
    if (_locationTimer != null) return;
    _locationTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      _updateCurrentLocation();
    });
    // Immediate update
    _updateCurrentLocation();
  }

  void _stopTracking() {
    _locationTimer?.cancel();
    _locationTimer = null;
  }

  Future<void> _updateCurrentLocation() async {
    if (_agentUserId == null || _agentUserId!.isEmpty) return;

    try {
      bool serviceEnabled;
      geolocator.LocationPermission permission;

      serviceEnabled = await geolocator.Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;

      permission = await geolocator.Geolocator.checkPermission();
      if (permission == geolocator.LocationPermission.denied) {
        permission = await geolocator.Geolocator.requestPermission();
        if (permission == geolocator.LocationPermission.denied) return;
      }

      if (permission == geolocator.LocationPermission.deniedForever) return;

      final position = await geolocator.Geolocator.getCurrentPosition(
        desiredAccuracy: geolocator.LocationAccuracy.high,
      );

      await SupabaseService.updateLocation(
        _agentUserId!,
        position.latitude,
        position.longitude,
      );
    } catch (e) {
      print('Location update failed: $e');
    }
  }

  void _handleOrderClick(Map<String, dynamic> order) {
    if (_agentUserId == null || _agentUserId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Agent ID missing. Please refresh or log in again.'))
      );
      return;
    }
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => OrderDetailsModal(
        order: order,
        agentUserId: _agentUserId!,
        onStatusUpdated: (updatedOrder) {
          // Update the list locally to reflect changes when modal closes or updates
          setState(() {
            final index = _orders.indexWhere((o) => o['id'] == updatedOrder['id']);
            if (index != -1) {
              if (updatedOrder['status'] != 'dispatched' && updatedOrder['status'] != 'in_transit') {
                 // Remove if no longer active
                 _orders.removeAt(index);
              } else {
                 _orders[index] = updatedOrder;
              }
              _checkTracking(_orders);
            }
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          "Logistics Engine",
          style: GoogleFonts.inter(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.black),
            onPressed: _fetchData,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.black),
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.remove('agent_phone');
              await prefs.remove('agent_name');
              await prefs.remove('agent_user_id');
              if (mounted) Navigator.of(context).pushReplacementNamed('/login');
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600)))
          : RefreshIndicator(
              onRefresh: _fetchData,
              color: const Color(0xFFFF6600),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 24),
                    _buildStatsCard(),
                    const SizedBox(height: 24),
                    Text(
                      "Available Tasks",
                      style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    _orders.isEmpty
                        ? _buildEmptyState()
                        : _buildOrdersList(currencyFormat),
                    const SizedBox(height: 100), // Spacing for floating bottom nav
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Ready to rollout,",
          style: GoogleFonts.inter(fontSize: 16, color: Colors.grey[600]),
        ),
        Text(
          _agentName ?? "Delivery Agent",
          style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.black),
        ),
      ],
    );
  }

  Widget _buildStatsCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6600), Color(0xFFFF9933)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFF6600).withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("On Duty",
                  style: GoogleFonts.inter(color: Colors.white.withOpacity(0.8), fontSize: 14)),
              const Icon(Icons.local_shipping, color: Colors.white, size: 20),
            ],
          ),
          const SizedBox(height: 8),
          Text("${_orders.length}",
              style: GoogleFonts.inter(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
          Text("Active Deliveries",
              style: GoogleFonts.inter(color: Colors.white.withOpacity(0.7), fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey[300]),
          const SizedBox(height: 12),
          Text("No deliveries assigned", style: GoogleFonts.inter(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildOrdersList(NumberFormat formatter) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _orders.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final order = _orders[index];
        final orderNum = order['order_number'] ?? 'N/A';
        final customer = order['customer_name'] ?? 'Unknown Customer';
        final status = order['status'] as String;

        return GestureDetector(
          onTap: () => _handleOrderClick(order),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[100]!),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
              ]
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: status == 'in_transit' ? Colors.blue.withOpacity(0.1) : const Color(0xFFFF6600).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.inventory_2, 
                    color: status == 'in_transit' ? Colors.blue : const Color(0xFFFF6600), 
                    size: 20
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Order #$orderNum", style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                      Text(customer, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[600])),
                      const SizedBox(height: 4),
                       Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: status == 'in_transit' ? Colors.blue[50] : Colors.green[50],
                                borderRadius: BorderRadius.circular(4),
                              ),
                               child: Text(
                                status == 'in_transit' ? "In Transit" : 
                                status == 'dispatched' ? "Dispatched" : 
                                status.toUpperCase(),
                                style: GoogleFonts.inter(
                                  fontSize: 10, 
                                  color: status == 'in_transit' ? Colors.blue : 
                                         status == 'dispatched' ? Colors.green : Colors.grey, 
                                  fontWeight: FontWeight.w600
                                ),
                              ),
                            ),
                    ],
                  ),
                ),
                 Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: status == 'in_transit' ? Colors.blue : 
                           status == 'dispatched' ? const Color(0xFFFF6600) : Colors.black,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                     status == 'in_transit' ? "CONTINUE" : 
                     status == 'dispatched' ? "START" : "VIEW",
                     style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                 )
              ],
            ),
          ),
        );
      },
    );
  }
}
