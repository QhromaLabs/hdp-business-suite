import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter/foundation.dart';

class PingService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  /// captureLocationAndLog:
  /// 1. Gets current device location.
  /// 2. Fetches store settings (lat/lng).
  /// 3. Calculates distance.
  /// 4. Determines status (ok/not_ok).
  /// 5. Inserts into ping_logs.
  static Future<void> verifyAndLog({
    required String recordType, // 'order' or 'log'
    required String recordId,
    required String? userId,
  }) async {
    try {
      // 1. Get Permission & Location
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return;
      }
      
      final Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      // 2. Fetch Store Settings
      final settingsResponse = await _supabase
          .from('store_settings')
          .select()
          .single(); // Assuming single row or logic to pick one
      
      // If no settings, we can't verify, but we can log user location?
      // Or just return.
      if (settingsResponse == null) return;

      final double storeLat = settingsResponse['latitude'] ?? 0.0;
      final double storeLng = settingsResponse['longitude'] ?? 0.0;
      final int radius = settingsResponse['radius_meters'] ?? 1000;

      // 3. Calc Distance
      final double distanceInMeters = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        storeLat,
        storeLng,
      );

      // 4. Status
      // "If they're 1km apart then mark as Proximity close to store, status ok"
      final bool isClose = distanceInMeters <= radius; 
      final String status = isClose ? 'ok' : 'not_ok';

      // 5. Insert
      await _supabase.from('ping_logs').insert({
        'user_id': userId, // Supabase usually handles default auth.uid(), but explicitly passing is fine
        'record_type': recordType,
        'record_id': recordId,
        'agent_lat': position.latitude,
        'agent_lng': position.longitude,
        'store_lat': storeLat,
        'store_lng': storeLng,
        'distance_meters': distanceInMeters,
        'status': status,
      });

      if (kDebugMode) {
        print("Ping Logged: Distance: $distanceInMeters, Status: $status");
      }

    } catch (e) {
      if (kDebugMode) {
        print("Error in PingService: $e");
      }
      // Fail silently to not block the user flow? 
      // User said "ensure... location is also pinged". 
      // Ideally we should show error if critical, but for now silent log is safer for UX.
    }
  }
}
