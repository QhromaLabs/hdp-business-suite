import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: 'https://nygxnxrasprjmxetvudk.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3hueHJhc3Byam14ZXR2dWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMDI4NjQsImV4cCI6MjA4MTY3ODg2NH0.ZMZmCFWhfT62rul3HFcWNq2mjrCpa4dantQIVOxR1qM',
    );
  }

  static Future<AuthResponse> signIn(String email, String password) async {
    return await client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  static Future<void> signOut() async {
    await client.auth.signOut();
  }

  static User? get currentUser => client.auth.currentUser;

  static Future<String?> getUserRole(String userId) async {
    try {
      final response = await client
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();
      return response['role'] as String?;
    } catch (e) {
      return null;
    }
  }

  static Future<List<Map<String, dynamic>>> getAvailableOrders() async {
    final response = await client
        .from('sales_orders')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(response);
  }

  static Future<List<Map<String, dynamic>>> getOrdersByPhone(String phone) async {
    final response = await client.rpc(
      'get_orders_by_delivery_phone',
      params: {'_phone': phone},
    );
    return List<Map<String, dynamic>>.from(response);
  }

  static Future<Map<String, dynamic>?> verifyPhone(String phone) async {
    final response = await client.rpc(
      'verify_delivery_agent_phone',
      params: {'_phone': phone},
    ) as List<dynamic>;
    
    if (response.isEmpty) return null;
    return response.first as Map<String, dynamic>;
  }

  static Future<void> updateLocation(String userId, double lat, double lng) async {
    try {
      await client.rpc(
        'update_agent_location',
        params: {
          '_agent_id': userId,
          '_lat': lat,
          '_lng': lng,
        },
      );
    } catch (e) {
      print('Error updating location: $e');
    }
  }

  static Future<void> acceptOrder(String orderId, String userId) async {
    await client.rpc(
      'update_order_status_by_agent',
      params: {
        '_order_id': orderId,
        '_status': 'dispatched',
        '_agent_id': userId,
      },
    );
  }

  static Future<void> startDelivery(String orderId, String userId) async {
    await client.rpc(
      'update_order_status_by_agent',
      params: {
        '_order_id': orderId,
        '_status': 'in_transit',
        '_agent_id': userId,
      },
    );
  }

  static Future<void> markAsDelivered(String orderId, String userId) async {
    await client.rpc(
      'update_order_status_by_agent',
      params: {
        '_order_id': orderId,
        '_status': 'delivered',
        '_agent_id': userId,
      },
    );
  }
}
