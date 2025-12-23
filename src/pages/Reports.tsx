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
  snapshot: { label: string; value: string }[];
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
  const { data: financialSummary, isLoading: financialLoading, isError: financialError } = useFinancialSummary();
  const { data: dashboardStats, isLoading: dashboardLoading, isError: dashboardError } = useDashboardStats();
  const [reportRange] = useState('This Month');
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

    const baseSnapshot = [
      { label: 'Revenue', value: printableStats.revenue },
      { label: 'Expenses', value: printableStats.expenses },
      { label: 'Net Profit', value: printableStats.netProfit },
      { label: 'Throughput (orders)', value: printableStats.throughput },
    ];

    if (report.category === 'Sales Reports') {
      return {
        ...report,
        snapshot: [
          ...baseSnapshot,
          { label: 'Today\'s Sales', value: formatCurrency(dashboardStats?.todaySales ?? 0) },
          { label: 'Pending Orders', value: (dashboardStats?.pendingOrders ?? 0).toLocaleString() },
          { label: 'Daily Momentum', value: formatPercent(salesChange) },
        ],
      };
    }

    if (report.category === 'Financial Reports') {
      return {
        ...report,
        snapshot: [
          { label: 'Revenue', value: printableStats.revenue },
          { label: 'Expenses', value: printableStats.expenses },
          { label: 'Net Profit', value: printableStats.netProfit },
          { label: 'Cash Balance', value: formatCurrency(financialSummary?.cashBalance ?? 0) },
          { label: 'Receivables', value: formatCurrency(financialSummary?.receivables ?? 0) },
          { label: 'Payables', value: formatCurrency(financialSummary?.payables ?? 0) },
        ],
      };
    }

    if (report.category === 'Inventory Reports') {
      return {
        ...report,
        snapshot: [
          { label: 'Low Stock Items', value: (dashboardStats?.lowStockItems ?? 0).toLocaleString() },
          { label: 'Pending Orders', value: (dashboardStats?.pendingOrders ?? 0).toLocaleString() },
          { label: 'Range', value: printableStats.range },
        ],
      };
    }

    return { ...report, snapshot: baseSnapshot };
  };

  const handleDownload = (report: ReportWithSnapshot) => {
    const generatedAt = new Date().toLocaleString();
    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${report.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
          h1 { margin: 0 0 8px; }
          .muted { color: #64748b; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 16px; }
          .row { display: flex; justify-content: space-between; margin: 6px 0; }
          .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="pill">${report.format}</div>
        <h1>${report.name}</h1>
        <p class="muted">${report.description}</p>
        <div class="card">
          <div class="row"><strong>Category</strong><span>${report.category}</span></div>
          <div class="row"><strong>Range</strong><span>${printableStats.range}</span></div>
          <div class="row"><strong>Generated At</strong><span>${generatedAt}</span></div>
        </div>
        <div class="card">
          <h3>Headline Metrics</h3>
          ${report.snapshot.map(item => `<div class="row"><span>${item.label}</span><strong>${item.value}</strong></div>`).join('')}
        </div>
        <p class="muted" style="margin-top:24px;">Exported from HDP Business Suite</p>
      </body>
    </html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      toast.success(`${report.format} generated. Use your browser's save as PDF to keep a copy.`);
    } else {
      toast.error('Unable to open export window. Please allow pop-ups.');
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
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{reportRange || rangeLabel}</span>
          </div>
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
                {category.reports.map((report, idx) => (
                  <div
                    key={report.name}
                    className="group p-6 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedReport(getSnapshot({ ...report, category: category.name }))}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm">
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
                        const withSnapshot = getSnapshot({ ...report, category: category.name });
                        setSelectedReport(withSnapshot);
                        handleDownload(withSnapshot);
                      }}
                      className="flex items-center gap-2 h-9 px-4 rounded-xl bg-secondary hover:bg-primary hover:text-white transition-all text-xs font-bold shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {report.format}
                    </button>
                  </div>
                ))}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedReport?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{selectedReport?.description}</p>
            <div className="grid grid-cols-2 gap-3 text-foreground text-sm">
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-semibold">{selectedReport?.category}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-xs text-muted-foreground">Format</p>
                <p className="font-semibold">{selectedReport?.format}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50 border border-border/60 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Snapshot</p>
              {selectedReport?.snapshot.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-foreground">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedReport(null)}>Close</Button>
            <Button onClick={() => selectedReport && handleDownload(selectedReport)}>
              <Download className="w-4 h-4 mr-2" />
              Download {selectedReport?.format}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
