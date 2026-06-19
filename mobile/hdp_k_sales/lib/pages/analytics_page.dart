import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hdp_k_sales/main.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';

// Period controls which date range the SALES data covers.
// The monthly sales goal card always shows the current calendar month regardless.
enum _Period { today, week, month, year, allTime }

class AnalyticsPage extends StatefulWidget {
  final GlobalKey<ScaffoldState>? scaffoldKey;
  const AnalyticsPage({super.key, this.scaffoldKey});

  @override
  State<AnalyticsPage> createState() => _AnalyticsPageState();
}

class _AnalyticsPageState extends State<AnalyticsPage> {
  bool _isLoading = true;
  _Period _period = _Period.month;

  // Sales for the selected period
  double _periodSales = 0;
  int _periodOrderCount = 0;
  double _avgOrderValue = 0;

  // Always-on stats (independent of period filter)
  double _todaySales = 0;
  int _todayOrderCount = 0;

  // Monthly sales goal (always current month — goal is measured in sales KES)
  double _monthSalesTarget = 0; // from sales_targets table
  double _monthSalesActual = 0; // real sum from sales_orders for this month

  // Commission — all-time total (no period filter; commission ≠ sales target)
  double _allTimeCommission = 0;

  List<FlSpot> _trendSpots = [];
  List<String> _trendLabels = [];
  List<Map<String, dynamic>> _orders = [];
  List<_CategoryEntry> _categories = [];

  RealtimeChannel? _channel;

  static const _orange = Color(0xFFFF6600);

  @override
  void initState() {
    super.initState();
    _fetch();
    _listenRealtime();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }

  void _listenRealtime() {
    final uid = supabase.auth.currentUser?.id;
    if (uid == null) return;
    _channel = supabase.channel('analytics_ch').onPostgresChanges(
      event: PostgresChangeEvent.insert,
      schema: 'public',
      table: 'sales_orders',
      filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'created_by', value: uid),
      callback: (_) { if (mounted) _fetch(); },
    ).subscribe();
  }

  DateTimeRange _rangeFor(_Period p) {
    final now = DateTime.now();
    switch (p) {
      case _Period.today:
        return DateTimeRange(
          start: DateTime(now.year, now.month, now.day),
          end: DateTime(now.year, now.month, now.day, 23, 59, 59),
        );
      case _Period.week:
        final mon = now.subtract(Duration(days: now.weekday - 1));
        return DateTimeRange(
          start: DateTime(mon.year, mon.month, mon.day),
          end: DateTime(now.year, now.month, now.day, 23, 59, 59),
        );
      case _Period.month:
        return DateTimeRange(
          start: DateTime(now.year, now.month, 1),
          end: DateTime(now.year, now.month, now.day, 23, 59, 59),
        );
      case _Period.year:
        return DateTimeRange(
          start: DateTime(now.year, 1, 1),
          end: DateTime(now.year, now.month, now.day, 23, 59, 59),
        );
      case _Period.allTime:
        return DateTimeRange(
          start: DateTime(2020, 1, 1),
          end: DateTime(now.year, now.month, now.day, 23, 59, 59),
        );
    }
  }

  Future<void> _fetch() async {
    setState(() => _isLoading = true);
    try {
      final uid = supabase.auth.currentUser?.id ?? '';
      final now = DateTime.now();
      final range = _rangeFor(_period);

      // ── Today (always shown, not affected by period filter) ──────────────
      final todayStart = DateTime(now.year, now.month, now.day).toIso8601String();
      final todayRes = await supabase
          .from('sales_orders')
          .select('total_amount')
          .eq('created_by', uid)
          .gte('created_at', todayStart);
      final todaySales = todayRes.fold<double>(0, (s, o) => s + (o['total_amount'] as num).toDouble());

      // ── Selected period orders ────────────────────────────────────────────
      final periodRes = await supabase
          .from('sales_orders')
          .select('id, total_amount, status, created_at, payment_method, customers(name)')
          .eq('created_by', uid)
          .gte('created_at', range.start.toIso8601String())
          .lte('created_at', range.end.toIso8601String())
          .order('created_at', ascending: false);

      final periodSales = periodRes.fold<double>(0, (s, o) => s + (o['total_amount'] as num).toDouble());
      final periodCount = periodRes.length;
      final avgSale = periodCount > 0 ? periodSales / periodCount : 0.0;

      // ── Monthly sales goal (always current month) ─────────────────────────
      // Target is measured in sales KES — not commission KES
      final monthStart = DateTime(now.year, now.month, 1).toIso8601String();
      final monthOrdersRes = await supabase
          .from('sales_orders')
          .select('total_amount')
          .eq('created_by', uid)
          .gte('created_at', monthStart);
      final monthSalesActual = monthOrdersRes.fold<double>(0, (s, o) => s + (o['total_amount'] as num).toDouble());

      final targetRes = await supabase
          .from('sales_targets')
          .select('target_amount')
          .eq('user_id', uid)
          .gte('target_month', monthStart)
          .maybeSingle();
      final monthTarget = targetRes != null ? (targetRes['target_amount'] as num).toDouble() : 0.0;

      // ── Commission for selected period (all-time if period = allTime) ───────
      final empRes = await supabase.from('employees').select('id').eq('user_id', uid).maybeSingle();
      final empId = empRes?['id'];
      double periodCommission = 0;
      if (empId != null) {
        var commQuery = supabase
            .from('sales_commissions')
            .select('amount')
            .eq('sales_agent_id', empId);
        if (_period != _Period.allTime) {
          commQuery = commQuery.gte('created_at', range.start.toIso8601String());
        }
        final commRes = await commQuery;
        periodCommission = commRes.fold<double>(0, (s, c) => s + (c['amount'] as num).toDouble());
      }

      // ── Trend chart ───────────────────────────────────────────────────────
      final spots = <FlSpot>[];
      final labels = <String>[];
      if (_period == _Period.today) {
        // Group today's orders by hour using already-fetched data
        final todayOrders = await supabase
            .from('sales_orders')
            .select('total_amount, created_at')
            .eq('created_by', uid)
            .gte('created_at', range.start.toIso8601String())
            .lte('created_at', range.end.toIso8601String());
        final Map<int, double> byHour = {};
        for (final o in todayOrders) {
          final h = DateTime.parse(o['created_at']).toLocal().hour;
          byHour[h] = (byHour[h] ?? 0) + (o['total_amount'] as num).toDouble();
        }
        for (int h = 6; h <= 22; h++) {
          spots.add(FlSpot((h - 6).toDouble(), byHour[h] ?? 0));
          labels.add('${h}h');
        }
      } else {
        await _buildTrend(uid, range, spots, labels);
      }

      // ── Category breakdown ────────────────────────────────────────────────
      final orderIds = periodRes.map((o) => o['id']).toList();
      final cats = <String, double>{};
      if (orderIds.isNotEmpty) {
        final itemsRes = await supabase
            .from('sales_order_items')
            .select('total_price, product_variants(products(product_categories(name)))')
            .inFilter('order_id', orderIds);
        for (final item in itemsRes) {
          final cat = item['product_variants']?['products']?['product_categories']?['name'] ?? 'Other';
          cats[cat] = (cats[cat] ?? 0) + (item['total_price'] as num).toDouble();
        }
      }
      final sortedCats = cats.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

      if (mounted) {
        setState(() {
          _todaySales = todaySales;
          _todayOrderCount = todayRes.length;
          _periodSales = periodSales;
          _periodOrderCount = periodCount;
          _avgOrderValue = avgSale;
          _monthSalesActual = monthSalesActual;
          _monthSalesTarget = monthTarget;
          _allTimeCommission = periodCommission;
          _trendSpots = spots;
          _trendLabels = labels;
          _orders = List<Map<String, dynamic>>.from(periodRes);
          _categories = sortedCats.map((e) => _CategoryEntry(e.key, e.value, periodSales)).toList();
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

  Future<void> _buildTrend(String uid, DateTimeRange range, List<FlSpot> spots, List<String> labels) async {
    if (_period == _Period.year) {
      for (int m = 1; m <= 12; m++) {
        final start = DateTime(range.start.year, m, 1);
        final end = DateTime(range.start.year, m + 1, 0, 23, 59, 59);
        if (start.isAfter(range.end)) break;
        final res = await supabase.from('sales_orders').select('total_amount').eq('created_by', uid).gte('created_at', start.toIso8601String()).lte('created_at', end.toIso8601String());
        spots.add(FlSpot((m - 1).toDouble(), res.fold<double>(0, (s, o) => s + (o['total_amount'] as num).toDouble())));
        labels.add(DateFormat('MMM').format(start));
      }
    } else if (_period == _Period.allTime) {
      // Show monthly totals going back 24 months
      final now = DateTime.now();
      for (int i = 23; i >= 0; i--) {
        final month = DateTime(now.year, now.month - i, 1);
        final start = DateTime(month.year, month.month, 1);
        final end = DateTime(month.year, month.month + 1, 0, 23, 59, 59);
        final res = await supabase.from('sales_orders').select('total_amount').eq('created_by', uid).gte('created_at', start.toIso8601String()).lte('created_at', end.toIso8601String());
        spots.add(FlSpot((23 - i).toDouble(), res.fold<double>(0, (s, o) => s + (o['total_amount'] as num).toDouble())));
        labels.add(DateFormat('MMM yy').format(start));
      }
    } else {
      final days = range.end.difference(range.start).inDays + 1;
      for (int i = 0; i < days; i++) {
        final d = range.start.add(Duration(days: i));
        final start = DateTime(d.year, d.month, d.day);
        final end = DateTime(d.year, d.month, d.day, 23, 59, 59);
        final res = await supabase.from('sales_orders').select('total_amount').eq('created_by', uid).gte('created_at', start.toIso8601String()).lte('created_at', end.toIso8601String());
        spots.add(FlSpot(i.toDouble(), res.fold<double>(0, (s, o) => s + (o['total_amount'] as num).toDouble())));
        labels.add(_period == _Period.week ? DateFormat('E').format(d) : DateFormat('d').format(d));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);
    final numFmt = NumberFormat.compact();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: _orange))
            : RefreshIndicator(
                onRefresh: _fetch,
                color: _orange,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildHeader(),
                      const SizedBox(height: 20),

                      // ── Sales Goal card (always monthly, goal = sales KES) ──
                      _buildSalesGoalCard(fmt),
                      const SizedBox(height: 12),

                      // ── Commission card (all-time, separate metric) ─────────
                      _buildCommissionCard(fmt, numFmt),
                      const SizedBox(height: 20),

                      // ── Period divider ──────────────────────────────────────
                      Row(
                        children: [
                          Text(_periodLabel().toUpperCase(),
                            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey[500], letterSpacing: 1.2)),
                          const SizedBox(width: 8),
                          Expanded(child: Divider(color: Colors.grey[300])),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // ── Sales stats for selected period ─────────────────────
                      _buildPeriodStats(fmt),
                      const SizedBox(height: 20),

                      // ── Trend chart ─────────────────────────────────────────
                      if (_trendSpots.isNotEmpty) ...[
                        _buildTrendChart(),
                        const SizedBox(height: 20),
                      ],

                      // ── Category breakdown ──────────────────────────────────
                      if (_categories.isNotEmpty) ...[
                        _buildCategoryBreakdown(fmt),
                        const SizedBox(height: 20),
                      ],

                      // ── Orders list ─────────────────────────────────────────
                      _buildOrdersList(fmt),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  String _periodLabel() {
    switch (_period) {
      case _Period.today: return 'Today';
      case _Period.week: return 'This Week';
      case _Period.month: return 'This Month';
      case _Period.year: return 'This Year';
      case _Period.allTime: return 'All Time';
    }
  }

  Widget _buildHeader() {
    return Row(
      children: [
        if (widget.scaffoldKey != null)
          IconButton(
            icon: const Icon(Icons.menu, size: 26),
            onPressed: () => widget.scaffoldKey?.currentState?.openDrawer(),
            padding: EdgeInsets.zero,
          ),
        Expanded(
          child: Text('Analytics', style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.bold)),
        ),
        _PeriodDropdown(value: _period, onChanged: (p) { setState(() => _period = p); _fetch(); }),
      ],
    );
  }

  /// Sales Goal card — the goal is measured in SALES (KES amount sold).
  /// Target is set monthly in the sales_targets table.
  Widget _buildSalesGoalCard(NumberFormat fmt) {
    final progress = _monthSalesTarget > 0
        ? (_monthSalesActual / _monthSalesTarget).clamp(0.0, 1.0)
        : 0.0;
    final pct = (progress * 100).toInt();
    final remaining = (_monthSalesTarget - _monthSalesActual).clamp(0.0, double.infinity);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6600), Color(0xFFFF9933)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: _orange.withOpacity(0.22), blurRadius: 10, offset: const Offset(0, 5))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Monthly Sales Goal', style: GoogleFonts.inter(color: Colors.white.withOpacity(0.9), fontSize: 13, fontWeight: FontWeight.w600)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                child: Text('$pct% of target', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(fmt.format(_monthSalesActual),
              style: GoogleFonts.inter(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
          Text('Sales this month  ·  Target: ${fmt.format(_monthSalesTarget)}',
              style: GoogleFonts.inter(color: Colors.white.withOpacity(0.75), fontSize: 12)),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.white.withOpacity(0.25),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              minHeight: 10,
            ),
          ),
          const SizedBox(height: 8),
          if (_monthSalesTarget > 0 && progress < 1.0)
            Text('${fmt.format(remaining)} more to hit target',
                style: GoogleFonts.inter(color: Colors.white.withOpacity(0.8), fontSize: 11))
          else if (progress >= 1.0)
            Text('Target reached! Keep going 🎯',
                style: GoogleFonts.inter(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))
          else
            Text('No target set for this month',
                style: GoogleFonts.inter(color: Colors.white.withOpacity(0.7), fontSize: 11)),
        ],
      ),
    );
  }

  /// Commission card — shows commission for the selected period (or all-time if "All Time" selected).
  Widget _buildCommissionCard(NumberFormat fmt, NumberFormat numFmt) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: Colors.teal.withOpacity(0.1), shape: BoxShape.circle),
            child: const Icon(Icons.account_balance_wallet_rounded, color: Colors.teal, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Commission Earned', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[600])),
                Text(fmt.format(_allTimeCommission),
                    style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.teal[700])),
                Text('${_periodLabel()} · tap filter to change period',
                    style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[500])),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodStats(NumberFormat fmt) {
    return Column(
      children: [
        // Top row: period total sales + order count
        Row(
          children: [
            Expanded(child: _statCard('Sales', fmt.format(_periodSales), Icons.trending_up_rounded, _orange, '${_periodOrderCount} orders')),
            const SizedBox(width: 10),
            Expanded(child: _statCard('Avg Sale', fmt.format(_avgOrderValue), Icons.receipt_rounded, Colors.blue, 'per order')),
          ],
        ),
        if (_period != _Period.today && _period != _Period.allTime) ...[
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _statCard('Today\'s Sales', fmt.format(_todaySales), Icons.today_rounded, Colors.green, '${_todayOrderCount} orders today')),
              const SizedBox(width: 10),
              Expanded(child: _statCard('Orders', _periodOrderCount.toString(), Icons.shopping_bag_rounded, Colors.purple, _periodLabel())),
            ],
          ),
        ],
      ],
    );
  }

  Widget _statCard(String title, String value, IconData icon, Color color, String sub) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 8),
          Text(title, style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[600])),
          const SizedBox(height: 2),
          Text(value, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
          Text(sub, style: GoogleFonts.inter(fontSize: 10, color: Colors.grey[500]), overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  Widget _buildTrendChart() {
    final maxY = _trendSpots.map((s) => s.y).fold<double>(0, (a, b) => a > b ? a : b);
    final fmt = NumberFormat.compact();

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Sales Trend', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold)),
              Text(_periodLabel(), style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[500])),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 150,
            child: LineChart(
              LineChartData(
                minY: 0,
                maxY: maxY == 0 ? 100 : maxY * 1.25,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: maxY == 0 ? 50 : maxY * 0.6,
                  getDrawingHorizontalLine: (v) => FlLine(color: Colors.grey[100]!, strokeWidth: 1),
                ),
                titlesData: FlTitlesData(
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      interval: _trendLabels.length > 14 ? (_trendLabels.length / 7).ceilToDouble() : 1,
                      getTitlesWidget: (val, _) {
                        final i = val.toInt();
                        if (i < 0 || i >= _trendLabels.length) return const SizedBox();
                        return Padding(
                          padding: const EdgeInsets.only(top: 5),
                          child: Text(_trendLabels[i], style: GoogleFonts.inter(fontSize: 9, color: Colors.grey[500])),
                        );
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 36,
                      getTitlesWidget: (val, _) {
                        if (val == 0) return const SizedBox();
                        return Text(fmt.format(val), style: GoogleFonts.inter(fontSize: 9, color: Colors.grey[400]));
                      },
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: _trendSpots,
                    isCurved: true,
                    color: _orange,
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: FlDotData(
                      show: _trendSpots.length <= 12,
                      getDotPainter: (s, p, bar, i) => FlDotCirclePainter(radius: 3, color: _orange, strokeColor: Colors.white, strokeWidth: 2),
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        colors: [_orange.withOpacity(0.15), Colors.transparent],
                        begin: Alignment.topCenter, end: Alignment.bottomCenter,
                      ),
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

  static const _catColors = [_orange, Color(0xFF2196F3), Color(0xFF4CAF50), Color(0xFF9C27B0), Color(0xFF00BCD4), Color(0xFFFFC107)];

  Widget _buildCategoryBreakdown(NumberFormat fmt) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sales by Category', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),
          ..._categories.asMap().entries.map((entry) {
            final cat = entry.value;
            final color = _catColors[entry.key % _catColors.length];
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(cat.name, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis)),
                      Text(fmt.format(cat.amount), style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 8),
                      SizedBox(width: 34, child: Text('${cat.pct.toInt()}%', style: GoogleFonts.inter(fontSize: 10, color: Colors.grey[500]), textAlign: TextAlign.right)),
                    ],
                  ),
                  const SizedBox(height: 5),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: cat.pct / 100,
                      minHeight: 5,
                      backgroundColor: Colors.grey[100],
                      valueColor: AlwaysStoppedAnimation<Color>(color),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildOrdersList(NumberFormat fmt) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('${_periodLabel()} Orders', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold)),
            Text('${_periodOrderCount} orders  ·  ${fmt.format(_periodSales)}',
                style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[500])),
          ],
        ),
        const SizedBox(height: 12),
        if (_orders.isEmpty)
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: Center(child: Text('No sales for ${_periodLabel().toLowerCase()}', style: GoogleFonts.inter(color: Colors.grey))),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _orders.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, i) {
              final o = _orders[i];
              final date = DateTime.parse(o['created_at']);
              final isCompleted = o['status'] == 'completed';
              return InkWell(
                onTap: () => _showOrderDetails(o),
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey[100]!),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36, height: 36,
                        decoration: BoxDecoration(color: _orange.withOpacity(0.1), shape: BoxShape.circle),
                        child: const Icon(Icons.receipt_long, color: _orange, size: 17),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(o['customers']?['name'] ?? 'Walk-in',
                                style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                            Text(DateFormat('MMM dd, hh:mm a').format(date),
                                style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[500])),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(fmt.format(o['total_amount']),
                              style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 3),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isCompleted ? Colors.green[50] : Colors.orange[50],
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(o['status'].toString().toUpperCase(),
                                style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.bold,
                                    color: isCompleted ? Colors.green[700] : Colors.orange[700])),
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

  void _showOrderDetails(Map<String, dynamic> order) {
    final fmt = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Order Details', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.pop(context)),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: FutureBuilder<List<dynamic>>(
                future: supabase.from('sales_order_items')
                    .select('*, product_variants(variant_name, products(name))')
                    .eq('order_id', order['id']),
                builder: (context, snap) {
                  if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator(color: _orange));
                  final items = snap.data ?? [];
                  return ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      _detailRow('Order #', (order['order_number'] ?? order['id'].toString().substring(0, 8)).toString().toUpperCase()),
                      _detailRow('Date', DateFormat('MMM dd, yyyy HH:mm').format(DateTime.parse(order['created_at']))),
                      _detailRow('Customer', order['customers']?['name'] ?? 'Walk-in'),
                      _detailRow('Payment', (order['payment_method'] ?? '').toString().toUpperCase()),
                      const SizedBox(height: 14),
                      Text('ITEMS', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2)),
                      const SizedBox(height: 8),
                      ...items.map((item) {
                        final pName = item['product_variants']?['products']?['name'] ?? '';
                        final vName = item['product_variants']?['variant_name'] ?? '';
                        final display = (vName.isEmpty || vName == 'Standard' || vName == 'Default' || vName == pName) ? pName : '$pName $vName';
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            children: [
                              Expanded(child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(display.isEmpty ? 'Item' : display, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                                  Text('${item['quantity']} × ${fmt.format(item['unit_price'])}', style: GoogleFonts.inter(fontSize: 11, color: Colors.grey)),
                                ],
                              )),
                              Text(fmt.format(item['total_price']), style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                            ],
                          ),
                        );
                      }),
                      const Divider(height: 28),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('TOTAL', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold)),
                          Text(fmt.format(order['total_amount']), style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: _orange)),
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
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.inter(color: Colors.grey[600], fontSize: 13)),
          Flexible(child: Text(value, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13), textAlign: TextAlign.right)),
        ],
      ),
    );
  }
}

class _CategoryEntry {
  final String name;
  final double amount;
  final double total;
  _CategoryEntry(this.name, this.amount, this.total);
  double get pct => total > 0 ? (amount / total * 100) : 0;
}

class _PeriodDropdown extends StatelessWidget {
  final _Period value;
  final ValueChanged<_Period> onChanged;
  const _PeriodDropdown({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<_Period>(
          value: value,
          isDense: true,
          icon: const Icon(Icons.keyboard_arrow_down, size: 18),
          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black),
          items: const [
            DropdownMenuItem(value: _Period.today, child: Text('Today')),
            DropdownMenuItem(value: _Period.week, child: Text('This Week')),
            DropdownMenuItem(value: _Period.month, child: Text('This Month')),
            DropdownMenuItem(value: _Period.year, child: Text('This Year')),
            DropdownMenuItem(value: _Period.allTime, child: Text('All Time')),
          ],
          onChanged: (p) { if (p != null) onChanged(p); },
        ),
      ),
    );
  }
}
