import { 
  ClipboardCheck,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  DollarSign,
  Package,
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

const auditLogs = [
  { id: 'AUD-001', action: 'Stock Adjustment', details: 'Industrial Detergent 20L: -5 units (damaged)', user: 'John Kamau', timestamp: '2024-01-20 14:32', type: 'stock', status: 'pending_review' },
  { id: 'AUD-002', action: 'Cash Variance', details: 'Till shortage of KES 2,500', user: 'Peter Ochieng', timestamp: '2024-01-20 12:15', type: 'money', status: 'explained' },
  { id: 'AUD-003', action: 'Production Loss', details: 'Wastage: 15kg raw material', user: 'David Mwangi', timestamp: '2024-01-20 10:45', type: 'production', status: 'resolved' },
  { id: 'AUD-004', action: 'Credit Override', details: 'Extended credit limit for Nakumatt: KES 100,000', user: 'Mary Wanjiku', timestamp: '2024-01-19 16:20', type: 'money', status: 'approved' },
  { id: 'AUD-005', action: 'Stock Count Variance', details: 'Floor Polish: +8 units (found)', user: 'Grace Akinyi', timestamp: '2024-01-19 09:30', type: 'stock', status: 'resolved' },
];

const monthlyAudit = {
  totalDiscrepancies: 12,
  resolved: 9,
  pending: 3,
  totalLossValue: 45000,
  recoveredValue: 28000,
};

export default function Audit() {
  const stats = [
    {
      title: 'Total Audit Items',
      value: monthlyAudit.totalDiscrepancies,
      icon: ClipboardCheck,
      color: 'primary',
    },
    {
      title: 'Resolved',
      value: monthlyAudit.resolved,
      icon: CheckCircle,
      color: 'success',
    },
    {
      title: 'Pending Review',
      value: monthlyAudit.pending,
      icon: Clock,
      color: 'warning',
    },
    {
      title: 'Net Loss',
      value: formatCurrency(monthlyAudit.totalLossValue - monthlyAudit.recoveredValue),
      icon: AlertTriangle,
      color: 'destructive',
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stock': return Package;
      case 'money': return DollarSign;
      case 'production': return Factory;
      default: return FileText;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'resolved': return 'badge-success';
      case 'approved': return 'badge-success';
      case 'explained': return 'bg-primary/10 text-primary';
      case 'pending_review': return 'badge-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'p-3 rounded-xl',
                  stat.color === 'primary' && 'bg-primary/10 text-primary',
                  stat.color === 'success' && 'bg-success/10 text-success',
                  stat.color === 'warning' && 'bg-warning/10 text-warning',
                  stat.color === 'destructive' && 'bg-destructive/10 text-destructive',
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search audit logs..."
            className="input-field pl-11"
          />
        </div>
        <select className="input-field max-w-[150px]">
          <option value="all">All Types</option>
          <option value="stock">Stock</option>
          <option value="money">Money</option>
          <option value="production">Production</option>
        </select>
        <select className="input-field max-w-[150px]">
          <option value="all">All Status</option>
          <option value="pending_review">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="explained">Explained</option>
        </select>
      </div>

      {/* Audit Trail */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Audit Trail</h3>
        </div>
        <div className="divide-y divide-border">
          {auditLogs.map((log, index) => {
            const TypeIcon = getTypeIcon(log.type);
            return (
              <div
                key={log.id}
                className="p-6 hover:bg-muted/30 transition-colors animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'p-3 rounded-xl',
                    log.type === 'stock' && 'bg-primary/10 text-primary',
                    log.type === 'money' && 'bg-warning/10 text-warning',
                    log.type === 'production' && 'bg-success/10 text-success',
                  )}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{log.action}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                      </div>
                      <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', getStatusStyle(log.status))}>
                        {log.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span>{log.id}</span>
                      <span>•</span>
                      <span>{log.user}</span>
                      <span>•</span>
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Loss Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
              <span className="text-muted-foreground">Total Loss Value</span>
              <span className="font-bold text-destructive">{formatCurrency(monthlyAudit.totalLossValue)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-success/5 rounded-lg">
              <span className="text-muted-foreground">Recovered Value</span>
              <span className="font-bold text-success">{formatCurrency(monthlyAudit.recoveredValue)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-warning/5 rounded-lg border-t border-border">
              <span className="font-medium text-foreground">Net Loss</span>
              <span className="font-bold text-warning">{formatCurrency(monthlyAudit.totalLossValue - monthlyAudit.recoveredValue)}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Audit Actions</h3>
          <div className="space-y-3">
            <button className="w-full p-4 bg-muted/30 rounded-xl text-left hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Initiate Stock Audit</p>
                  <p className="text-sm text-muted-foreground">Start a new inventory count</p>
                </div>
              </div>
            </button>
            <button className="w-full p-4 bg-muted/30 rounded-xl text-left hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-foreground">Cash Reconciliation</p>
                  <p className="text-sm text-muted-foreground">Verify till balances</p>
                </div>
              </div>
            </button>
            <button className="w-full p-4 bg-muted/30 rounded-xl text-left hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">Generate Report</p>
                  <p className="text-sm text-muted-foreground">Export audit summary</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
