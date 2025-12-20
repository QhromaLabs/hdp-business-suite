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
import { useDashboardStats, useTodaysSales } from '@/hooks/useSalesOrders';
import { cn } from '@/lib/utils';
import { DashboardSkeleton } from '@/components/loading/PageSkeletons';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

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
        return <DashboardSkeleton />;
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
                {/* Revenue Trend Chart */}
                <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Revenue Trend</h3>
                            <p className="text-sm text-muted-foreground">Sales performance over the last 7 days</p>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            +12.5% vs last week
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dashboardStats?.chartData || []}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                    tickFormatter={(str) => {
                                        const date = new Date(str);
                                        return date.toLocaleDateString('en-KE', { weekday: 'short' });
                                    }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                    tickFormatter={(value) => `KSh ${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: '12px',
                                        color: 'hsl(var(--foreground))'
                                    }}
                                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Low Stock & Alerts */}
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-foreground">Critical Alerts</h3>
                    </div>
                    <div className="space-y-4">
                        {dashboardStats?.lowStockItems && dashboardStats.lowStockItems > 0 ? (
                            <div className="p-4 bg-destructive/5 border border-destructive/10 rounded-xl flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                                <div>
                                    <p className="font-medium text-destructive">Low Stock Warning</p>
                                    <p className="text-sm text-destructive/80">{dashboardStats.lowStockItems} variants are below reorder level.</p>
                                </div>
                            </div>
                        ) : null}
                        <div className="p-4 bg-warning/5 border border-warning/10 rounded-xl flex gap-3">
                            <Clock className="w-5 h-5 text-warning shrink-0" />
                            <div>
                                <p className="font-medium text-warning">Pending Orders</p>
                                <p className="text-sm text-warning/80">{dashboardStats?.pendingOrders || 0} orders waiting for dispatch.</p>
                            </div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-xl flex gap-3">
                            <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                            <div>
                                <p className="font-medium text-foreground">Next Restock</p>
                                <p className="text-sm text-muted-foreground">Scheduled for Monday, Industrial Area.</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.href = '/inventory'}
                        className="w-full mt-6 btn-secondary py-3 text-sm font-semibold"
                    >
                        Manage Inventory
                    </button>
                </div>

                {/* Recent Sales Table */}
                <div className="lg:col-span-3 bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">Recent Sales Activity</h3>
                        <button
                            onClick={() => window.location.href = '/reports'}
                            className="text-primary text-sm font-semibold hover:underline"
                        >
                            Export Report
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-muted/50 text-muted-foreground text-sm">
                                    <th className="py-4 px-6 font-medium">Order #</th>
                                    <th className="py-4 px-6 font-medium">Customer</th>
                                    <th className="py-4 px-6 font-medium">Method</th>
                                    <th className="py-4 px-6 font-medium">Total</th>
                                    <th className="py-4 px-6 font-medium">Status</th>
                                    <th className="py-4 px-6 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {recentSales.slice(0, 6).map((sale) => (
                                    <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-4 px-6 font-mono text-sm uppercase">{sale.order_number}</td>
                                        <td className="py-4 px-6 font-medium">{sale.customer?.name || 'Walk-in'}</td>
                                        <td className="py-4 px-6">
                                            <span className="capitalize text-sm">{sale.payment_method?.toLowerCase() || 'cash'}</span>
                                        </td>
                                        <td className="py-4 px-6 font-bold">{formatCurrency(Number(sale.total_amount))}</td>
                                        <td className="py-4 px-6">
                                            <span className={cn(
                                                'px-2 py-1 rounded-lg text-xs font-semibold',
                                                sale.status === 'delivered' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                                            )}>
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-muted-foreground">
                                            {getTimeAgo(sale.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
