import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const stats = [
  {
    title: "Today's Sales",
    value: 847500,
    change: 12.5,
    icon: DollarSign,
    color: 'primary',
  },
  {
    title: 'Orders Today',
    value: 56,
    change: 8.2,
    icon: ShoppingCart,
    color: 'success',
  },
  {
    title: 'Pending Orders',
    value: 12,
    change: -5.1,
    icon: Clock,
    color: 'warning',
  },
  {
    title: 'Low Stock Items',
    value: 8,
    change: 15.3,
    icon: AlertTriangle,
    color: 'destructive',
  },
];

const recentSales = [
  { id: 'INV-001', customer: 'Nakumatt Holdings', amount: 125000, time: '10 mins ago', status: 'completed' },
  { id: 'INV-002', customer: 'Tuskys Supermarket', amount: 87500, time: '25 mins ago', status: 'completed' },
  { id: 'INV-003', customer: 'Jumia Kenya', amount: 245000, time: '1 hour ago', status: 'pending' },
  { id: 'INV-004', customer: 'Carrefour Kenya', amount: 156000, time: '2 hours ago', status: 'completed' },
  { id: 'INV-005', customer: 'Quickmart Ltd', amount: 98000, time: '3 hours ago', status: 'completed' },
];

const topProducts = [
  { name: 'Industrial Detergent 20L', sold: 145, revenue: 580000 },
  { name: 'Multipurpose Cleaner 5L', sold: 230, revenue: 345000 },
  { name: 'Floor Polish Premium', sold: 89, revenue: 267000 },
  { name: 'Hand Sanitizer 1L', sold: 312, revenue: 234000 },
  { name: 'Glass Cleaner 2L', sold: 156, revenue: 156000 },
];

export default function Dashboard() {
  const { profile } = useAuth();

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary': return 'bg-primary/10 text-primary';
      case 'success': return 'bg-success/10 text-success';
      case 'warning': return 'bg-warning/10 text-warning';
      case 'destructive': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sidebar via-sidebar to-sidebar/90 rounded-2xl p-6 text-sidebar-foreground">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {profile?.full_name?.split(' ')[0] || 'User'}!
            </h2>
            <p className="text-sidebar-muted mt-1">
              Here's what's happening with your business today.
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-3xl font-bold text-primary">{formatCurrency(2456000)}</p>
            <p className="text-sidebar-muted text-sm">Monthly Revenue</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change > 0;
          
          return (
            <div
              key={stat.title}
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className={cn('p-3 rounded-xl', getColorClasses(stat.color))}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  isPositive ? 'text-success' : 'text-destructive'
                )}>
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(stat.change)}%
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">
                  {stat.title.includes('Sales') ? formatCurrency(stat.value) : stat.value.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Recent Sales</h3>
            <button className="btn-ghost text-sm">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{sale.customer}</p>
                    <p className="text-sm text-muted-foreground">{sale.id} • {sale.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{formatCurrency(sale.amount)}</p>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    sale.status === 'completed' ? 'badge-success' : 'badge-warning'
                  )}>
                    {sale.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Top Products</h3>
            <button className="btn-ghost text-sm">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                      {product.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(product.revenue / topProducts[0].revenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'New Sale', icon: ShoppingCart, path: '/pos' },
          { label: 'Add Customer', icon: Users, path: '/customers' },
          { label: 'Stock Entry', icon: Package, path: '/inventory' },
          { label: 'View Reports', icon: TrendingUp, path: '/reports' },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => window.location.href = action.path}
              className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:border-primary/30 hover:shadow-md transition-all duration-200"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
