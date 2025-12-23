import { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Wallet,
  Package,
  Factory,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuditLogs, AuditEntry, AuditStatus, AuditType } from '@/hooks/useAudit';
import { FilterBarSkeleton, StatsSkeleton } from '@/components/loading/PageSkeletons';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const fallbackLogs: AuditEntry[] = [
  {
    id: 'AUD-001',
    action: 'Stock Adjustment',
    details: 'Industrial Detergent 20L: -5 units (damaged)',
    user: 'John Kamau',
    timestamp: '2024-01-20 14:32',
    type: 'stock',
    status: 'resolved',
    lossValue: 6500,
    recoveredValue: 4000,
    reference: 'INV-4401',
  },
  {
    id: 'AUD-002',
    action: 'Cash Variance',
    details: 'Till shortage of KES 2,500',
    user: 'Peter Ochieng',
    timestamp: '2024-01-20 12:15',
    type: 'money',
    status: 'explained',
    lossValue: 2000,
    recoveredValue: 500,
    reference: 'TILL-22',
  },
  {
    id: 'AUD-003',
    action: 'Production Loss',
    details: 'Wastage: 15kg raw material',
    user: 'David Mwangi',
    timestamp: '2024-01-20 10:45',
    type: 'production',
    status: 'resolved',
    lossValue: 4800,
    recoveredValue: 3000,
    reference: 'BATCH-3109',
  },
  {
    id: 'AUD-004',
    action: 'Credit Override',
    details: 'Extended credit limit for Nakumatt: KES 100,000',
    user: 'Mary Wanjiku',
    timestamp: '2024-01-19 16:20',
    type: 'money',
    status: 'approved',
    lossValue: 8000,
    recoveredValue: 5000,
    reference: 'ACC-884',
  },
  {
    id: 'AUD-005',
    action: 'Stock Count Variance',
    details: 'Floor Polish: +8 units (found)',
    user: 'Grace Akinyi',
    timestamp: '2024-01-19 09:30',
    type: 'stock',
    status: 'resolved',
    lossValue: 800,
    recoveredValue: 700,
    reference: 'AUDIT-9007',
  },
  {
    id: 'AUD-006',
    action: 'Unposted Transfer',
    details: 'Raw material transfer missing receiving signature',
    user: 'Brian Otieno',
    timestamp: '2024-01-18 18:05',
    type: 'stock',
    status: 'pending_review',
    lossValue: 2800,
    recoveredValue: 1700,
    reference: 'TRF-221',
  },
  {
    id: 'AUD-007',
    action: 'Unauthorized Discount',
    details: '15% override on POS - receipt #3321',
    user: 'Lucy Waweru',
    timestamp: '2024-01-18 15:20',
    type: 'money',
    status: 'resolved',
    lossValue: 1500,
    recoveredValue: 1200,
    reference: 'POS-3321',
  },
  {
    id: 'AUD-008',
    action: 'Damaged Packaging',
    details: 'Returned cartons from distributor - write-off pending',
    user: 'Samuel Kariuki',
    timestamp: '2024-01-18 11:42',
    type: 'stock',
    status: 'pending_review',
    lossValue: 3800,
    recoveredValue: 2600,
    reference: 'RET-108',
  },
  {
    id: 'AUD-009',
    action: 'Inventory Reconciliation',
    details: 'Cycle count on fast movers',
    user: 'Ann Mwikali',
    timestamp: '2024-01-17 17:05',
    type: 'stock',
    status: 'approved',
    lossValue: 3600,
    recoveredValue: 3000,
    reference: 'CC-441',
  },
  {
    id: 'AUD-010',
    action: 'Production Downtime',
    details: 'Unexpected mixer shutdown - 2 hours idle time',
    user: 'Kevin Mutua',
    timestamp: '2024-01-17 13:40',
    type: 'production',
    status: 'pending_review',
    lossValue: 4600,
    recoveredValue: 3200,
    reference: 'PRD-77',
  },
  {
    id: 'AUD-011',
    action: 'Payroll Adjustment',
    details: 'Overtime reclassification',
    user: 'Claire Nyambura',
    timestamp: '2024-01-16 18:10',
    type: 'money',
    status: 'resolved',
    lossValue: 2800,
    recoveredValue: 2000,
    reference: 'PAY-141',
  },
  {
    id: 'AUD-012',
    action: 'Credit Note Reissue',
    details: 'Customer requested reissue after pricing error',
    user: 'Felix Kiptoo',
    timestamp: '2024-01-16 09:25',
    type: 'money',
    status: 'explained',
    lossValue: 3800,
    recoveredValue: 1100,
    reference: 'CN-9921',
  },
];

const resolvedStatuses: AuditStatus[] = ['resolved', 'approved', 'explained'];

export default function Audit() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AuditType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AuditStatus>('all');

  const { data: liveLogs = [], isLoading, isError } = useAuditLogs();
  const sourceLogs = isError ? fallbackLogs : liveLogs;

  const filteredLogs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return sourceLogs.filter((log) => {
      const matchesSearch = !query || [
        log.id,
        log.action,
        log.details,
        log.user,
        log.reference || '',
      ].some(value => value.toLowerCase().includes(query));

      const matchesType = typeFilter === 'all' || log.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, sourceLogs, statusFilter, typeFilter]);

  const monthlyAudit = useMemo(() => {
    const totals = filteredLogs.reduce((acc, log) => {
      acc.totalDiscrepancies += 1;
      if (log.status === 'pending_review') acc.pending += 1;
      if (resolvedStatuses.includes(log.status)) acc.resolved += 1;
      acc.totalLossValue += log.lossValue || 0;
      acc.recoveredValue += log.recoveredValue || 0;
      return acc;
    }, {
      totalDiscrepancies: 0,
      resolved: 0,
      pending: 0,
      totalLossValue: 0,
      recoveredValue: 0,
    });

    return totals;
  }, [filteredLogs]);

  if (isLoading && liveLogs.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <StatsSkeleton />
        <FilterBarSkeleton pills={2} />
      </div>
    );
  }

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
      value: formatCurrency(Math.max(monthlyAudit.totalLossValue - monthlyAudit.recoveredValue, 0)),
      icon: AlertTriangle,
      color: 'destructive',
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stock': return Package;
      case 'money': return Wallet;
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-11"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AuditType | 'all')}
          className="input-field max-w-[150px]"
        >
          <option value="all">All Types</option>
          <option value="stock">Stock</option>
          <option value="money">Money</option>
          <option value="production">Production</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AuditStatus | 'all')}
          className="input-field max-w-[150px]"
        >
          <option value="all">All Status</option>
          <option value="pending_review">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="explained">Explained</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {/* Audit Trail */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Audit Trail</h3>
            {isError && (
              <span className="text-xs font-medium text-destructive bg-destructive/10 px-3 py-1 rounded-full">
                Live data unavailable – showing fallback
              </span>
            )}
          </div>
        </div>
        <div className="divide-y divide-border">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Search className="w-6 h-6 mx-auto text-muted-foreground/60" />
              <p>No audit records match your filters.</p>
              <p className="text-sm">Try clearing the search or changing the type/status.</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
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
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                        <span>{log.id}</span>
                        {log.reference && (
                          <>
                            <span>•</span>
                            <span>{log.reference}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{log.user}</span>
                        <span>•</span>
                        <span>{log.timestamp}</span>
                        {(log.lossValue || log.recoveredValue) && (
                          <>
                            <span>•</span>
                            <span className="text-destructive font-medium">
                              {formatCurrency(log.lossValue || 0)}
                            </span>
                            <span className="text-success font-medium">
                              +{formatCurrency(log.recoveredValue || 0)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
              <span className="font-bold text-warning">{formatCurrency(Math.max(monthlyAudit.totalLossValue - monthlyAudit.recoveredValue, 0))}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Audit Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => {
                setTypeFilter('stock');
                setStatusFilter('pending_review');
              }}
              className="w-full p-4 bg-muted/30 rounded-xl text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Initiate Stock Audit</p>
                  <p className="text-sm text-muted-foreground">Start a new inventory count</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setTypeFilter('money')}
              className="w-full p-4 bg-muted/30 rounded-xl text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-foreground">Cash Reconciliation</p>
                  <p className="text-sm text-muted-foreground">Verify till balances</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="w-full p-4 bg-muted/30 rounded-xl text-left hover:bg-muted/50 transition-colors"
            >
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
