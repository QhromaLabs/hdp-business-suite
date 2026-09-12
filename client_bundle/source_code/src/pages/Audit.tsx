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
  Eye,
  TrendingUp,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuditLogs, AuditEntry, AuditStatus, AuditType } from '@/hooks/useAudit';
import { FilterBarSkeleton, StatsSkeleton } from '@/components/loading/PageSkeletons';
import AuditDetailsModal from '@/components/audit/AuditDetailsModal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'CRITICAL' | 'WARNING' | 'INFO'>('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedChartDate, setSelectedChartDate] = useState<string | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null);

  const { data: liveLogs = [], isLoading, isError } = useAuditLogs();
  
  const sourceLogs = useMemo(() => {
    if (!isError && liveLogs.length > 0) return liveLogs;
    
    // Distribute fallback logs across the last 14 days so date filters work
    const now = new Date().getTime();
    return fallbackLogs.map((log, i) => {
      const daysAgo = Math.floor(i * 1.5); 
      const simulatedDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      return {
        ...log,
        timestamp: simulatedDate.toISOString()
      };
    });
  }, [isError, liveLogs]);

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

      const logDate = new Date(log.timestamp);
      const now = new Date();
      let matchesDate = true;
      if (dateFilter === '7d') {
        matchesDate = (now.getTime() - logDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      } else if (dateFilter === '30d') {
        matchesDate = (now.getTime() - logDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      }

      const logDateString = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const matchesChartDate = !selectedChartDate || logDateString === selectedChartDate;
      const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;

      return matchesSearch && matchesType && matchesStatus && matchesDate && matchesChartDate && matchesSeverity;
    });
  }, [searchQuery, sourceLogs, statusFilter, typeFilter, dateFilter, selectedChartDate, severityFilter]);

  const monthlyAudit = useMemo(() => {
    const totals = filteredLogs.reduce((acc, log) => {
      acc.totalDiscrepancies += 1;
      if (log.status === 'pending_review') acc.pending += 1;
      if (resolvedStatuses.includes(log.status)) acc.resolved += 1;
      acc.totalLossValue += log.lossValue || 0;
      acc.recoveredValue += log.recoveredValue || 0;

      if (log.type === 'stock') acc.stockEvents += 1;
      if (log.type === 'money') acc.financialEvents += 1;
      if (log.severity === 'CRITICAL') acc.criticalEvents += 1;
      
      return acc;
    }, {
      totalDiscrepancies: 0,
      resolved: 0,
      pending: 0,
      totalLossValue: 0,
      recoveredValue: 0,
      stockEvents: 0,
      financialEvents: 0,
      criticalEvents: 0,
    });

    return totals;
  }, [filteredLogs]);

  const anomalyTrend = useMemo(() => {
    // Generate a simple trend array based on timestamp
    const grouped = [...filteredLogs].reverse().reduce((acc, log) => {
      const dateObj = new Date(log.timestamp);
      const groupKey = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      
      if (!acc[groupKey]) acc[groupKey] = { date: groupKey, anomalies: 0, resolved: 0, timestamp: dateObj.getTime() };
      acc[groupKey].anomalies += 1;
      if (resolvedStatuses.includes(log.status)) acc[groupKey].resolved += 1;
      return acc;
    }, {} as Record<string, any>);
    
    // Sort by timestamp to ensure chronological order regardless of string key, then take last 14
    return Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp).slice(-14);
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
      breakdown: (
        <div className="flex flex-col gap-1 mt-4 text-[11px] font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1.5 text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            {monthlyAudit.stockEvents} stock events
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground ml-3">
            ↳ {monthlyAudit.financialEvents} financial events
          </span>
        </div>
      )
    },
    {
      title: 'Resolved',
      value: monthlyAudit.resolved,
      icon: CheckCircle,
      color: 'success',
      breakdown: (
        <div className="flex flex-col gap-1 mt-4 text-[11px] font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1.5 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
            {monthlyAudit.totalDiscrepancies > 0 ? Math.round((monthlyAudit.resolved / monthlyAudit.totalDiscrepancies) * 100) : 0}% clearance rate
          </span>
        </div>
      )
    },
    {
      title: 'Pending Review',
      value: monthlyAudit.pending,
      icon: Clock,
      color: 'warning',
      breakdown: (
        <div 
          className="flex flex-col gap-1 mt-4 text-[11px] font-semibold opacity-80 transition-opacity cursor-pointer group-hover:opacity-100 hover:opacity-100"
          onClick={() => {
            setSeverityFilter('CRITICAL');
            setStatusFilter('pending_review');
          }}
        >
          <span className="flex items-center gap-1.5 text-warning hover:underline">
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse"></span>
            {monthlyAudit.criticalEvents} critical events pending
          </span>
        </div>
      )
    },
    {
      title: 'Net Loss',
      value: formatCurrency(Math.max(monthlyAudit.totalLossValue - monthlyAudit.recoveredValue, 0)),
      icon: AlertTriangle,
      color: 'destructive',
      breakdown: (
        <div className="flex flex-col gap-1 mt-4 text-[11px] font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1.5 text-destructive">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"></span>
            {formatCurrency(monthlyAudit.totalLossValue)} gross loss
          </span>
          {monthlyAudit.recoveredValue > 0 && (
            <span className="flex items-center gap-1.5 text-success ml-3">
              ↳ {formatCurrency(monthlyAudit.recoveredValue)} recovered
            </span>
          )}
        </div>
      )
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
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Global Filter Bar */}
      <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 p-4 shadow-inner flex flex-wrap items-center justify-between gap-4 animate-slide-up">
        <div className="flex flex-wrap items-center gap-4">
          {/* Module Filter */}
          <div className="flex bg-muted/30 p-1 rounded-xl border border-border/40">
            {['all', 'stock', 'money', 'production'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type as any)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  typeFilter === type ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {type === 'all' ? 'All Modules' : type === 'stock' ? 'Inventory' : type === 'money' ? 'Financial' : 'Production'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex bg-muted/30 p-1 rounded-xl border border-border/40">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'pending_review', label: 'Pending' },
              { id: 'resolved', label: 'Resolved' }
            ].map((status) => (
              <button
                key={status.id}
                onClick={() => setStatusFilter(status.id as any)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  statusFilter === status.id ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter & Advanced Filters */}
        <div className="flex items-center gap-3">
          <div className="flex bg-muted/30 p-1 rounded-xl border border-border/40">
            {[
              { id: 'all', label: 'All Time' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '7d', label: 'Last 7 Days' }
            ].map((date) => (
              <button
                key={date.id}
                onClick={() => setDateFilter(date.id as any)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  dateFilter === date.id ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {date.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={cn(
              "flex items-center justify-center gap-2 px-4 h-[36px] bg-card border border-border/50 rounded-xl text-sm font-bold tracking-tight transition-colors shadow-sm",
              severityFilter !== 'all' ? "bg-primary/20 text-primary border-primary/50" : "text-foreground hover:bg-muted/50"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Forensic Actions Top Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setTypeFilter('all');
            setSeverityFilter('all');
          }}
          className={cn(
            "p-4 rounded-xl text-left transition-all border flex items-center justify-between",
            typeFilter === 'all' && statusFilter === 'all' && severityFilter === 'all' && searchQuery === ''
              ? "bg-success/10 border-success/30 shadow-sm ring-1 ring-success/20"
              : "bg-card/40 backdrop-blur-md border-border/50 hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-success/10 rounded-lg text-success">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-foreground">Generate Report</p>
              <p className="text-xs text-muted-foreground mt-0.5">Export audit summary</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => {
            setTypeFilter('stock');
          }}
          className={cn(
            "p-4 rounded-xl text-left transition-all border flex items-center justify-between",
            typeFilter === 'stock'
              ? "bg-primary/10 border-primary/30 shadow-sm ring-1 ring-primary/20"
              : "bg-card/40 backdrop-blur-md border-border/50 hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-foreground">Initiate Stock Audit</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start a new inventory count</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setTypeFilter('money')}
          className={cn(
            "p-4 rounded-xl text-left transition-all border flex items-center justify-between",
            typeFilter === 'money'
              ? "bg-warning/10 border-warning/30 shadow-sm ring-1 ring-warning/20"
              : "bg-card/40 backdrop-blur-md border-border/50 hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-warning/10 rounded-lg text-warning">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-foreground">Cash Reconciliation</p>
              <p className="text-xs text-muted-foreground mt-0.5">Verify till balances</p>
            </div>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="group bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-inner animate-slide-up hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'p-4 rounded-2xl shadow-sm transition-all duration-300',
                  stat.color === 'primary' && 'bg-primary/10 text-primary group-hover:bg-primary/20',
                  stat.color === 'success' && 'bg-success/10 text-success group-hover:bg-success/20',
                  stat.color === 'warning' && 'bg-warning/10 text-warning group-hover:bg-warning/20',
                  stat.color === 'destructive' && 'bg-destructive/10 text-destructive group-hover:bg-destructive/20',
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-black text-foreground tracking-tight">{stat.value}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">{stat.title}</p>
                </div>
              </div>
              {stat.breakdown && stat.breakdown}
            </div>
          );
        })}
      </div>

      <div className="space-y-6">
          {/* Anomaly Trend Chart */}
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-inner h-[280px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Risk Frequency Trend</h3>
                <p className="text-xs text-muted-foreground">Volume of anomalies detected over time</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">Live Sync</span>
            </div>
            <div className="flex-1 w-full min-h-0">
              {anomalyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={anomalyTrend} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    onClick={(e) => {
                      if (e && e.activeLabel) {
                        setSelectedChartDate(e.activeLabel === selectedChartDate ? null : e.activeLabel as string);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <defs>
                      <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="anomalies" name="Total Detected" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAnomalies)" />
                    <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm font-medium">Not enough data points yet</div>
              )}
            </div>
          </div>

          {/* Summary Row */}
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-inner">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <h3 className="text-lg font-bold text-foreground min-w-[200px]">Monthly Loss Summary</h3>
              <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                <div className="flex-1 flex items-center justify-between p-4 bg-destructive/5 border border-destructive/10 rounded-2xl">
                  <span className="text-sm font-semibold text-muted-foreground">Total Discovered Loss</span>
                  <span className="text-lg font-black text-destructive">{formatCurrency(monthlyAudit.totalLossValue)}</span>
                </div>
                <div className="flex-1 flex items-center justify-between p-4 bg-success/5 border border-success/10 rounded-2xl">
                  <span className="text-sm font-semibold text-muted-foreground">Value Recovered</span>
                  <span className="text-lg font-black text-success">+{formatCurrency(monthlyAudit.recoveredValue)}</span>
                </div>
                <div className="flex-1 flex items-center justify-between p-4 bg-warning/5 border border-warning/10 rounded-2xl">
                  <span className="text-sm font-bold text-foreground">Net Exposure</span>
                  <span className="text-lg font-black text-warning">{formatCurrency(Math.max(monthlyAudit.totalLossValue - monthlyAudit.recoveredValue, 0))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden shadow-inner">
            <div className="p-6 border-b border-border/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-foreground">Forensic Ledger</h3>
                  {selectedChartDate && (
                    <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => setSelectedChartDate(null)}>
                      Date: {selectedChartDate} ✕
                    </span>
                  )}
                  {isError && (
                    <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                      Fallback Data
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Immutable system event log</p>
              </div>
              
              {/* Search Inside the Ledger Header */}
              <div className="flex w-full md:w-[300px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search logs by ID, action, or user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-background border-border/60 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3 bg-muted/5">
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
                  onClick={() => setSelectedAudit(log)}
                  className={cn(
                    "group relative flex items-start gap-4 p-5 bg-card/40 hover:bg-card border border-border/50 rounded-2xl transition-all cursor-pointer shadow-sm animate-slide-up border-l-4",
                    log.status === 'pending_review' ? 'border-l-warning' :
                    (log.status === 'resolved' || log.status === 'approved') ? 'border-l-success' :
                    log.status === 'explained' ? 'border-l-primary' : 'border-l-transparent'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={cn(
                      'p-3 rounded-xl',
                      log.type === 'stock' && 'bg-primary/10 text-primary',
                      log.type === 'money' && 'bg-warning/10 text-warning',
                      log.type === 'production' && 'bg-success/10 text-success',
                    )}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{log.action}</h4>
                        <p className="text-sm text-muted-foreground mt-1 truncate">{log.details}</p>
                      </div>
                      <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap', getStatusStyle(log.status))}>
                        {log.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                      <span className="font-mono text-xs opacity-70">{log.id}</span>
                      {log.reference && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{log.reference}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{log.user}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      {(log.lossValue || log.recoveredValue) && (
                        <>
                          <span>•</span>
                          <span className="text-destructive font-medium">
                            -{formatCurrency(log.lossValue || 0)}
                          </span>
                          <span className="text-success font-medium">
                            +{formatCurrency(log.recoveredValue || 0)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm hover:bg-primary/20 hover:scale-110 transition-transform">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>

    <AuditDetailsModal 
        open={selectedAudit !== null} 
        onClose={() => setSelectedAudit(null)} 
        audit={selectedAudit} 
      />

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="max-w-md bg-background border-border shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="mb-4 border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary" /> Advanced Filters
              </DialogTitle>
              <button onClick={() => setIsFilterModalOpen(false)} className="p-1 rounded-full hover:bg-muted/50 text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">Severity Level</p>
              <div className="grid grid-cols-2 gap-2">
                {['all', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev as any)}
                    className={cn(
                      "p-3 rounded-xl border text-sm font-semibold transition-all",
                      severityFilter === sev
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border/50 text-foreground hover:bg-muted/50"
                    )}
                  >
                    {sev === 'all' ? 'All Severities' : sev}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">Audit Module</p>
              <div className="grid grid-cols-2 gap-2">
                {['all', 'stock', 'money', 'production'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type as any)}
                    className={cn(
                      "p-3 rounded-xl border text-sm font-semibold transition-all uppercase tracking-wider",
                      typeFilter === type
                        ? "bg-foreground text-background shadow-sm border-transparent"
                        : "bg-card border-border/50 text-foreground hover:bg-muted/50"
                    )}
                  >
                    {type === 'all' ? 'All Modules' : type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">Status Filter</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: 'All Status' },
                  { id: 'pending_review', label: 'Pending' },
                  { id: 'resolved', label: 'Resolved' },
                  { id: 'approved', label: 'Approved' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id as any)}
                    className={cn(
                      "p-3 rounded-xl border text-sm font-semibold transition-all",
                      statusFilter === s.id
                        ? "bg-foreground text-background shadow-sm border-transparent"
                        : "bg-card border-border/50 text-foreground hover:bg-muted/50"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="pt-4 mt-2 border-t border-border/50 flex justify-between gap-3">
              <button
                onClick={() => {
                  setSeverityFilter('all');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setDateFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl shadow-md hover:bg-primary/90 transition-colors"
              >
                Apply & View Results
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
