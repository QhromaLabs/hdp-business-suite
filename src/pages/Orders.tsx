import { useState, useMemo, useEffect } from 'react';
import { useSalesOrders, useOrderItems, SalesOrder, useDeleteSalesOrder } from '@/hooks/useSalesOrders';
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

export default function Orders() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<SalesOrder | null>(null);
    const [dispatchingOrder, setDispatchingOrder] = useState<SalesOrder | null>(null);

    // Date filtering state
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'last30' | 'all' | 'custom'>('last30');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const updateStatus = useUpdateSalesOrderStatus();
    const deleteOrder = useDeleteSalesOrder();
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
                return { start: startDate, end: endDate };
            case 'all':
            default:
                return { start: undefined, end: undefined };
        }
    }, [dateFilter, startDate, endDate]);

    // Standard Orders Query
    const { data: salesData, isLoading: isSalesLoading } = useSalesOrders(
        selectedStatus !== 'returned' && selectedStatus !== 'all' ? selectedStatus as any : undefined,
        {
            startDate: dateRange.start,
            endDate: dateRange.end,
            page: currentPage,
            pageSize: pageSize,
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
        const subtotal = Number(order.subtotal) || 0;
        const discount = Number(order.discount_amount) || 0;
        const calculated = calculateTotals(subtotal, discount, taxEnabled);
        const total = taxEnabled
            ? (Number(order.total_amount) || calculated.total)
            : calculated.total;
        return { ...calculated, total };
    };

    const statusColors = {
        pending: 'bg-warning/10 text-warning border-warning/20',
        approved: 'bg-primary/10 text-primary border-primary/20',
        dispatched: 'bg-info/10 text-info border-info/20',
        delivered: 'bg-success/10 text-success border-success/20',
        cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
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
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Orders History</h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">Track and manage all business sales</p>
                </div>
                <div className="flex items-center gap-2 bg-card p-1 rounded-xl border border-border/50 shadow-sm">
                    {['all', 'pending', 'approved', 'dispatched', 'returned'].map((status) => (
                        <button
                            key={status}
                            onClick={() => {
                                setSelectedStatus(status);
                                setCurrentPage(1);
                            }}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                selectedStatus === status
                                    ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters & Search */}
            <div className="space-y-4">
                {/* Date Filter Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Time Period:</span>
                    {(['today', 'week', 'month', 'last30', 'all', 'custom'] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => {
                                setDateFilter(filter);
                                setCurrentPage(1); // Reset to first page when changing filter
                            }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                dateFilter === filter
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-card text-muted-foreground hover:bg-muted border border-border/50"
                            )}
                        >
                            {filter === 'last30' ? 'Last 30 Days' : filter === 'week' ? 'This Week' : filter === 'month' ? 'This Month' : filter}
                        </button>
                    ))}
                </div>

                {/* Custom Date Range Inputs */}
                {dateFilter === 'custom' && (
                    <div className="flex items-center gap-3 animate-slide-down">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-muted-foreground">From:</label>
                            <input
                                type="date"
                                value={startDate ? startDate.split('T')[0] : ''}
                                onChange={(e) => {
                                    setStartDate(e.target.value ? new Date(e.target.value).toISOString() : '');
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-2 bg-card border border-border/50 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-muted-foreground">To:</label>
                            <input
                                type="date"
                                value={endDate ? endDate.split('T')[0] : ''}
                                onChange={(e) => {
                                    setEndDate(e.target.value ? new Date(e.target.value).toISOString() : '');
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-2 bg-card border border-border/50 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by order # or customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-card border border-border/50 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Orders List */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                    {isReturning ? 'Return Details' : 'Order Details'}
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Customer</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date & Time</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                    {isReturning ? 'Refund Amount' : 'Total Amount'}
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">
                                    {isReturning ? 'Reason' : 'Status'}
                                </th>
                                {!isReturning && (
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Delivery Code</th>
                                )}
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-8 bg-muted/5"></td>
                                    </tr>
                                ))
                            ) : isReturning ? (
                                filteredReturns.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No returns found matching your criteria.</td>
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
                                                    {/* Returns usually don't have many actions unless we add 'View Details' later. */}
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
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No orders found matching your criteria.</td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="group hover:bg-accent/5 transition-colors">
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
                                                        <a
                                                            href={`/deliveries?orderId=${order.id}`}
                                                            className={cn(
                                                                "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shadow-sm border text-[10px] font-black uppercase tracking-widest",
                                                                order.status === 'in_transit'
                                                                    ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-600 hover:text-white"
                                                                    : "bg-info/10 text-info border-info/20 hover:bg-info hover:text-white"
                                                            )}
                                                            title="View Progress"
                                                        >
                                                            <Activity className="w-3.5 h-3.5" />
                                                            <span>{order.status === 'in_transit' ? 'Progress' : 'Track'}</span>
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => setOrderToDelete(order)}
                                                        className="p-2.5 rounded-xl bg-muted/50 hover:bg-destructive hover:text-white transition-all shadow-sm"
                                                        title="Delete Order"
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
            {!isLoading && filteredOrders.length > 0 && (
                <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-card rounded-2xl border border-border/50 shadow-sm">
                    {/* Page Info */}
                    <div className="text-sm text-muted-foreground font-medium">
                        Showing <span className="font-bold text-foreground">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                        <span className="font-bold text-foreground">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                        <span className="font-bold text-foreground">{totalCount}</span> orders
                    </div>

                    {/* Page Navigation */}
                    <div className="flex items-center gap-2">
                        {/* First Page */}
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-border/50 hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="First Page"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>

                        {/* Previous Page */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-border/50 hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Previous Page"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={cn(
                                            "min-w-[36px] h-9 px-3 rounded-lg text-sm font-bold transition-all",
                                            currentPage === pageNum
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "border border-border/50 hover:bg-muted"
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Next Page */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-border/50 hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Next Page"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Last Page */}
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
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
                                setCurrentPage(1); // Reset to first page when changing page size
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
    const deleteOrder = useDeleteSalesOrder();

    const handleConfirmDelete = async () => {
        if (isLoading) return;

        try {
            await deleteOrder.mutateAsync({ orderId: order.id, items });
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <AlertDialog open={true} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete Order #{order.order_number}.
                        {isLoading ? (
                            <span className="block mt-2 text-primary font-bold">Loading items to restock...</span>
                        ) : (
                            <span className="block mt-2 font-medium text-foreground">
                                {items.length} items will be returned to stock.
                            </span>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleConfirmDelete}
                        disabled={isLoading || deleteOrder.isPending}
                    >
                        {deleteOrder.isPending ? 'Deleting...' : 'Delete & Restock'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


