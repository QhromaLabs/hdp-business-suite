import { useState, useMemo } from 'react';
import { useSalesOrders, useOrderItems, SalesOrder, useDeleteSalesOrder } from '@/hooks/useSalesOrders';
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
} from 'lucide-react';
import { format } from 'date-fns';
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

export default function Orders() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<SalesOrder | null>(null);

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

    const { data, isLoading } = useSalesOrders(
        selectedStatus === 'all' ? undefined : selectedStatus as any,
        {
            startDate: dateRange.start,
            endDate: dateRange.end,
            page: currentPage,
            pageSize: pageSize,
        }
    );

    const orders = data?.orders || [];
    const totalCount = data?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const filteredOrders = orders.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KSh',
        }).format(amount);
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
                    {['all', 'pending', 'approved', 'dispatched'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setSelectedStatus(status)}
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
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Order Details</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Customer</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date & Time</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Amount</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Status</th>
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
                            ) : filteredOrders.length === 0 ? (
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
                                                        onClick={() => updateStatus.mutate({ id: order.id, status: 'dispatched' })}
                                                        disabled={updateStatus.isPending}
                                                        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm border border-primary/20 text-[10px] font-black uppercase tracking-widest"
                                                        title="Dispatch Order"
                                                    >
                                                        {updateStatus.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                                                        <span>Dispatch</span>
                                                    </button>
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
                    formatCurrency={formatCurrency}
                    updateStatus={updateStatus}
                />
            )}

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

function OrderDetailsModal({
    order,
    onClose,
    formatCurrency,
    updateStatus,
}: {
    order: SalesOrder;
    onClose: () => void;
    formatCurrency: (v: number) => string;
    updateStatus: any;
}) {
    const { data: items = [], isLoading } = useOrderItems(order.id);

    const handleApprove = () => updateStatus.mutate({ id: order.id, status: 'approved' });
    const handleDispatch = () => updateStatus.mutate({ id: order.id, status: 'dispatched' });
    const handleCancel = () => updateStatus.mutate({ id: order.id, status: 'cancelled' });
    const { taxEnabled, taxRate } = useSettings();
    const subtotalAmount = Number(order.subtotal) || 0;
    const discountAmount = Number(order.discount_amount) || 0;
    const totals = calculateTotals(subtotalAmount, discountAmount, taxEnabled);
    const displayedTax = taxEnabled ? Number(order.tax_amount) || totals.tax : totals.tax;
    const displayedTotal = taxEnabled ? Number(order.total_amount) || totals.total : totals.total;

    const handleThermalPrint = () => {
        const printWindow = window.open('', '', 'width=400,height=600');
        if (!printWindow) return;

        const container = printWindow.document.createElement('div');
        printWindow.document.body.appendChild(container);

        const root = createRoot(container);
        root.render(
            <ReceiptContent
                order={order}
                items={items}
                settings={{
                    storeName: 'HDPK K LTD',
                    storeAddress: 'P.O BOX 45678-00200 NAIROBI',
                    storePhone: '00111111111',
                    taxRate: taxRate,
                    taxEnabled: taxEnabled,
                }}
            />
        );

        // Wait for content to render then print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const generateDeliveryNote = (isDoublePrint = false) => {
        try {
            const doc = new jsPDF();

            const ORANGE = '#F97316';
            const PURPLE = '#8B5CF6';

            const renderNote = (yOffset: number, titleSuffix: string) => {
                // Header - Company Details
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(20);
                doc.setTextColor(PURPLE);
                doc.text('HDPK K LTD', 105, yOffset + 15, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(60, 60, 60); // Dark Gray
                doc.text('P.O BOX 45678-00200 NAIROBI', 105, yOffset + 21, { align: 'center' });
                doc.text('LOCATED AT SASIO ROAD, PETM GODOWNS, GODOWN NO 13, OFF LUNGA LUNGA ROAD', 105, yOffset + 26, { align: 'center' });
                doc.text('TEL NO: 00111111111', 105, yOffset + 31, { align: 'center' });

                // Delivery Note Title
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.setTextColor(ORANGE);
                doc.text(`DELIVERY NOTE ${titleSuffix}`, 105, yOffset + 42, { align: 'center' });

                // Info
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0); // Reset to black for text
                doc.text(`Order Number: ${order.order_number}`, 20, yOffset + 55);
                doc.text(`Date: ${format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}`, 20, yOffset + 60);
                doc.text(`Customer: ${order.customer?.name || 'Walk-in Guest'}`, 20, yOffset + 65);
                doc.text(`Phone: ${order.customer?.phone || 'N/A'}`, 20, yOffset + 70);

                const tableBody = items.map((item: any, index: number) => {
                    // Client Requirement: "Weight in Gm" = Unit Price, "Gross Weight" = Total Price
                    // We are disguising financial values as weights.
                    const unitWeight = Number(item.unit_price) || 0;
                    const totalWeight = Number(item.total_price) || 0;

                    return [
                        index + 1,
                        `${item.variant?.product?.name} (${item.variant?.variant_name})`,
                        item.quantity,
                        `${unitWeight.toLocaleString()} g`,
                        `${totalWeight.toLocaleString()} g`,
                        'Pcs'
                    ];
                });

                // Calculate "Total Weight" based on Total Prices
                const totalOrderWeight = items.reduce((sum: number, item: any) =>
                    sum + (Number(item.total_price) || 0), 0);

                // Table - start slightly lower to accommodate extra info
                autoTable(doc, {
                    startY: yOffset + 78,
                    head: [['#', 'Item Description', 'Qty', 'Weight (g)', 'Gross Weight (g)', 'Unit']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold', halign: 'center' },
                    styles: { fontSize: 9, cellPadding: 3, valign: 'middle', halign: 'center' },
                    columnStyles: {
                        1: { halign: 'left' } // Description left aligned
                    }
                });

                const weightY = (doc as any).lastAutoTable.finalY + 5;

                // Show Total Gross Weight
                if (totalOrderWeight > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Total Gross Weight: ${totalOrderWeight.toLocaleString()} g`, 190, weightY + 5, { align: 'right' });
                }

                const signatureY = (doc as any).lastAutoTable.finalY + 15;

                // Signatures
                doc.setDrawColor(0);
                doc.text('---------------------------', 20, signatureY + 10);
                doc.text('Issued By', 20, signatureY + 15);

                doc.text('---------------------------', 140, signatureY + 10);
                doc.text('Received By/Stamp', 140, signatureY + 15);

                if (!isDoublePrint) {
                    doc.setFontSize(8);
                    doc.setTextColor(100);
                    doc.text('Thank you for your business!', 105, signatureY + 30, { align: 'center' });
                }
            };

            if (isDoublePrint) {
                renderNote(0, '(ORIGINAL)');
                doc.setDrawColor(200);
                doc.setLineDashPattern([2, 1], 0);
                doc.line(10, 148, 200, 148);
                doc.setDrawColor(0); // Reset draw color
                doc.setLineDashPattern([], 0); // Reset dash
                renderNote(148, '(COPY)');
            } else {
                renderNote(0, '');
            }

            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');
        } catch (error: any) {
            console.error('PDF Generation Error:', error);
            toast.error('Failed to generate PDF: ' + error.message);
        }
    };

    return (

        <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
                {/* Modal Header */}
                <div className="p-6 border-b border-border/50 flex items-center justify-between bg-accent/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight">Order #{order.order_number}</h3>
                            <p className="text-xs text-muted-foreground font-medium">Placed on {format(new Date(order.created_at), 'MMMM dd, yyyy')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 flex-1 overflow-y-auto scrollbar-hide space-y-8">
                    {/* Status Controls */}
                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                order.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
                                    order.status === 'approved' ? 'bg-primary/10 text-primary border-primary/20' :
                                        'bg-success/10 text-success border-success/20'
                            )}>
                                {order.status === 'pending' ? <Clock className="w-6 h-6" /> :
                                    order.status === 'approved' ? <PackageCheck className="w-6 h-6" /> :
                                        <Truck className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Current Fulfillment State</p>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black uppercase tracking-tight text-foreground">{order.status}</h4>
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                    <p className="text-xs text-muted-foreground font-medium">Updated just now</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {order.status === 'pending' && (
                                <>
                                    <button
                                        onClick={handleApprove}
                                        disabled={updateStatus.isPending}
                                        className="flex-1 md:flex-none px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        Release Order
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        disabled={updateStatus.isPending}
                                        className="flex-1 md:flex-none px-6 py-3 bg-destructive/10 text-destructive rounded-xl font-bold text-sm hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                            {order.status === 'approved' && (
                                <button
                                    onClick={handleDispatch}
                                    disabled={updateStatus.isPending}
                                    className="w-full md:w-auto px-8 py-3 bg-info/10 text-info border border-info/20 rounded-xl font-bold text-sm hover:bg-info hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                    Dispatch Now
                                </button>
                            )}
                            {(order.status === 'dispatched' || order.status === 'delivered') && (
                                <div className="px-4 py-2 rounded-lg bg-success/10 text-success text-[10px] font-black uppercase tracking-widest border border-success/20">
                                    Fulfillment Complete
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Customer & Info Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Customer Information</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">{order.customer?.name || 'Walk-in Guest'}</p>
                                    <p className="text-xs text-muted-foreground">{order.customer?.phone || 'No phone provided'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Payment Details</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold uppercase">{order.payment_method || 'Cash'}</p>
                                    <p className="text-xs text-muted-foreground">{order.is_credit_sale ? 'Credit Sale' : 'Direct Payment'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">Items Summary</p>
                        <div className="rounded-2xl border border-border/50 overflow-hidden bg-muted/10">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-border/50">
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3 text-center">Qty</th>
                                        <th className="px-4 py-3 text-right">Price</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30 text-sm font-medium">
                                    {isLoading ? (
                                        Array.from({ length: 2 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse h-12 bg-muted/5"></tr>
                                        ))
                                    ) : items.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3">
                                                <p className="font-bold">{item.variant?.product?.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{item.variant?.variant_name} - {item.variant?.sku}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">x{item.quantity}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(Number(item.unit_price))}</td>
                                            <td className="px-4 py-3 text-right font-bold text-primary">{formatCurrency(Number(item.total_price))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="flex flex-col items-end gap-2 pt-4">
                        <div className="w-full max-w-[240px] space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                <span>Discount</span>
                                <span className="text-destructive">-{formatCurrency(discountAmount)}</span>
                            </div>
                            {taxEnabled && (
                                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                    <span>VAT ({Math.round(taxRate * 100)}%)</span>
                                    <span>{formatCurrency(displayedTax)}</span>
                                </div>
                            )}
                            <div className="pt-2 border-t border-border mt-2 flex justify-between items-center text-lg">
                                <span className="font-black text-foreground tracking-tight">Grand Total</span>
                                <span className="font-black text-primary">{formatCurrency(displayedTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-border/50 bg-muted/10 flex gap-3">
                    <button
                        onClick={handleThermalPrint}
                        className="flex-1 py-3 bg-zinc-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all shadow-sm"
                    >
                        <Receipt className="w-4 h-4" />
                        Thermal Receipt
                    </button>
                    <button
                        onClick={() => generateDeliveryNote(true)}
                        className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all shadow-sm"
                    >
                        <FileText className="w-4 h-4" />
                        A4 Note
                    </button>
                    <button
                        onClick={() => generateDeliveryNote(false)}
                        className="flex-1 py-3 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-lg"
                    >
                        <Printer className="w-4 h-4" />
                        Print Note
                    </button>
                </div>
            </div>
        </div>
    );
}
