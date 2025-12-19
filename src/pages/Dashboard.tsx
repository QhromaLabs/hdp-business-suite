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
  Loader2,
} from 'lucide-react';
import { useDashboardStats, useTodaysSales } from '@/hooks/useSalesOrders';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function Dashboard() {
  const { profile } = useAuth();
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentSales = [], isLoading: salesLoading } = useTodaysSales();

  const isLoading = statsLoading || salesLoading;

  const stats = [
    {
      title: "Today's Sales",
      value: dashboardStats?.todaySales || 0,
      change: 12.5,
      icon: DollarSign,
      color: 'primary',
      isCurrency: true,
    },
    {
      title: 'Orders Today',
      value: dashboardStats?.todayOrders || 0,
      change: 8.2,
      icon: ShoppingCart,
      color: 'success',
      isCurrency: false,
    },
    {
      title: 'Pending Orders',
      value: dashboardStats?.pendingOrders || 0,
      change: -5.1,
      icon: Clock,
      color: 'warning',
      isCurrency: false,
    },
    {
      title: 'Low Stock Items',
      value: dashboardStats?.lowStockItems || 0,
      change: 15.3,
      icon: AlertTriangle,
      color: 'destructive',
      isCurrency: false,
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary': return 'bg-primary/10 text-primary';
      case 'success': return 'bg-success/10 text-success';
      case 'warning': return 'bg-warning/10 text-warning';
      case 'destructive': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-KE');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <p className="text-3xl font-bold text-primary">{formatCurrency(dashboardStats?.todaySales || 0)}</p>
            <p className="text-sidebar-muted text-sm">Today's Revenue</p>
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
                  {stat.isCurrency ? formatCurrency(stat.value) : stat.value.toLocaleString()}
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
            <button 
              onClick={() => window.location.href = '/reports'}
              className="btn-ghost text-sm"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {recentSales.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sales today yet</p>
              <p className="text-sm mt-1">Start selling to see orders here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{sale.customer?.name || 'Walk-in Customer'}</p>
                      <p className="text-sm text-muted-foreground">{sale.order_number} • {getTimeAgo(sale.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(Number(sale.total_amount))}</p>
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      sale.status === 'delivered' ? 'badge-success' : 
                      sale.status === 'pending' ? 'badge-warning' : 'bg-muted text-muted-foreground'
                    )}>
                      {sale.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Quick Stats</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Orders Today</span>
                <span className="text-2xl font-bold text-foreground">{dashboardStats?.todayOrders || 0}</span>
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending Orders</span>
                <span className="text-2xl font-bold text-warning">{dashboardStats?.pendingOrders || 0}</span>
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Low Stock Items</span>
                <span className="text-2xl font-bold text-destructive">{dashboardStats?.lowStockItems || 0}</span>
              </div>
            </div>
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
