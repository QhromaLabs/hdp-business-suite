import 'package:flutter/material.dart';
import 'package:hdp_k_sales/main.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class AnalyticsPage extends StatefulWidget {
  const AnalyticsPage({super.key});

  @override
  State<AnalyticsPage> createState() => _AnalyticsPageState();
}

class _AnalyticsPageState extends State<AnalyticsPage> {
  bool _isLoading = true;
  Map<String, dynamic> _stats = {};

  @override
  void initState() {
    super.initState();
    _fetchAnalytics();
  }

  Future<void> _fetchAnalytics() async {
    setState(() => _isLoading = true);
    try {
      final user = supabase.auth.currentUser;
      final now = DateTime.now();
      
      // Get today's sales
      final todayStart = DateTime(now.year, now.month, now.day).toIso8601String();
      final todayRes = await supabase
          .from('sales_orders')
          .select('total_amount')
          .eq('created_by', user?.id ?? '')
          .gte('created_at', todayStart);
      
      final todayTotal = todayRes.fold<double>(0, (sum, order) => sum + (order['total_amount'] as num).toDouble());

      // Get this week's sales
      final weekStart = now.subtract(Duration(days: now.weekday - 1));
      final weekStartStr = DateTime(weekStart.year, weekStart.month, weekStart.day).toIso8601String();
      final weekRes = await supabase
          .from('sales_orders')
          .select('total_amount')
          .eq('created_by', user?.id ?? '')
          .gte('created_at', weekStartStr);
      
      final weekTotal = weekRes.fold<double>(0, (sum, order) => sum + (order['total_amount'] as num).toDouble());

      // Get this month's sales
      final monthStart = DateTime(now.year, now.month, 1).toIso8601String();
      final monthRes = await supabase
          .from('sales_orders')
          .select('total_amount, customers(name)')
          .eq('created_by', user?.id ?? '')
          .gte('created_at', monthStart);
      
      final monthTotal = monthRes.fold<double>(0, (sum, order) => sum + (order['total_amount'] as num).toDouble());

      // Get commission earned
      final commissionRes = await supabase
          .from('sales_commissions')
          .select('amount')
          .eq('sales_agent_id', user?.id ?? '')
          .gte('created_at', monthStart);
      
      final commissionTotal = commissionRes.fold<double>(0, (sum, comm) => sum + (comm['amount'] as num).toDouble());

      if (mounted) {
        setState(() {
          _stats = {
            'today': todayTotal,
            'week': weekTotal,
            'month': monthTotal,
            'commission': commissionTotal,
            'orderCount': monthRes.length,
          };
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading analytics: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600)))
            : RefreshIndicator(
                onRefresh: _fetchAnalytics,
                color: const Color(0xFFFF6600),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Performance Analytics',
                        style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Track your sales performance',
                        style: GoogleFonts.inter(fontSize: 14, color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 24),

                      // Today's Sales
                      _buildStatCard(
                        'Today\'s Sales',
                        currencyFormat.format(_stats['today'] ?? 0),
                        Icons.today,
                        Colors.blue,
                      ),
                      const SizedBox(height: 12),

                      // This Week
                      _buildStatCard(
                        'This Week',
                        currencyFormat.format(_stats['week'] ?? 0),
                        Icons.calendar_view_week,
                        Colors.green,
                      ),
                      const SizedBox(height: 12),

                      // This Month
                      _buildStatCard(
                        'This Month',
                        currencyFormat.format(_stats['month'] ?? 0),
                        Icons.calendar_month,
                        const Color(0xFFFF6600),
                      ),
                      const SizedBox(height: 12),

                      // Orders Count
                      _buildStatCard(
                        'Orders This Month',
                        '${_stats['orderCount'] ?? 0} orders',
                        Icons.shopping_cart,
                        Colors.purple,
                      ),
                      const SizedBox(height: 12),

                      // Commission Earned
                      _buildStatCard(
                        'Commission Earned',
                        currencyFormat.format(_stats['commission'] ?? 0),
                        Icons.account_balance_wallet,
                        Colors.teal,
                      ),

                      const SizedBox(height: 100), // Space for bottom nav
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(fontSize: 14, color: Colors.grey[600]),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
