import { useMemo, useState } from 'react';
import {
  MapPin,
  Users,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Phone,
  Navigation,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployees, useAttendanceToday } from '@/hooks/useEmployees';
import { useSalesOrders, useTodaysSales, useUpdateSalesOrderStatus } from '@/hooks/useSalesOrders';
import { LogFieldNoteModal } from '@/components/field-sales/LogFieldNoteModal';
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton } from '@/components/loading/PageSkeletons';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function FieldSales() {
  const { data: employees = [], isLoading: repsLoading } = useEmployees();
  const { data: attendanceToday = [], isLoading: attendanceLoading } = useAttendanceToday();
  const { data: pendingOrders = [], isLoading: pendingLoading } = useSalesOrders('pending');
  const { data: todaysSales = [], isLoading: todayLoading } = useTodaysSales();
  const updateStatus = useUpdateSalesOrderStatus();

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const fieldReps = useMemo(
    () => employees.filter(e => (e.department || '').toLowerCase().includes('sales')),
    [employees]
  );

  const attendanceByEmployee = useMemo(() => {
    const map: Record<string, string> = {};
    attendanceToday.forEach(a => {
      map[a.employee_id] = a.status;
    });
    return map;
  }, [attendanceToday]);

  const ordersByRep = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    todaysSales.forEach(order => {
      const repId = employees.find(e => e.user_id === order.created_by)?.id;
      if (!repId) return;
      if (!map[repId]) map[repId] = { count: 0, value: 0 };
      map[repId].count += 1;
      map[repId].value += Number(order.total_amount || 0);
    });
    return map;
  }, [todaysSales, employees]);

  const stats = [
    {
      title: 'Active Reps',
      value: attendanceToday.filter(a => ['present', 'field'].includes(a.status)).length,
      icon: Users,
      color: 'success',
    },
    {
      title: "Today's Orders",
      value: todaysSales.length,
      icon: Package,
      color: 'primary',
    },
    {
      title: 'Pending Approval',
      value: pendingOrders.length,
      icon: Clock,
      color: 'warning',
    },
    {
      title: "Today's Sales",
      value: formatCurrency(todaysSales.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)),
      icon: TrendingUp,
      color: 'success',
    },
  ];

  const isLoading = repsLoading || attendanceLoading || pendingLoading || todayLoading;

  const handleApprove = (id: string) => updateStatus.mutate({ id, status: 'approved' });
  const handleDispatch = (id: string) => updateStatus.mutate({ id, status: 'dispatched' });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton actions={1} />
        <StatsSkeleton />
        <CardGridSkeleton cards={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Field Sales</h1>
          <p className="text-sm text-muted-foreground">Live rep tracking, orders, and approvals</p>
        </div>
        <button
          onClick={() => setIsNoteModalOpen(true)}
          className="btn-primary h-11 rounded-2xl"
        >
          <Plus className="w-4 h-4" />
          Log Field Note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
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
                <div className="w-10 h-10 rounded-full border-2 border-card bg-muted flex items-center justify-center text-xs font-bold shadow-sm">
                  {stat.value.toString().charAt(0)}
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">{stat.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden relative min-h-[400px]">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
            <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </div>

          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-foreground">Route Optimization</h3>
                <p className="text-sm text-muted-foreground">Live field activity & coverage</p>
              </div>
              <div className="flex gap-2">
                <button className="h-9 px-4 rounded-lg bg-background border border-border text-xs font-medium hover:bg-muted transition-colors">Refresh Map</button>
                <button className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors premium-glow">Satellite</button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center relative">
              {fieldReps.map((rep, idx) => (
                <div
                  key={rep.id}
                  className="absolute group"
                  style={{
                    top: `${25 + (idx * 15) % 50}%`,
                    left: `${30 + (idx * 18) % 50}%`,
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg cursor-pointer relative">
                    <Users className="w-4 h-4 text-white" />
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/40 -z-10" />
                  </div>
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border p-2 rounded-lg shadow-xl min-w-[140px]">
                    <p className="text-[10px] font-black uppercase text-foreground">{rep.full_name}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">{rep.department || 'Field'}</p>
                  </div>
                </div>
              ))}
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-30">Active Intelligence Map</p>
            </div>

            <div className="mt-8 flex gap-4">
              <div className="p-4 rounded-2xl bg-background/50 border border-border/50 flex flex-col items-center flex-1">
                <span className="text-[8px] font-black uppercase text-muted-foreground mb-1">Total Coverage</span>
                <span className="text-xl font-black text-foreground">{Math.min(100, fieldReps.length * 12)}%</span>
              </div>
              <div className="p-4 rounded-2xl bg-background/50 border border-border/50 flex flex-col items-center flex-1">
                <span className="text-[8px] font-black uppercase text-muted-foreground mb-1">Efficiency Rate</span>
                <span className="text-xl font-black text-success">
                  {todaysSales.length > 0 ? Math.min(100, Math.round((todaysSales.length / Math.max(fieldReps.length, 1)) * 25)) + '%' : '—'}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-background/50 border border-border/50 flex flex-col items-center flex-1">
                <span className="text-[8px] font-black uppercase text-muted-foreground mb-1">Route Sync</span>
                <span className="text-xl font-black text-primary uppercase text-sm">{fieldReps.length ? 'Synced' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner">
          <h3 className="text-xl font-bold text-foreground mb-6">Elite Performers</h3>
          <div className="space-y-4">
            {fieldReps.map((rep, idx) => {
              const repOrders = ordersByRep[rep.id];
              const salesValue = repOrders?.value || 0;
              const target = 150000;
              const completion = target ? Math.min(100, (salesValue / target) * 100) : 0;

              return (
                <div key={rep.id} className="flex items-center gap-4 group">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-muted group-hover:bg-primary/10 transition-colors flex items-center justify-center text-lg font-bold text-primary">
                      {rep.full_name.charAt(0)}
                    </div>
                    <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary border-2 border-card flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{rep.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${completion}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-primary">{completion.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-border/50">
            <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-1">Team MVP</p>
              <p className="text-xl font-bold text-foreground">
                {fieldReps[0]?.full_name || 'No reps yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Targeted: {formatCurrency(250000)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-foreground">Field Status</h3>
              <p className="text-sm text-muted-foreground">Real-time force metrics</p>
            </div>
            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Broadcast Update
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {fieldReps.map((rep, idx) => {
              const status = attendanceByEmployee[rep.id] || 'absent';
              const repOrders = ordersByRep[rep.id];
              const ordersToday = repOrders?.count || 0;
              const salesValue = repOrders?.value || 0;

              return (
                <div key={rep.id} className="group p-5 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-lg font-bold text-primary group-hover:scale-110 transition-transform shadow-inner">
                          {rep.full_name.charAt(0)}
                        </div>
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-card",
                          status === 'present' || status === 'field' ? 'bg-success' : status === 'leave' ? 'bg-warning' : 'bg-muted-foreground opacity-50'
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{rep.full_name}</p>
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-primary" />
                          {rep.department || 'Field Sales'}
                        </p>
                        {rep.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" /> {rep.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(salesValue)}</p>
                      <p className="text-xs text-muted-foreground">Current Shift</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Active Orders</span>
                      <span className="text-sm font-semibold text-foreground">{ordersToday}</span>
                    </div>
                    <div className="flex flex-col text-center">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <span className={cn(
                        'text-sm font-semibold',
                        status === 'present' || status === 'field' ? 'text-success' : 'text-muted-foreground'
                      )}>{status}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-muted-foreground">Call</span>
                      <span className="text-sm font-semibold text-primary inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Quick Dial
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">Order Desk</h3>
              <p className="text-xs text-muted-foreground">Awaiting field reconciliation</p>
            </div>
            <button className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
              <Package className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {pendingOrders.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">No pending orders</div>
            ) : (
              pendingOrders.map((order, idx) => (
                <div key={order.id} className="group p-5 bg-card/80 border border-border/50 rounded-2xl hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{order.customer?.name || 'Walk-in customer'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{order.order_number || order.id}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{formatCurrency(order.total_amount)}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-lg',
                      order.status === 'pending' && 'bg-warning/10 text-warning border border-warning/20',
                      order.status === 'approved' && 'bg-success/10 text-success border border-success/20',
                      order.status === 'dispatched' && 'bg-primary/10 text-primary border border-primary/20',
                    )}>
                      {order.status}
                    </span>

                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(order.id)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success hover:text-white transition-all disabled:opacity-60"
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Release
                        </button>
                        <button
                          onClick={() => handleDispatch(order.id)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary hover:text-white transition-all disabled:opacity-60"
                          disabled={updateStatus.isPending}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Dispatch
                        </button>
                        <button className="h-8 w-8 rounded-lg bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all border border-destructive/10 flex items-center justify-center">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-6 py-4 bg-muted/30 rounded-2xl text-xs font-semibold uppercase text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all tracking-wider">
            View Fulfillment Queue
          </button>
        </div>
      </div>

      <LogFieldNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        reps={fieldReps}
      />
    </div>
  );
}
