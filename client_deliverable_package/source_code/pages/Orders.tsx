import { useState, useMemo, useEffect } from 'react';
import { useSalesOrders, useOrderItems, SalesOrder, useDeleteSalesOrder, useSoftDeleteSalesOrder, useRestoreSalesOrder } from '@/hooks/useSalesOrders';
import { useProductReturns } from '@/hooks/useReturns';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    Search,
    Filter,
    Eye,
    Calendar,
    User,
    Package,
    X,
    ChevronRight,
    Receipt,
    Download,
    Printer,
    MoreVertical,
    CheckCircle,
    Navigation,
    Loader2,
    PackageCheck,
    Truck,
    Clock,
    FileText,
    Trash2,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    MapPin,
    Activity,
    CheckCircle2,
    Undo2,
    Copy,
} from 'lucide-react';
import { useDeliveryAgents } from '@/hooks/useDeliveryAgents';
import { LocationPicker } from '@/components/deliveries/LocationPicker';
import { format } from 'date-fns';
import { DispatchOrderModal } from '@/components/orders/DispatchOrderModal';
import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal';
import { ReturnDetailsModal } from '@/components/orders/ReturnDetailsModal';
import { cn } from '@/lib/utils';
import { useUpdateSalesOrderStatus } from '@/hooks/useSalesOrders';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSettings } from '@/contexts/SettingsContext';
import { calculateTotals } from '@/lib/tax';
import { toast } from 'sonner';
import { ReceiptContent } from '@/components/printing/Receipt';
import { createRoot } from 'react-dom/client';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';

export default function Orders() {
    const { user, userRole } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<SalesOrder | null>(null);
    const [dispatchingOrder, setDispatchingOrder] = useState<SalesOrder | null>(null);

    const isClerk = userRole === 'clerk';

    // Date filtering state
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'last30' | 'all' | 'custom'>('last30');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const updateStatus = useUpdateSalesOrderStatus();
    const deleteOrder = useDeleteSalesOrder();
    const restoreOrder = useRestoreSalesOrder();
    const { taxEnabled } = useSettings();
    const queryClient = useQueryClient();

    // Realtime Sync for Orders
    useEffect(() => {
        const channels = [
            supabase.channel('orders_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, () => {
                queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
            }).subscribe(),
            supabase.channel('order_items_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
                queryClient.invalidateQueries({ queryKey: ['order_items'] });
            }).subscribe(),
            supabase.channel('returns_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'product_returns' }, () => {
                queryClient.invalidateQueries({ queryKey: ['product_returns'] });
            }).subscribe()
        ];

        return () => {
            channels.forEach(ch => supabase.removeChannel(ch));
        };
    }, [queryClient]);

    // Calculate date range based on filter
    const dateRange = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateFilter) {
            case 'today':
                return { start: today.toISOString(), end: now.toISOString() };
            case 'week': {
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                return { start: weekStart.toISOString(), end: now.toISOString() };
            }
            case 'month': {
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return { start: monthStart.toISOString(), end: now.toISOString() };
            }
            case 'last30': {
                const last30 = new Date(today);
                last30.setDate(today.getDate() - 30);
                return { start: last30.toISOString(), end: now.toISOString() };
            }
            case 'custom':
                return { start: startDate ? new Date(startDate).toISOString() : undefined, end: endDate ? new Date(endDate).toISOString() : undefined };
            case 'all':
            default:
                return { start: undefined, end: undefined };
        }
    }, [dateFilter, startDate, endDate]);

    // Standard Orders Query
    const { data: salesData, isLoading: isSalesLoading } = useSalesOrders(
        selectedStatus !== 'returned' && selectedStatus !== 'all' ? selectedStatus as any : undefined,
        {
            startDate: selectedStatus === 'deleted' ? undefined : dateRange.start,
            endDate: selectedStatus === 'deleted' ? undefined : dateRange.end,
            page: currentPage,
            pageSize: pageSize,
            createdBy: isClerk ? user?.id : undefined
        }
    );

    // Returns Query (Only when tab is 'returned')
    const { data: returnsData, isLoading: isReturnsLoading } = useProductReturns(
        selectedStatus === 'returned' ? {
            startDate: dateRange.start,
            endDate: dateRange.end,
            page: currentPage,
            pageSize: pageSize,
        } : undefined
    );

    // If 'all' is selected, we only show sales orders for now, as merging pagination is complex
    const isReturning = selectedStatus === 'returned';
    const isLoading = isReturning ? isReturnsLoading : isSalesLoading;

    // Normalize data for display
    const orders = isReturning ? [] : (salesData?.orders || []);
    const returns = isReturning ? (returnsData?.returns || []) : [];

    const totalCount = isReturning ? (returnsData?.totalCount || 0) : (salesData?.totalCount || 0);
    const totalPages = Math.ceil(totalCount / pageSize);

    const filteredOrders = orders.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredReturns = returns.filter(ret =>
        ret.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ret.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getOrderTotals = (order: SalesOrder) => {
        const calculated = calculateTotals(order.subtotal || 0, order.tax_amount || 0);
        const total = taxEnabled
            ? (Number(order.total_amount) || calculated.total)
            : calculated.total;
        return { ...calculated, total };
    };

    const statusColors = {
        pending: 'bg-warning/10 text-warning border-warning/20',
        approved: 'bg-primary/10 text-primary border-primary/20',
        dispatched: 'bg-info/10 text-info border-info/20',
        in_transit: 'bg-info/10 text-info border-info/20',
        delivered: 'bg-success/10 text-success border-success/20',
        completed: 'bg-green-500/20 text-green-700 border-green-500/30',
        cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
        deleted: 'bg-destructive/20 text-destructive border-destructive/30 font-bold',
    };

    const handleDeleteOrder = async () => {
        if (!orderToDelete) return;

        try {
            // Logic handled in dialog
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        {isClerk ? 'My Orders' : 'Orders History'}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        {isClerk ? 'Sales you have recorded' : 'Track and manage all business sales'}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 bg-card p-1 rounded-xl border border-border/50 shadow-sm overflow-x-auto max-w-full scrollbar-none">
                    {['all', 'pending', 'approved', 'dispatched', 'in_transit', 'delivered', 'completed', 'returned', 'deleted'].map((status) => (
                        <button
                            key={status}
                            onClick={() => {
                                setSelectedStatus(status);
                                setCurrentPage(1);
                            }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0",
                                selectedStatus === status
                                    ? status === 'deleted'
                                        ? "bg-destructive text-destructive-foreground shadow-md scale-[1.02]"
                                        : "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                                    : status === 'deleted'
                                        ? "text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20"
                                        : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {status === 'deleted' ? '🗑️ DELETED' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters & Search */}
            <div className="space-y-4">
                {/* Date Filter Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 bg-card p-1 rounded-xl border border-border/50 shadow-sm flex-wrap">
                        <span className="text-xs font-bold text-muted-foreground px-3 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Time Period:
                        </span>
                        {[
                            { key: 'today', label: 'Today' },
                            { key: 'week', label: 'This Week' },
                            { key: 'month', label: 'This Month' },
                            { key: 'last30', label: 'Last 30 Days' },
                            { key: 'all', label: 'All' },
                            { key: 'custom', label: 'Custom' },
                        ].map((filter) => (
                            <button
                                key={filter.key}
                                onClick={() => {
                                    setDateFilter(filter.key as any);
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    dateFilter === filter.key
                                        ? "bg-primary/10 text-primary border border-primary/20"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    {dateFilter === 'custom' && (
                        <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border/50 shadow-sm">
                            <input
                                type="date"
                                value={startDate ? startDate.split('T')[0] : ''}
                                onChange={(e) => {
                                    setStartDate(e.target.value ? new Date(e.target.value).toISOString() : '');
                                    setCurrentPage(1);
                                }}
                                className="px-2 py-1 bg-background border border-border rounded-lg text-xs font-medium"
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <input
                                type="date"
                                value={endDate ? endDate.split('T')[0] : ''}
                                onChange={(e) => {
                                    setEndDate(e.target.value ? new Date(e.target.value).toISOString() : '');
                                    setCurrentPage(1);
                                }}
                                className="px-2 py-1 bg-background border border-border rounded-lg text-xs font-medium"
                            />
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={isReturning ? "Search by return # or customer..." : "Search by order # or customer..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-card border border-border/50 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border/50 bg-muted/20 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                <th className="px-6 py-4">{isReturning ? 'Return Details' : 'Order Details'}</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">{isReturning ? 'Refund Amount' : 'Total Amount'}</th>
                                <th className="px-6 py-4 text-center">{isReturning ? 'Reason' : 'Status'}</th>
                                {!isReturning && <th className="px-6 py-4 text-center">Delivery Code</th>}
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            <span>Loading records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : isReturning ? (
                                filteredReturns.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">No return records found.</td>
                                    </tr>
                                ) : (
                                    filteredReturns.map((ret: any) => (
                                        <tr key={ret.id} className="group hover:bg-accent/5 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                                                        <Undo2 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground text-sm tracking-tight">#{ret.return_number}</p>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-0.5">{ret.refund_method || 'CREDIT'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span className="text-sm font-semibold">{ret.customer?.name || 'Walk-in Guest'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium">{format(new Date(ret.created_at), 'dd MMM, yyyy')}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">{format(new Date(ret.created_at), 'hh:mm a')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-sm font-black text-purple-600">-{formatCurrency(ret.refund_amount)}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex justify-center">
                                                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-purple-500/10 text-purple-600 border-purple-500/20">
                                                        {ret.reason}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedReturn(ret)}
                                                        className="p-2.5 rounded-xl bg-muted/50 hover:bg-purple-500 hover:text-white transition-all shadow-sm"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                            ) : (
                                filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">No orders found matching your criteria.</td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} 
                                            className="group hover:bg-accent/5 transition-colors"
                                            style={order.status === 'completed' ? { backgroundColor: 'rgba(34, 197, 94, 0.12)' } : undefined}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                        <Receipt className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground text-sm tracking-tight">#{order.order_number}</p>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-0.5">{order.payment_method || 'CASH'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span className="text-sm font-semibold">{order.customer?.name || 'Walk-in Guest'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium">{format(new Date(order.created_at), 'dd MMM, yyyy')}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">{format(new Date(order.created_at), 'hh:mm a')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-sm font-black text-primary">{formatCurrency(getOrderTotals(order).total)}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex justify-center">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                        statusColors[order.status as keyof typeof statusColors] || 'bg-muted text-muted-foreground border-border'
                                                    )}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex justify-center items-center gap-2">
                                                    {(order as any).delivery_code ? (
                                                        <>
                                                            <span className="text-lg font-black text-green-600 tracking-[0.2em] font-mono">
                                                                {(order as any).delivery_code}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText((order as any).delivery_code);
                                                                    toast.success('Delivery code copied!');
                                                                }}
                                                                className="p-1.5 rounded-lg hover:bg-green-100 transition-colors"
                                                                title="Copy code"
                                                            >
                                                                <Copy className="w-3.5 h-3.5 text-green-600" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {order.status === 'pending' && (
                                                        <button
                                                            onClick={() => updateStatus.mutate({ id: order.id, status: 'approved' })}
                                                            disabled={updateStatus.isPending}
                                                            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-success/10 text-success hover:bg-success hover:text-white transition-all shadow-sm border border-success/20 text-[10px] font-black uppercase tracking-widest"
                                                            title="Release Order"
                                                        >
                                                            {updateStatus.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                            <span>Release</span>
                                                        </button>
                                                    )}
                                                    {order.status === 'approved' && (
                                                        <button
                                                            onClick={() => setDispatchingOrder(order)}
                                                            className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                                            title="Dispatch Order"
                                                        >
                                                            <Navigation className="w-3.5 h-3.5" />
                                                            <span>Dispatch</span>
                                                        </button>
                                                    )}
                                                    {(order.status === 'dispatched' || order.status === 'in_transit') && (
                                                        <button
                                                            onClick={() => updateStatus.mutate({ id: order.id, status: 'delivered' })}
                                                            disabled={updateStatus.isPending}
                                                            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm border border-orange-500/20 text-[10px] font-black uppercase tracking-widest"
                                                            title="Mark Delivered"
                                                        >
                                                            {updateStatus.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                                                            <span>Delivered</span>
                                                        </button>
                                                    )}
                                                    {order.status === 'delivered' && (
                                                        <button
                                                            onClick={() => updateStatus.mutate({ id: order.id, status: 'completed' })}
                                                            disabled={updateStatus.isPending}
                                                            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-500/20 text-[10px] font-black uppercase tracking-widest"
                                                            title="Mark Complete"
                                                        >
                                                            {updateStatus.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                            <span>Complete</span>
                                                        </button>
                                                    )}
                                                    {order.status === 'deleted' && (
                                                        <button
                                                            onClick={() => restoreOrder.mutate({ orderId: order.id })}
                                                            disabled={restoreOrder.isPending}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all border border-primary/20 text-[10px] font-black uppercase tracking-widest shadow-sm"
                                                            title="Restore Order"
                                                        >
                                                            {restoreOrder.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                                                            <span>Restore</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setOrderToDelete(order)}
                                                        className={cn(
                                                            "p-2.5 rounded-xl transition-all shadow-sm",
                                                            order.status === 'deleted'
                                                                ? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                                                                : "bg-muted/50 hover:bg-destructive hover:text-white"
                                                        )}
                                                        title={order.status === 'deleted' ? "Permanently Delete Order" : "Move to Deleted"}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="p-2.5 rounded-xl bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {!isLoading && totalCount > 0 && (
                <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-card rounded-2xl border border-border/50 shadow-sm">
                    {/* Page Info */}
                    <div className="text-sm text-muted-foreground font-medium">
                        Showing{' '}
                        <span className="font-bold text-foreground">{((currentPage - 1) * pageSize) + 1}</span>
                        {' '}–{' '}
                        <span className="font-bold text-foreground">{Math.min(currentPage * pageSize, totalCount)}</span>
                        {' '}of{' '}
                        <span className="font-bold text-foreground">{totalCount}</span> orders
                    </div>

                    {/* Page Navigation */}
                    <div className="flex items-center gap-1">
                        {/* First */}
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-border/50 hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="First Page"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>

                        {/* Previous */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-border/50 hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Previous Page"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Numbered Pages with ellipsis */}
                        <div className="flex items-center gap-1">
                            {(() => {
                                const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
                                if (totalPages <= 7) {
                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                    pages.push(1);
                                    if (currentPage > 4) pages.push('ellipsis-start');
                                    const rangeStart = Math.max(2, currentPage - 2);
                                    const rangeEnd = Math.min(totalPages - 1, currentPage + 2);
                                    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
                                    if (currentPage < totalPages - 3) pages.push('ellipsis-end');
                                    pages.push(totalPages);
                                }
                                return pages.map((p, idx) =>
                                    p === 'ellipsis-start' || p === 'ellipsis-end' ? (
                                        <span key={p} className="min-w-[36px] h-9 flex items-center justify-center text-muted-foreground text-sm font-bold select-none">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p as number)}
                                            className={cn(
                                                "min-w-[36px] h-9 px-3 rounded-lg text-sm font-bold transition-all",
                                                currentPage === p
                                                    ? "bg-primary text-primary-foreground shadow-sm scale-105"
                                                    : "border border-border/50 hover:bg-muted hover:border-primary/40"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    )
                                );
                            })()}
                        </div>

                        {/* Next */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-lg border border-border/50 hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Next Page"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Last */}
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-lg border border-border/50 hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Last Page"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Per Page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-3 py-2 bg-card border border-border/50 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer hover:bg-muted transition-all"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Order Details Modal */}
            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                />
            )}

            {/* Return Details Modal */}
            {selectedReturn && (
                <ReturnDetailsModal
                    returnOrder={selectedReturn}
                    onClose={() => setSelectedReturn(null)}
                />
            )}

            {/* Dispatch Order Modal */}
            <DispatchOrderModal
                isOpen={!!dispatchingOrder}
                onClose={() => setDispatchingOrder(null)}
                order={dispatchingOrder}
            />

            {/* Delete Confirmation */}
            {orderToDelete && (
                <DeleteOrderDialog
                    order={orderToDelete}
                    onClose={() => setOrderToDelete(null)}
                />
            )}
        </div>
    );
}

function DeleteOrderDialog({ order, onClose }: { order: SalesOrder; onClose: () => void }) {
    const { data: items = [], isLoading } = useOrderItems(order.id);
    const hardDeleteOrder = useDeleteSalesOrder();
    const softDeleteOrder = useSoftDeleteSalesOrder();

    const isAlreadyDeleted = order.status === 'deleted';

    const handleConfirmDelete = async () => {
        if (isLoading) return;

        try {
            if (isAlreadyDeleted) {
                await hardDeleteOrder.mutateAsync({ orderId: order.id, items });
            } else {
                await softDeleteOrder.mutateAsync({ orderId: order.id, items });
            }
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    const isPending = hardDeleteOrder.isPending || softDeleteOrder.isPending;

    return (
        <AlertDialog open={true} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {isAlreadyDeleted ? `Permanently Purge Order #${order.order_number}?` : `Move Order #${order.order_number} to Deleted?`}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isAlreadyDeleted ? (
                            <span className="block mt-2 text-destructive font-semibold">
                                Warning: This action cannot be undone. This order will be permanently purged from the database.
                            </span>
                        ) : (
                            <>
                                Order #{order.order_number} will be moved to the <strong>DELETED</strong> tab.
                                {isLoading ? (
                                    <span className="block mt-2 text-primary font-bold">Loading items to restock...</span>
                                ) : (
                                    <span className="block mt-2 font-medium text-foreground">
                                        {items.length} items will be returned to stock inventory.
                                    </span>
                                )}
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleConfirmDelete}
                        disabled={isLoading || isPending}
                    >
                        {isPending ? 'Processing...' : (isAlreadyDeleted ? 'Permanently Delete' : 'Move to Deleted & Restock')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
