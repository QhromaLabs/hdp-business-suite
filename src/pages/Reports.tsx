import { 
  BarChart3,
  TrendingUp,
  Download,
  FileText,
  Calendar,
  DollarSign,
  Package,
  Users,
  Factory,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const reportCategories = [
  {
    name: 'Sales Reports',
    icon: DollarSign,
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
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports & Analytics</h2>
          <p className="text-muted-foreground">Generate and export business reports</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">January 2024</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: formatCurrency(4850000), change: '+12.5%', positive: true },
          { label: 'Expenses', value: formatCurrency(2890000), change: '+8.2%', positive: false },
          { label: 'Net Profit', value: formatCurrency(1960000), change: '+15.8%', positive: true },
          { label: 'Orders', value: '1,245', change: '+22.1%', positive: true },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <span className={cn(
                'text-xs font-medium',
                stat.positive ? 'text-success' : 'text-destructive'
              )}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Report Categories */}
      <div className="space-y-6">
        {reportCategories.map((category, catIndex) => {
          const Icon = category.icon;
          return (
            <div
              key={category.name}
              className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up"
              style={{ animationDelay: `${catIndex * 100}ms` }}
            >
              <div className="p-4 bg-muted/30 border-b border-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{category.name}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                {category.reports.map((report) => (
                  <div
                    key={report.name}
                    className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{report.name}</p>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium text-secondary-foreground transition-colors">
                      <Download className="w-4 h-4" />
                      {report.format}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Report Builder */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Custom Report Builder</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Create custom reports by selecting data points, date ranges, and export formats.
        </p>
        <button className="btn-primary">
          Build Custom Report
        </button>
      </div>
    </div>
  );
}
