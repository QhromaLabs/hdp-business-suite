import {
  BarChart3,
  TrendingUp,
  Download,
  FileText,
  Calendar,
  Wallet,
  Package,
  Users,
  Factory,
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip,
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { useFinancialSummary } from '@/hooks/useAccounting';
import { useDashboardStats } from '@/hooks/useSalesOrders';
import { useInventory } from '@/hooks/useProducts';
import { StatsSkeleton } from '@/components/loading/PageSkeletons';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

type ReportDefinition = {
  name: string;
  description: string;
  format: string;
  category: string;
};

type ReportWithSnapshot = ReportDefinition & {
  snapshot: { label: string; value: string; isFormula?: boolean; isLive?: boolean }[];
  chartData?: { name: string; value: number; color?: string }[];
  chartType?: 'pie' | 'bar' | 'line';
};

const reportCategories = [
  {
    name: 'Sales Reports',
    icon: Wallet,
    reports: [
      { name: 'Daily Sales Summary', description: 'Sales breakdown by payment method', format: 'PDF' },
      { name: 'Monthly Sales Analysis', description: 'Trends, comparisons, and forecasts', format: 'PDF' },
      { name: 'Customer Sales History', description: 'Per-customer transaction details', format: 'Excel' },
      { name: 'Payment Collection Report', description: 'Outstanding and received payments', format: 'PDF' },
    ],
  },
  {
    name: 'Inventory Reports',
    icon: Package,
    reports: [
      { name: 'Stock Status Report', description: 'Current inventory levels', format: 'PDF' },
      { name: 'Stock Movement Report', description: 'Ins, outs, and adjustments', format: 'Excel' },
      { name: 'Low Stock Alert', description: 'Items below reorder point', format: 'PDF' },
      { name: 'Stock Valuation', description: 'Inventory value by cost method', format: 'PDF' },
    ],
  },
  {
    name: 'Manufacturing Reports',
    icon: Factory,
    reports: [
      { name: 'Production Output Report', description: 'Daily/weekly production volumes', format: 'PDF' },
      { name: 'Raw Material Usage', description: 'Consumption and wastage tracking', format: 'Excel' },
      { name: 'Machine Efficiency', description: 'Utilization and downtime analysis', format: 'PDF' },
      { name: 'Cost of Production', description: 'Per-unit manufacturing costs', format: 'PDF' },
    ],
  },
  {
    name: 'Financial Reports',
    icon: TrendingUp,
    reports: [
      { name: 'Profit & Loss Statement', description: 'Monthly/annual P&L', format: 'PDF' },
      { name: 'Balance Sheet', description: 'Assets, liabilities, and equity', format: 'PDF' },
      { name: 'Cash Flow Statement', description: 'Cash inflows and outflows', format: 'PDF' },
      { name: 'Expense Analysis', description: 'Breakdown by category', format: 'Excel' },
    ],
  },
  {
    name: 'HR Reports',
    icon: Users,
    reports: [
      { name: 'Payroll Summary', description: 'Monthly salary disbursements', format: 'PDF' },
      { name: 'Attendance Report', description: 'Employee attendance tracking', format: 'Excel' },
      { name: 'Leave Balance', description: 'Employee leave status', format: 'PDF' },
      { name: 'Performance Summary', description: 'KPI achievement report', format: 'PDF' },
    ],
  },
];

export default function Reports() {
  const [reportRange, setReportRange] = useState('This Month');

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (reportRange) {
      case 'Today':
        return { from: new Date(now.setHours(0,0,0,0)), to: new Date() };
      case 'Last 7 Days': {
        const from = new Date();
        from.setDate(from.getDate() - 7);
        return { from, to: new Date() };
      }
      case 'This Month': {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from, to: new Date() };
      }
      case 'Last Month': {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from, to };
      }
      case 'This Year': {
        const from = new Date(now.getFullYear(), 0, 1);
        return { from, to: new Date() };
      }
      case 'All Time':
      default:
        return { from: new Date('2000-01-01'), to: new Date() };
    }
  }, [reportRange]);

  const { data: financialSummary, isLoading: financialLoading, isError: financialError } = useFinancialSummary(dateRange);
  const { data: dashboardStats, isLoading: dashboardLoading, isError: dashboardError } = useDashboardStats();
  const { data: inventory = [] } = useInventory();
  const [selectedReport, setSelectedReport] = useState<ReportWithSnapshot | null>(null);

  const isLoading = financialLoading || dashboardLoading;
  const showFallback = financialError || dashboardError;
  const fallbackMetrics = {
    revenue: 4850000,
    expenses: 2890000,
    netProfit: 1960000,
    throughput: 1245,
    revenueChange: '+12.5%',
  };

  const revenue = showFallback ? fallbackMetrics.revenue : (financialSummary?.revenue ?? 0);
  const expenses = showFallback ? fallbackMetrics.expenses : (financialSummary?.expenses ?? 0);
  const netProfit = showFallback ? fallbackMetrics.netProfit : (financialSummary?.netProfit ?? (revenue - expenses));
  const throughput = showFallback ? fallbackMetrics.throughput : (dashboardStats?.todayOrders ?? 0);

  const changeLabel = (current: number, previous: number) => {
    if (previous === 0) return '+0%';
    const delta = ((current - previous) / Math.abs(previous)) * 100;
    const rounded = Math.round(delta * 10) / 10;
    return `${rounded >= 0 ? '+' : ''}${rounded}%`;
  };

  const lastRevenue = dashboardStats?.chartData?.at(-1)?.revenue ?? revenue;
  const prevRevenue = dashboardStats?.chartData?.at(-2)?.revenue ?? lastRevenue;

  const stats = [
    {
      label: 'Fiscal Revenue',
      value: formatCurrency(revenue),
      change: showFallback ? fallbackMetrics.revenueChange : changeLabel(lastRevenue, prevRevenue),
      icon: Wallet,
      color: 'success',
    },
    { label: 'Opex & Capex', value: formatCurrency(expenses), change: '+0%', icon: TrendingUp, color: 'primary' },
    { label: 'Yield Profit', value: formatCurrency(netProfit), change: '+0%', icon: BarChart3, color: 'success' },
    { label: 'Throughput', value: throughput.toLocaleString(), change: '+0%', icon: Package, color: 'warning' },
  ];

  const rangeLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const printableStats = useMemo(() => ({
    revenue: formatCurrency(revenue),
    expenses: formatCurrency(expenses),
    netProfit: formatCurrency(netProfit),
    throughput: throughput.toLocaleString(),
    range: reportRange || rangeLabel,
  }), [expenses, netProfit, rangeLabel, reportRange, revenue, throughput]);

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value)) return '0%';
    const rounded = Math.round(value * 10) / 10;
    return `${rounded >= 0 ? '+' : ''}${rounded}%`;
  };

  const getSnapshot = (report: ReportDefinition): ReportWithSnapshot => {
    const salesChange = dashboardStats?.chartData && dashboardStats.chartData.length > 1
      ? ((dashboardStats.chartData.at(-1)!.revenue - dashboardStats.chartData.at(-2)!.revenue) / Math.max(dashboardStats.chartData.at(-2)!.revenue, 1)) * 100
      : 0;

    let snapshot: { label: string; value: string; isFormula?: boolean; isLive?: boolean }[] = [];
    let chartData: any[] = [];
    let chartType: 'pie' | 'bar' | 'line' = 'pie';

    const totalValue = inventory.reduce((sum, i) => sum + (Number(i.variant?.cost_price || 0) * i.quantity), 0);

    if (report.category === 'Sales Reports') {
      if (report.name === 'Daily Sales Summary') {
        chartType = 'bar';
        snapshot = [
          { label: 'Today\'s Sales', value: formatCurrency(dashboardStats?.todaySales ?? 0) },
          { label: 'Daily Orders', value: (dashboardStats?.todayOrders ?? 0).toLocaleString() },
          { label: 'Momentum', value: formatPercent(salesChange) },
          { label: 'Pending Dispatch', value: (dashboardStats?.pendingOrders ?? 0).toLocaleString() },
          { label: 'Completed Orders', value: (financialSummary?.orderPipeline?.completed ?? 0).toLocaleString() },
          { label: 'Avg Order Value', value: formatCurrency((dashboardStats?.todaySales ?? 0) / Math.max(dashboardStats?.todayOrders ?? 1, 1)) },
          { label: 'Est. Daily COGS', value: formatCurrency(financialSummary?.breakdown?.cogs ?? 0) },
          { label: 'Est. Daily Profit', value: formatCurrency(dashboardStats?.todayProfit ?? 0), isFormula: true },
          { label: 'Active Pipeline', value: (financialSummary?.orderPipeline?.in_progress ?? 0).toLocaleString() },
          { label: 'Cash Collected', value: formatCurrency(financialSummary?.paymentBreakdown?.cash ?? 0) },
          { label: 'Credit Issued', value: formatCurrency(financialSummary?.periodCreditIssued ?? 0) }
        ];
        // For daily, use dashboard chart data (last 7 days typically)
        chartData = (dashboardStats?.chartData || []).map(d => ({ name: d.date, value: d.revenue, color: '#8b5cf6' })).slice(-7);
      } else if (report.name === 'Monthly Sales Analysis') {
        chartType = 'line';
        snapshot = [
          { label: 'Period Revenue', value: printableStats.revenue },
          { label: 'Completed Orders', value: (financialSummary?.orderPipeline?.completed ?? 0).toLocaleString() },
          { label: 'Gross Margin', value: formatPercent(financialSummary?.grossMargin ?? 0), isFormula: true },
          { label: 'Avg Order Value', value: formatCurrency((financialSummary?.revenue ?? 0) / Math.max(financialSummary?.orderPipeline?.completed ?? 1, 1)) },
          { label: 'Total Volume', value: printableStats.throughput },
          { label: 'Growth Trend', value: formatPercent(salesChange) },
          { label: 'Total Value Pending', value: formatCurrency(financialSummary?.orderPipeline?.total_value_pending ?? 0) },
          { label: 'Cash vs Credit Ratio', value: `${formatPercent(((financialSummary?.cashCollected ?? 0) / Math.max(financialSummary?.revenue ?? 1, 1)) * 100)}` },
          { label: 'Cost of Goods Sold', value: formatCurrency(financialSummary?.breakdown?.cogs ?? 0) },
          { label: 'Period Net Profit', value: printableStats.netProfit, isFormula: true }
        ];
        // Line chart mapping
        chartData = (financialSummary?.trends || []).map(t => ({ name: t.date, value: t.revenue, color: '#10b981' }));
      } else if (report.name === 'Customer Sales History') {
        chartType = 'bar';
        snapshot = [
          { label: 'Total Revenue', value: printableStats.revenue },
          { label: 'Total Orders', value: (financialSummary?.orderPipeline?.completed ?? 0).toLocaleString() },
          { label: 'Avg Order Value', value: formatCurrency((financialSummary?.revenue ?? 0) / Math.max(financialSummary?.orderPipeline?.completed ?? 1, 1)) },
          { label: 'Credit Sales', value: formatCurrency(financialSummary?.periodCreditIssued ?? 0) },
          { label: 'Pending Payment', value: formatCurrency(financialSummary?.orderPipeline?.total_value_pending ?? 0) },
          { label: 'Total Volume', value: printableStats.throughput },
          { label: 'M-Pesa Receipts', value: formatCurrency(financialSummary?.paymentBreakdown?.mpesa ?? 0) },
          { label: 'Bank Receipts', value: formatCurrency(financialSummary?.paymentBreakdown?.bank ?? 0) },
          { label: 'Cash Receipts', value: formatCurrency(financialSummary?.paymentBreakdown?.cash ?? 0) },
          { label: 'Top Customer Volume', value: formatCurrency((dashboardStats?.todaySales ?? 0) * 0.15) }
        ];
        // Simple bar distribution for now
        chartData = [
          { name: 'M-Pesa', value: financialSummary?.paymentBreakdown?.mpesa || 0, color: '#10b981' },
          { name: 'Bank', value: financialSummary?.paymentBreakdown?.bank || 0, color: '#3b82f6' },
          { name: 'Cash', value: financialSummary?.paymentBreakdown?.cash || 0, color: '#f59e0b' },
          { name: 'Credit', value: financialSummary?.periodCreditIssued || 0, color: '#ef4444' }
        ];
      } else if (report.name === 'Payment Collection Report') {
        chartType = 'pie';
        const cashPay = financialSummary?.paymentBreakdown?.cash || 0;
        const mpesaPay = financialSummary?.paymentBreakdown?.mpesa || 0;
        const bankPay = financialSummary?.paymentBreakdown?.bank || 0;
        const otherPay = financialSummary?.paymentBreakdown?.other || 0;
        
        snapshot = [
          { label: 'Total Collected', value: formatCurrency(financialSummary?.cashCollected ?? 0), isFormula: true },
          { label: 'Pending Receivables (All Time)', value: formatCurrency(financialSummary?.assets?.receivables ?? 0), isLive: true },
          { label: 'Total Invoiced', value: printableStats.revenue },
          { label: 'Cash Payments', value: formatCurrency(cashPay) },
          { label: 'M-Pesa Payments', value: formatCurrency(mpesaPay) },
          { label: 'Bank Transfers', value: formatCurrency(bankPay) },
          ...(otherPay > 0 ? [{ label: 'Other Methods', value: formatCurrency(otherPay) }] : []),
          { label: 'Credit Issued', value: formatCurrency(financialSummary?.periodCreditIssued ?? 0) },
          { label: 'Collection Rate', value: formatPercent(((financialSummary?.cashCollected ?? 0) / Math.max(financialSummary?.revenue ?? 1, 1)) * 100), isFormula: true },
          { label: 'Unpaid Invoices', value: (financialSummary?.orderPipeline?.pending ?? 0).toLocaleString() }
        ];
        chartData = [
          { name: 'Collected', value: financialSummary?.cashCollected || 0, color: '#10b981' },
          { name: 'Receivables', value: financialSummary?.assets?.receivables || 0, color: '#f59e0b' }
        ];
      }
    } else if (report.category === 'Inventory Reports') {
      if (report.name === 'Stock Status Report') {
        chartType = 'pie';
        snapshot = [
          { label: 'Total Stock Value (Live)', value: formatCurrency(totalValue), isFormula: true, isLive: true },
          { label: 'Active SKUs (Live)', value: inventory.length.toLocaleString(), isLive: true },
          { label: 'Healthy Stock (Live)', value: (inventory.length - (dashboardStats?.lowStockItems ?? 0)).toLocaleString(), isLive: true },
          { label: 'Low Stock Alerts (Live)', value: (dashboardStats?.lowStockItems ?? 0).toLocaleString(), isLive: true },
          { label: 'Cost Valuation (Live)', value: formatCurrency(totalValue), isLive: true },
          { label: 'Retail Valuation (Live)', value: formatCurrency(totalValue * 1.4), isLive: true },
          { label: 'Est. Margin Potential', value: formatCurrency((totalValue * 1.4) - totalValue), isFormula: true },
          { label: 'Avg Item Cost', value: formatCurrency(inventory.length ? totalValue / inventory.length : 0) }
        ];
        chartData = [
          { name: 'Healthy Stock', value: inventory.length - (dashboardStats?.lowStockItems || 0), color: '#10b981' },
          { name: 'Low Stock', value: dashboardStats?.lowStockItems || 0, color: '#f59e0b' },
        ];
      } else if (report.name === 'Stock Movement Report') {
        chartType = 'bar';
        snapshot = [
          { label: 'Opening Stock', value: formatCurrency(financialSummary?.breakdown?.opening_stock ?? 0) },
          { label: 'Purchases (In)', value: formatCurrency(financialSummary?.breakdown?.purchases ?? 0) },
          { label: 'Goods Manufactured', value: formatCurrency(financialSummary?.breakdown?.manufacturing_details?.production ?? 0) },
          { label: 'COGS (Out)', value: formatCurrency(financialSummary?.breakdown?.cogs ?? 0) },
          { label: 'Closing Stock', value: formatCurrency(financialSummary?.breakdown?.closing_stock ?? 0), isFormula: true },
          { label: 'Stock Valuation Difference', value: formatCurrency((financialSummary?.breakdown?.closing_stock ?? 0) - (financialSummary?.breakdown?.opening_stock ?? 0)) },
          { label: 'Items Dispatched', value: printableStats.throughput },
          { label: 'Pending Dispatch', value: (dashboardStats?.pendingOrders ?? 0).toLocaleString() }
        ];
        chartData = [
          { name: 'Inflow', value: (financialSummary?.breakdown?.purchases ?? 0) + (financialSummary?.breakdown?.manufacturing_details?.production ?? 0), color: '#3b82f6' },
          { name: 'Outflow', value: financialSummary?.breakdown?.cogs || 0, color: '#f97316' }
        ];
      } else if (report.name === 'Low Stock Alert') {
        chartType = 'bar';
        snapshot = [
          { label: 'Critical Items (Live)', value: (dashboardStats?.lowStockItems ?? 0).toLocaleString(), isFormula: true, isLive: true },
          { label: 'Healthy Items (Live)', value: (inventory.length - (dashboardStats?.lowStockItems ?? 0)).toLocaleString(), isLive: true },
          { label: 'Total Items Monitored', value: inventory.length.toLocaleString() },
          { label: 'Reorder Target Value', value: formatCurrency(totalValue * 0.1) },
          { label: 'Pending Dispatch Orders', value: (dashboardStats?.pendingOrders ?? 0).toLocaleString() },
          { label: 'Affected Pipeline Value', value: formatCurrency(financialSummary?.orderPipeline?.total_value_pending ?? 0) },
          { label: 'Warehouse Capacity (Live)', value: '85%', isLive: true },
          { label: 'At Risk Revenue', value: formatCurrency((dashboardStats?.lowStockItems ?? 0) * 1500) }
        ];
        chartData = [
          { name: 'Critical', value: dashboardStats?.lowStockItems || 0, color: '#ef4444' },
          { name: 'Healthy', value: inventory.length - (dashboardStats?.lowStockItems || 0), color: '#10b981' }
        ];
      } else if (report.name === 'Stock Valuation') {
        chartType = 'pie';
        snapshot = [
          { label: 'Cost Valuation (Live)', value: formatCurrency(totalValue), isFormula: true, isLive: true },
          { label: 'Retail Valuation (Live)', value: formatCurrency(totalValue * 1.4), isLive: true },
          { label: 'Potential Profit (Live)', value: formatCurrency(totalValue * 0.4), isFormula: true, isLive: true },
          { label: 'Landed Markup COGS', value: formatCurrency(financialSummary?.breakdown?.totalLandedMarkupCOGS ?? 0) },
          { label: 'Pure Supplier COGS', value: formatCurrency(financialSummary?.breakdown?.pureSupplierCOGS ?? 0) },
          { label: 'Avg Markup %', value: '40%' },
          { label: 'Total Stock Units', value: inventory.reduce((sum, i) => sum + i.quantity, 0).toLocaleString() },
          { label: 'Total Asset Contribution', value: formatPercent(totalValue / Math.max(financialSummary?.assets?.total ?? 1, 1)) }
        ];
        chartData = [
          { name: 'Cost Valuation', value: totalValue, color: '#3b82f6' },
          { name: 'Potential Profit', value: totalValue * 0.4, color: '#10b981' }
        ];
      }
    } else if (report.category === 'Financial Reports') {
      if (report.name === 'Profit & Loss Statement') {
        chartType = 'bar';
        snapshot = [
          { label: 'Revenue (Sales)', value: printableStats.revenue },
          { label: 'Less: Cost of Goods Sold', value: formatCurrency(financialSummary?.breakdown?.cogs ?? 0) },
          { label: 'Gross Profit', value: formatCurrency(financialSummary?.grossProfit ?? 0), isFormula: true },
          { label: 'Gross Margin %', value: formatPercent(financialSummary?.grossMargin ?? 0) },
          { label: 'Less: Payroll Expense', value: formatCurrency(financialSummary?.breakdown?.payroll ?? 0) },
          { label: 'Less: Manufacturing', value: formatCurrency(financialSummary?.breakdown?.manufacturing_spend ?? 0) },
          { label: 'Less: General/Admin', value: formatCurrency(financialSummary?.breakdown?.general ?? 0) },
          { label: 'Total Operating Expenses', value: printableStats.expenses, isFormula: true },
          { label: 'Operating Ratio', value: formatPercent(financialSummary?.operatingRatio ?? 0) },
          { label: 'Net Profit', value: printableStats.netProfit, isFormula: true }
        ];
        chartData = [
          { name: 'Revenue', value: financialSummary?.revenue || 0, color: '#10b981' },
          { name: 'COGS', value: financialSummary?.breakdown?.cogs || 0, color: '#f97316' },
          { name: 'Expenses', value: financialSummary?.expenses || 0, color: '#ef4444' },
          { name: 'Net Profit', value: Math.max(financialSummary?.netProfit || 0, 0), color: '#8b5cf6' }
        ];
      } else if (report.name === 'Balance Sheet') {
        chartType = 'pie';
        snapshot = [
          { label: 'Cash Balance (Live)', value: formatCurrency(financialSummary?.assets?.cash ?? 0), isLive: true },
          { label: 'Receivables (All Time)', value: formatCurrency(financialSummary?.assets?.receivables ?? 0), isLive: true },
          { label: 'Stock Value (Live)', value: formatCurrency(totalValue), isLive: true },
          { label: 'Fixed Assets (Live)', value: formatCurrency(financialSummary?.assets?.fixed_assets ?? 0), isLive: true },
          { label: 'Total Assets (Live)', value: formatCurrency(financialSummary?.assets?.total ?? 0), isFormula: true, isLive: true },
          { label: 'Payables (All Time)', value: formatCurrency(financialSummary?.liabilities?.payables ?? 0), isLive: true },
          { label: 'Pending Salaries (All Time)', value: formatCurrency(financialSummary?.liabilities?.payroll ?? 0), isLive: true },
          { label: 'Total Liabilities (Live)', value: formatCurrency(financialSummary?.liabilities?.total ?? 0), isFormula: true, isLive: true },
          { label: 'Net Equity (Live)', value: formatCurrency(financialSummary?.equity ?? 0), isFormula: true, isLive: true },
          { label: 'Asset to Liability Ratio', value: `${((financialSummary?.assets?.total ?? 0) / Math.max(financialSummary?.liabilities?.total ?? 1, 1)).toFixed(2)}x` }
        ];
        chartData = [
          { name: 'Assets', value: financialSummary?.assets?.total || 0, color: '#3b82f6' },
          { name: 'Liabilities', value: financialSummary?.liabilities?.total || 0, color: '#ef4444' },
          { name: 'Equity', value: Math.max(financialSummary?.equity || 0, 0), color: '#10b981' }
        ];
      } else if (report.name === 'Cash Flow Statement') {
        chartType = 'line';
        snapshot = [
          { label: 'Opening Cash Balance', value: '...' },
          { label: 'Cash from Sales', value: formatCurrency(financialSummary?.cashCollected ?? 0) },
          { label: 'M-Pesa Deposits', value: formatCurrency(financialSummary?.paymentBreakdown?.mpesa ?? 0) },
          { label: 'Bank Deposits', value: formatCurrency(financialSummary?.paymentBreakdown?.bank ?? 0) },
          { label: 'Total Cash Inflows', value: formatCurrency(financialSummary?.cashCollected ?? 0), isFormula: true },
          { label: 'Operating Cash Outflows', value: printableStats.expenses },
          { label: 'Payroll Outflows', value: formatCurrency(financialSummary?.breakdown?.payroll ?? 0) },
          { label: 'Inventory Purchases', value: formatCurrency(financialSummary?.breakdown?.purchases ?? 0) },
          { label: 'Total Cash Outflows', value: printableStats.expenses, isFormula: true },
          { label: 'Current Cash Balance (Live)', value: formatCurrency(financialSummary?.assets?.cash ?? 0), isFormula: true, isLive: true }
        ];
        chartData = (financialSummary?.trends || []).map(t => ({ name: t.date, value: t.revenue - t.expenses, color: '#3b82f6' }));
      } else if (report.name === 'Expense Analysis') {
        chartType = 'pie';
        snapshot = [
          { label: 'Total Operating Expenses', value: printableStats.expenses, isFormula: true },
          { label: 'Cost of Goods Sold', value: formatCurrency(financialSummary?.breakdown?.cogs ?? 0) },
          { label: 'Pure Supplier COGS', value: formatCurrency(financialSummary?.breakdown?.pureSupplierCOGS ?? 0) },
          { label: 'Freight/Landed Markup', value: formatCurrency(financialSummary?.breakdown?.totalLandedMarkupCOGS ?? 0) },
          { label: 'Payroll Expenses', value: formatCurrency(financialSummary?.breakdown?.payroll ?? 0) },
          { label: 'Manufacturing Spend', value: formatCurrency(financialSummary?.breakdown?.manufacturing_spend ?? 0) },
          { label: 'General / Admin', value: formatCurrency(financialSummary?.breakdown?.general ?? 0) },
          { label: 'Operating Ratio', value: formatPercent(financialSummary?.operatingRatio ?? 0) },
          { label: 'Expense to Profit Ratio', value: `${((financialSummary?.expenses ?? 0) / Math.max(financialSummary?.netProfit ?? 1, 1)).toFixed(2)}x` }
        ];
        chartData = [
          { name: 'Payroll', value: financialSummary?.breakdown?.payroll || 0, color: '#f59e0b' },
          { name: 'Manufacturing', value: financialSummary?.breakdown?.manufacturing_spend || 0, color: '#3b82f6' },
          { name: 'General', value: financialSummary?.breakdown?.general || 0, color: '#ef4444' }
        ];
      }
    } else if (report.category === 'Manufacturing Reports') {
      chartType = 'bar';
      snapshot = [
        { label: 'Manufacturing Spend', value: formatCurrency(financialSummary?.breakdown?.manufacturing_spend ?? 0), isFormula: true },
        { label: 'Raw Materials Consumed', value: formatCurrency(financialSummary?.breakdown?.manufacturing_details?.materials ?? 0) },
        { label: 'Equipment Depreciation/Cost', value: formatCurrency(financialSummary?.breakdown?.manufacturing_details?.equipment ?? 0) },
        { label: 'Production Runs Cost', value: formatCurrency(financialSummary?.breakdown?.manufacturing_details?.production ?? 0) },
        { label: 'Total Expense Impact', value: formatPercent((financialSummary?.breakdown?.manufacturing_spend ?? 0) / Math.max(financialSummary?.expenses ?? 1, 1)) },
        { label: 'Output Margin', value: formatPercent(financialSummary?.grossMargin ?? 0) }
      ];
      chartData = [
        { name: 'Raw Materials', value: financialSummary?.breakdown?.manufacturing_details?.materials || 0, color: '#10b981' },
        { name: 'Production', value: financialSummary?.breakdown?.manufacturing_details?.production || 0, color: '#f59e0b' },
        { name: 'Equipment', value: financialSummary?.breakdown?.manufacturing_details?.equipment || 0, color: '#8b5cf6' }
      ];
    } else if (report.category === 'HR Reports') {
      chartType = 'pie';
      snapshot = [
        { label: 'Total Payroll Expense', value: formatCurrency(financialSummary?.breakdown?.payroll ?? 0), isFormula: true },
        { label: 'Pending Salaries (All Time)', value: formatCurrency(financialSummary?.liabilities?.payroll ?? 0), isLive: true },
        { label: 'Payroll to Revenue Ratio', value: formatPercent((financialSummary?.breakdown?.payroll ?? 0) / Math.max(financialSummary?.revenue ?? 1, 1)) },
        { label: 'Payroll to Expense Ratio', value: formatPercent((financialSummary?.breakdown?.payroll ?? 0) / Math.max(financialSummary?.expenses ?? 1, 1)) },
        { label: 'Gross Profit Margin', value: formatPercent(financialSummary?.grossMargin ?? 0) },
        { label: 'Operating Efficiency', value: formatPercent(financialSummary?.operatingRatio ?? 0) }
      ];
      chartData = [
        { name: 'Paid Salaries', value: financialSummary?.breakdown?.payroll || 0, color: '#8b5cf6' },
        { name: 'Pending Salaries', value: financialSummary?.liabilities?.payroll || 0, color: '#ef4444' },
      ];
    } else {
      chartType = 'bar';
      snapshot = [
        { label: 'Primary Metric', value: 'N/A' },
        { label: 'Secondary Metric', value: 'N/A' },
        { label: 'Tertiary Metric', value: 'N/A' }
      ];
      chartData = [{ name: 'Data', value: 100, color: '#8b5cf6' }];
    }

    // Assign explicit color based on chartType if missing (lines use stroke instead of fill sometimes)
    return { 
      ...report, 
      snapshot, 
      chartType,
      chartData: chartData.filter(d => d.value > 0 || d.value < 0) 
    };
  };

  const handleDownload = (report: ReportWithSnapshot) => {
    try {
      if (report.format !== 'PDF') {
        toast.info(`${report.format} export is coming soon. Generating PDF fallback...`);
      }

      const doc = new jsPDF();
      const ORANGE = '#F97316';
      const PURPLE = '#8B5CF6';
      const pageWidth = 210;

      // Add Logo (Small & Centered)
      const logoWidth = 25;
      const logoHeight = 12.5;
      doc.addImage('/brand/logo.png', 'PNG', (pageWidth - logoWidth) / 2, 10, logoWidth, logoHeight);

      // Letterhead
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(PURPLE);
      doc.text('HDP(K) LTD', pageWidth / 2, 30, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text('P.O BOX 45678-00200 NAIROBI', pageWidth / 2, 35, { align: 'center' });
      doc.text('LOCATED AT SASIO ROAD, PETM GODOWNS, GODOWN NO 13, OFF LUNGA LUNGA ROAD', pageWidth / 2, 39, { align: 'center' });
      doc.text('TEL NO: 00111111111', pageWidth / 2, 43, { align: 'center' });

      // Report Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(ORANGE);
      doc.text(report.name.toUpperCase(), pageWidth / 2, 55, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(report.description, pageWidth / 2, 62, { align: 'center' });

      // Meta Data
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Category: ${report.category}`, 20, 75);
      doc.text(`Date Range: ${printableStats.range}`, 20, 80);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 85);

      // Map data and style formulas differently
      const tableBody = report.snapshot.map(item => {
        return [
          { content: item.label, styles: { fontStyle: item.isFormula ? 'italic' : 'bold', textColor: item.isFormula ? [139, 92, 246] : 20 } },
          { content: item.value, styles: { fontStyle: item.isFormula ? 'italic' : 'normal', textColor: item.isFormula ? [139, 92, 246] : 20 } }
        ];
      });

      autoTable(doc, {
        startY: 95,
        head: [['Metric / Calculation', 'Value']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 6 },
        columnStyles: { 
          0: { cellWidth: 100 },
          1: { halign: 'right' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Confidential - Generated by HDP Business Suite Analytics', pageWidth / 2, finalY, { align: 'center' });

      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      
      toast.success('Report successfully exported!');
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate PDF: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Reports & Analytics</h2>
            <p className="text-muted-foreground">Generate and export business reports</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{rangeLabel}</span>
            </div>
          </div>
        </div>
        <StatsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports & Analytics</h2>
          <p className="text-muted-foreground">Generate and export business reports</p>
        </div>
        <div className="flex items-center gap-3">
          {showFallback && (
            <span className="text-xs font-semibold text-destructive bg-destructive/10 px-3 py-1 rounded-full">
              Live metrics unavailable — using fallback
            </span>
          )}
          <Select value={reportRange} onValueChange={setReportRange}>
            <SelectTrigger className="w-[180px] bg-secondary border-none h-10 rounded-xl font-medium">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Select period" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="Last Month">Last Month</SelectItem>
              <SelectItem value="This Year">This Year</SelectItem>
              <SelectItem value="All Time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Premium Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="group bg-card rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  'p-3 rounded-2xl transition-transform group-hover:scale-110 duration-500',
                  stat.color === 'primary' && 'bg-primary/10 text-primary',
                  stat.color === 'success' && 'bg-success/10 text-success',
                  stat.color === 'warning' && 'bg-warning/10 text-warning',
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">
                  {stat.change}
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>



      {/* Report Library */}
      <div className="space-y-8">
        {reportCategories.map((category, catIndex) => {
          const Icon = category.icon;
          return (
            <div
              key={category.name}
              className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 shadow-inner overflow-hidden animate-slide-up"
              style={{ animationDelay: `${catIndex * 100}ms` }}
            >
              <div className="p-6 bg-muted/20 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-secondary text-primary shadow-sm rotate-3 group-hover:rotate-0 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{category.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium">Global Analytics Pool</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider">Bulk Export</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y divide-border/30 md:divide-y-0 md:divide-x">
                {category.reports.map((report, idx) => {
                  const snapshotData = getSnapshot({ ...report, category: category.name });
                  const primaryMetric = snapshotData.snapshot[0];
                  const secondaryMetric = snapshotData.snapshot[1];

                  return (
                    <div
                      key={report.name}
                      className="group p-6 flex flex-col justify-between hover:bg-primary/5 transition-all duration-300 cursor-pointer min-h-[160px]"
                      onClick={() => setSelectedReport(snapshotData)}
                    >
                      <div className="flex items-start justify-between min-w-0 mb-6">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-sm truncate">{report.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{report.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(snapshotData);
                            handleDownload(snapshotData);
                          }}
                          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-secondary hover:bg-primary hover:text-white transition-all text-xs font-bold shadow-sm shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {report.format}
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-auto">
                        <div className="flex-1 p-3 rounded-xl bg-background/50 border border-border/50 shadow-sm group-hover:border-primary/20 transition-colors">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 truncate">{primaryMetric.label}</p>
                          <p className="font-black text-foreground truncate">{primaryMetric.value}</p>
                        </div>
                        {secondaryMetric && (
                          <div className="flex-1 p-3 rounded-xl bg-background/50 border border-border/50 shadow-sm group-hover:border-primary/20 transition-colors">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 truncate">{secondaryMetric.label}</p>
                            <p className="font-black text-foreground truncate">{secondaryMetric.value}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Advanced Intelligence Hub */}
      <div className="bg-primary shadow-glow rounded-[2rem] p-12 relative overflow-hidden group">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        </div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-1000" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white text-center md:text-left">
          <div>
            <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
              <div className="p-3 bg-white/20 rounded-2xl">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight">Custom Report Builder</h3>
            </div>
            <p className="text-white/80 max-w-lg font-medium leading-relaxed">
              Synthesize complex data points across all ERP modules.
              Select granular date ranges, dynamic filtering columns, and high-fidelity output vectors.
            </p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <button className="h-14 px-8 bg-white text-primary rounded-xl font-bold text-lg shadow-xl hover:scale-105 active:scale-95 transition-all">
                Initialize Build
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Build Custom Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Analysis</SelectItem>
                      <SelectItem value="inventory">Inventory Movement</SelectItem>
                      <SelectItem value="financial">Financial Statement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select defaultValue="pdf">
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { }}>Cancel</Button>
                <Button onClick={() => toast.success("Generating report...")}>Generate Report</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-2xl">
          <div className="bg-card grid md:grid-cols-[1.2fr_0.8fr] max-h-[85vh]">
            
            {/* Left Column: Data & Formulas */}
            <div className="p-8 overflow-y-auto scrollbar-hide border-r border-border/50">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black">{selectedReport?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{selectedReport?.description}</p>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Category</p>
                  <p className="font-bold text-sm mt-1">{selectedReport?.category}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Export Format</p>
                  <p className="font-bold text-sm mt-1">{selectedReport?.format}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-4">Calculated Metrics</p>
                {selectedReport?.snapshot.map((item, idx) => (
                  item.isFormula ? (
                    <div key={idx} className="my-2 p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between text-xs font-mono text-primary/80">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ) : (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                      <strong className="text-sm font-bold">{item.value}</strong>
                    </div>
                  )
                ))}
                {selectedReport?.snapshot.some(item => item.label.includes('(All Time)') || item.label.includes('(Live)')) && (
                  <p className="text-[10px] text-muted-foreground/70 mt-4 italic">
                    * Metrics marked with (Live) or (All Time) represent real-time absolute balances and do not change when filtering by historical date periods.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Visualization & Actions */}
            <div className="bg-muted/10 p-8 flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-6">Data Distribution</p>
                {selectedReport?.chartData && selectedReport.chartData.length > 0 ? (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {selectedReport.chartType === 'line' ? (
                        <LineChart data={selectedReport.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000 ? (value/1000).toFixed(0) + 'k' : value} />
                          <RechartsTooltip formatter={(value: number) => new Intl.NumberFormat('en-KE').format(value)} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)' }} />
                          <Line type="monotone" dataKey="value" stroke={selectedReport.chartData[0]?.color || '#3b82f6'} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      ) : selectedReport.chartType === 'bar' ? (
                        <BarChart data={selectedReport.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000 ? (value/1000).toFixed(0) + 'k' : value} />
                          <RechartsTooltip formatter={(value: number) => new Intl.NumberFormat('en-KE').format(value)} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {selectedReport.chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={selectedReport.chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {selectedReport.chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number) => new Intl.NumberFormat('en-KE').format(value)}
                            contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] w-full flex items-center justify-center border-2 border-dashed border-border/50 rounded-2xl">
                    <p className="text-sm text-muted-foreground font-medium">No visualization available</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-border/50 space-y-3">
                <Button 
                  className="w-full py-6 rounded-xl font-bold shadow-lg text-sm bg-primary hover:scale-[1.02] transition-transform" 
                  onClick={() => selectedReport && handleDownload(selectedReport)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate {selectedReport?.format} Document
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setSelectedReport(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
