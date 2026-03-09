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
  List<Map<String, dynamic>> _recentOrders = [];
  bool _isFetchingDetails = false;
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
      
      // Fetch Recent Orders (Weekly History)
      final ordersRes = await supabase
          .from('sales_orders')
          .select('*, customers(name)')
          .eq('created_by', user?.id ?? '')
          .order('created_at', ascending: false)
          .limit(20);
      
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
          _recentOrders = List<Map<String, dynamic>>.from(ordersRes);
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
                      const SizedBox(height: 32),
                      _buildRecentOrders(currencyFormat),
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

  Widget _buildRecentOrders(NumberFormat currencyFormat) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Weekly History', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
            Text('${_recentOrders.length} orders', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[600])),
          ],
        ),
        const SizedBox(height: 16),
        if (_recentOrders.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
            child: Center(child: Text('No orders recorded this week', style: GoogleFonts.inter(color: Colors.grey))),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _recentOrders.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (ctx, index) {
              final order = _recentOrders[index];
              final date = DateTime.parse(order['created_at']);
              return InkWell(
                onTap: () => _showOrderDetails(order),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: const Color(0xFFFF6600).withOpacity(0.1), shape: BoxShape.circle),
                        child: const Icon(Icons.receipt_long, color: Color(0xFFFF6600), size: 20),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(order['customers']?['name'] ?? 'Walk-in', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                            Text(DateFormat('MMM dd, hh:mm a').format(date), style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(currencyFormat.format(order['total_amount']), style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: order['status'] == 'completed' ? Colors.green[50] : Colors.orange[50],
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              order['status'].toString().toUpperCase(),
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: order['status'] == 'completed' ? Colors.green[700] : Colors.orange[700]),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Future<void> _showOrderDetails(Map<String, dynamic> order) async {
    final currencyFormat = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Order Details', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold)),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                  ],
                ),
              ),
              const Divider(),
              Expanded(
                child: FutureBuilder<List<dynamic>>(
                  future: supabase.from('sales_order_items').select('*, product_variants(variant_name)').eq('order_id', order['id']),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600)));
                    }
                    if (snapshot.hasError) {
                      return Center(child: Text('Error: ${snapshot.error}'));
                    }
                    final items = snapshot.data ?? [];
                    return ListView(
                      padding: const EdgeInsets.all(24),
                      children: [
                        _buildDetailRow('Order #', order['order_number'] ?? order['id'].toString().substring(0, 8)),
                        _buildDetailRow('Date', DateFormat('MMM dd, yyyy HH:mm').format(DateTime.parse(order['created_at']))),
                        _buildDetailRow('Customer', order['customers']?['name'] ?? 'Walk-in'),
                        _buildDetailRow('Status', order['status'].toString().toUpperCase()),
                        const SizedBox(height: 24),
                        Text('ITEMS', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                        const SizedBox(height: 12),
                        ...items.map((item) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item['product_variants']?['variant_name'] ?? 'Unknown Item', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                                  Text('Qty: ${item['quantity']} @ ${currencyFormat.format(item['unit_price'])}', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                              Text(currencyFormat.format(item['total_price']), style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                            ],
                          ),
                        )),
                        const Divider(height: 48),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('TOTAL', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
                            Text(currencyFormat.format(order['total_amount']), style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFFFF6600))),
                          ],
                        ),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.inter(color: Colors.grey[600])),
          Text(value, style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

}
