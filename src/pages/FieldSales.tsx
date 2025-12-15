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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const salesReps = [
  { 
    id: '1', 
    name: 'Grace Akinyi', 
    phone: '+254 722 111 222',
    status: 'active',
    location: 'Westlands, Nairobi',
    ordersToday: 5,
    salesValue: 185000,
    target: 200000,
  },
  { 
    id: '2', 
    name: 'Samuel Otieno', 
    phone: '+254 733 222 333',
    status: 'active',
    location: 'Industrial Area',
    ordersToday: 3,
    salesValue: 120000,
    target: 150000,
  },
  { 
    id: '3', 
    name: 'Joyce Muthoni', 
    phone: '+254 700 333 444',
    status: 'offline',
    location: 'Mombasa Road',
    ordersToday: 4,
    salesValue: 95000,
    target: 150000,
  },
];

const pendingOrders = [
  { id: 'ORD-001', customer: 'Quickmart Westlands', rep: 'Grace Akinyi', amount: 45000, status: 'pending_approval' },
  { id: 'ORD-002', customer: 'Naivas Karen', rep: 'Samuel Otieno', amount: 78000, status: 'approved' },
  { id: 'ORD-003', customer: 'Chandarana Lavington', rep: 'Joyce Muthoni', amount: 32000, status: 'pending_dispatch' },
  { id: 'ORD-004', customer: 'Carrefour Junction', rep: 'Grace Akinyi', amount: 95000, status: 'pending_approval' },
];

export default function FieldSales() {
  const stats = [
    {
      title: 'Active Reps',
      value: 2,
      icon: Users,
      color: 'success',
    },
    {
      title: "Today's Orders",
      value: 12,
      icon: Package,
      color: 'primary',
    },
    {
      title: 'Pending Approval',
      value: 5,
      icon: Clock,
      color: 'warning',
    },
    {
      title: "Today's Sales",
      value: formatCurrency(400000),
      icon: TrendingUp,
      color: 'success',
    },
  ];

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Reps */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Sales Representatives</h3>
          <div className="space-y-4">
            {salesReps.map((rep) => (
              <div key={rep.id} className="p-4 bg-muted/30 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-lg">{rep.name.charAt(0)}</span>
                      </div>
                      <div className={cn(
                        'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card',
                        rep.status === 'active' ? 'bg-success' : 'bg-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{rep.name}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {rep.phone}
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    rep.status === 'active' ? 'badge-success' : 'bg-muted text-muted-foreground'
                  )}>
                    {rep.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4" />
                  {rep.location}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-2 bg-background rounded-lg text-center">
                    <p className="text-lg font-bold text-foreground">{rep.ordersToday}</p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                  <div className="p-2 bg-background rounded-lg text-center">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(rep.salesValue)}</p>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Target Progress</span>
                    <span className="font-medium text-foreground">
                      {Math.round((rep.salesValue / rep.target) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        (rep.salesValue / rep.target) >= 0.8 ? 'bg-success' : 'bg-primary'
                      )}
                      style={{ width: `${Math.min((rep.salesValue / rep.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Pending Orders</h3>
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <div key={order.id} className="p-4 bg-muted/30 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{order.customer}</p>
                    <p className="text-sm text-muted-foreground">{order.id} • {order.rep}</p>
                  </div>
                  <span className="font-bold text-foreground">{formatCurrency(order.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    order.status === 'pending_approval' && 'badge-warning',
                    order.status === 'approved' && 'badge-success',
                    order.status === 'pending_dispatch' && 'bg-primary/10 text-primary',
                  )}>
                    {order.status.replace('_', ' ')}
                  </span>
                  {order.status === 'pending_approval' && (
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
