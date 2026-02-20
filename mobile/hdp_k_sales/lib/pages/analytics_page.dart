import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hdp_k_sales/main.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'dart:math';

class AnalyticsPage extends StatefulWidget {
  final GlobalKey<ScaffoldState>? scaffoldKey;
  const AnalyticsPage({super.key, this.scaffoldKey});

  @override
  State<AnalyticsPage> createState() => _AnalyticsPageState();
}

class _AnalyticsPageState extends State<AnalyticsPage> {
  bool _isLoading = true;
  Map<String, dynamic> _stats = {};
  List<FlSpot> _salesTrend = [];
  List<PieChartSectionData> _categorySections = [];
  double _monthlyTarget = 0;
  double _monthlyActual = 0;
  List<String> _trendDays = [];
  RealtimeChannel? _realtimeChannel;

  @override
  void initState() {
    super.initState();
    _fetchAnalytics();
    _setupRealtimeSubscription();
  }

  @override
  void dispose() {
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  void _setupRealtimeSubscription() {
    final user = supabase.auth.currentUser;
    if (user == null) return;

    _realtimeChannel = supabase
        .channel('public:sales_orders')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'sales_orders',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'created_by',
            value: user.id,
          ),
          callback: (payload) {
            if (mounted) {
              _fetchAnalytics();
            }
          },
        )
        .subscribe();
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
          .select('id, total_amount, customers(name)')
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

      // Fetch Sales Trend (Last 7 days)
      final List<FlSpot> spots = [];
      final List<String> days = [];
      for (int i = 6; i >= 0; i--) {
        final date = now.subtract(Duration(days: i));
        final dayStart = DateTime(date.year, date.month, date.day).toIso8601String();
        final dayEnd = DateTime(date.year, date.month, date.day, 23, 59, 59).toIso8601String();
        
        final dayRes = await supabase
            .from('sales_orders')
            .select('total_amount')
            .eq('created_by', user?.id ?? '')
            .gte('created_at', dayStart)
            .lte('created_at', dayEnd);
        
        final dayTotal = dayRes.fold<double>(0, (sum, order) => sum + (order['total_amount'] as num).toDouble());
        spots.add(FlSpot((6 - i).toDouble(), dayTotal));
        days.add(DateFormat('E').format(date));
      }

      // Fetch Category Distribution (Monthly)
      final orderIds = monthRes.map((o) => o['id']).toList();
      
      Map<String, double> categorySales = {};
      if (orderIds.isNotEmpty) {
        final itemsRes = await supabase
          .from('sales_order_items')
          .select('total_price, product_variants(products(product_categories(name)))')
          .inFilter('order_id', orderIds);
        
        for (var item in itemsRes) {
          final catName = item['product_variants']?['products']?['product_categories']?['name'] ?? 'Other';
          categorySales[catName] = (categorySales[catName] ?? 0) + (item['total_price'] as num).toDouble();
        }
      }

      final colors = [const Color(0xFFFF6600), Colors.blue, Colors.green, Colors.purple, Colors.teal, Colors.amber];
      int colorIdx = 0;
      final sections = categorySales.entries.map((e) {
        final percentage = monthTotal != 0 ? (e.value / monthTotal * 100).toInt() : 0;
        final data = PieChartSectionData(
          color: colors[colorIdx % colors.length],
          value: e.value,
          title: '$percentage%',
          radius: 50,
          titleStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
        );
        colorIdx++;
        return data;
      }).toList();

      // Fetch Target vs Actual
      final targetRes = await supabase
          .from('sales_targets')
          .select('target_amount, achieved_amount')
          .eq('user_id', user?.id ?? '')
          .gte('target_month', monthStart)
          .maybeSingle();
      
      if (mounted) {
        setState(() {
          _stats = {
            'today': todayTotal,
            'week': weekTotal,
            'month': monthTotal,
            'commission': commissionTotal,
            'orderCount': monthRes.length,
          };
          _salesTrend = spots;
          _trendDays = days;
          _categorySections = sections;
          if (targetRes != null) {
            _monthlyTarget = (targetRes['target_amount'] as num).toDouble();
            _monthlyActual = (targetRes['achieved_amount'] as num).toDouble();
          }
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
                      Row(
                        children: [
                          if (widget.scaffoldKey != null)
                            Padding(
                              padding: const EdgeInsets.only(right: 16),
                              child: IconButton(
                                icon: const Icon(Icons.menu, size: 28),
                                onPressed: () => widget.scaffoldKey?.currentState?.openDrawer(),
                              ),
                            ),
                          Text(
                            'Performance Analytics',
                            style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Track your sales performance',
                        style: GoogleFonts.inter(fontSize: 14, color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 24),
                      _buildSummaryGrid(currencyFormat),
                      const SizedBox(height: 24),
                      _buildTrendChart(),
                      const SizedBox(height: 24),
                      _buildCategoryChart(),
                      const SizedBox(height: 24),
                      _buildTargetComparison(currencyFormat),
                      const SizedBox(height: 100), // Space for bottom nav
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildSummaryGrid(NumberFormat currencyFormat) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildStatCardMini('Today', currencyFormat.format(_stats['today'] ?? 0), Icons.today, Colors.blue),
        _buildStatCardMini('Week', currencyFormat.format(_stats['week'] ?? 0), Icons.calendar_view_week, Colors.green),
        _buildStatCardMini('Month', currencyFormat.format(_stats['month'] ?? 0), Icons.calendar_month, const Color(0xFFFF6600)),
        InkWell(
          onTap: () => Navigator.of(context).pushNamed('/wallet').then((_) => _fetchAnalytics()),
          borderRadius: BorderRadius.circular(16),
          child: _buildStatCardMini('Commission', currencyFormat.format(_stats['commission'] ?? 0), Icons.account_balance_wallet, Colors.teal),
        ),
      ],
    );
  }

  Widget _buildStatCardMini(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(title, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[600])),
          Text(value, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  Widget _buildTrendChart() {
    return Container(
      height: 300,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sales Trend (7 Days)', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          Expanded(
            child: LineChart(
              LineChartData(
                gridData: const FlGridData(show: false),
                titlesData: FlTitlesData(
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        int index = value.toInt();
                        if (index >= 0 && index < _trendDays.length) {
                          return Text(_trendDays[index], style: const TextStyle(fontSize: 10));
                        }
                        return const Text('');
                      },
                    ),
                  ),
                  leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: _salesTrend,
                    isCurved: true,
                    color: const Color(0xFFFF6600),
                    barWidth: 4,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      color: const Color(0xFFFF6600).withOpacity(0.1),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChart() {
    if (_categorySections.isEmpty) return const SizedBox();
    return Container(
      height: 350,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sales by Category', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          Expanded(
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 60,
                sections: _categorySections,
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Legend could be added here
        ],
      ),
    );
  }

  Widget _buildTargetComparison(NumberFormat currencyFormat) {
    double progress = _monthlyTarget > 0 ? (_monthlyActual / _monthlyTarget) : 0;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Target vs Actual', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Achieved', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[600])),
                  Text(currencyFormat.format(_monthlyActual), style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('Target', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[600])),
                  Text(currencyFormat.format(_monthlyTarget), style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress.clamp(0, 1),
              minHeight: 12,
              backgroundColor: Colors.grey[200],
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFF6600)),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text('${(progress * 100).toInt()}% of monthly goal', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }

}
