import { useState } from 'react';
import { useOrderItems, SalesOrder } from '@/hooks/useSalesOrders';
import { useDeliveryAgents } from '@/hooks/useDeliveryAgents';
import { useUpdateSalesOrderStatus } from '@/hooks/useSalesOrders';
import { useSettings } from '@/contexts/SettingsContext';
import { calculateTotals } from '@/lib/tax';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
    Package,
    X,
    Clock,
    PackageCheck,
    Truck,
    CheckCircle,
    Navigation,
    Loader2,
    Receipt,
    FileText,
    Printer,
    User,
    MapPin,
    Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DispatchOrderModal } from './DispatchOrderModal';
import { LocationPicker } from '../deliveries/LocationPicker';
import { ReceiptContent } from '../printing/Receipt';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrderDetailsModalProps {
    order: SalesOrder;
    onClose: () => void;
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
    const { data: items = [], isLoading } = useOrderItems(order.id);
    const { data: agents = [] } = useDeliveryAgents();
    const updateStatus = useUpdateSalesOrderStatus();
    const [isDispatching, setIsDispatching] = useState(false);
    const [dispatchingOrder, setDispatchingOrder] = useState<SalesOrder | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [location, setLocation] = useState<{ latitude: number, longitude: number, address: string }>({
        latitude: Number(order.latitude || order.customer?.latitude) || -1.286389,
        longitude: Number(order.longitude || order.customer?.longitude) || 36.817223,
        address: order.address_name || order.customer?.address_name || ''
    });

    const handleApprove = () => updateStatus.mutate({ id: order.id, status: 'approved' });
    const handleDispatch = () => {
        if (!selectedAgentId) {
            toast.error('Please select a delivery agent');
            return;
        }
        updateStatus.mutate({
            id: order.id,
            status: 'dispatched',
            delivery_agent_id: selectedAgentId,
            latitude: location.latitude,
            longitude: location.longitude,
            address_name: location.address
        }, {
            onSuccess: () => setIsDispatching(false)
        });
    };
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
                // Add Logo (Small & Centered)
                const logoWidth = 25;
                const logoHeight = 12.5;
                const pageWidth = 210;
                doc.addImage('/brand/logo.png', 'PNG', (pageWidth - logoWidth) / 2, yOffset + 5, logoWidth, logoHeight);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(PURPLE);
                doc.text('HDP(K) LTD', pageWidth / 2, yOffset + 24, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(60, 60, 60);
                doc.text('P.O BOX 45678-00200 NAIROBI', pageWidth / 2, yOffset + 29, { align: 'center' });
                doc.text('LOCATED AT SASIO ROAD, PETM GODOWNS, GODOWN NO 13, OFF LUNGA LUNGA ROAD', pageWidth / 2, yOffset + 33, { align: 'center' });
                doc.text('TEL NO: 00111111111', pageWidth / 2, yOffset + 37, { align: 'center' });

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.setTextColor(ORANGE);
                doc.text(`DELIVERY NOTE ${titleSuffix}`, pageWidth / 2, yOffset + 48, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text(`Order Number: ${order.order_number}`, 20, yOffset + 58);
                doc.text(`Date: ${format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}`, 20, yOffset + 63);
                doc.text(`Customer: ${order.customer?.name || 'Walk-in Guest'}`, 20, yOffset + 68);
                doc.text(`Phone: ${order.customer?.phone || 'N/A'}`, 20, yOffset + 73);

                const tableBody = items.map((item: any, index: number) => {
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

                const totalOrderWeight = items.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);

                autoTable(doc, {
                    startY: yOffset + 78,
                    head: [['#', 'Item Description', 'Qty', 'Weight (g)', 'Gross Weight (g)', 'Unit']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold', halign: 'center' },
                    styles: { fontSize: 9, cellPadding: 3, valign: 'middle', halign: 'center' },
                    columnStyles: { 1: { halign: 'left' } }
                });

                const weightY = (doc as any).lastAutoTable.finalY + 5;
                if (totalOrderWeight > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Total Gross Weight: ${totalOrderWeight.toLocaleString()} g`, 190, weightY + 5, { align: 'right' });
                }

                const signatureY = (doc as any).lastAutoTable.finalY + 15;
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

                if (items.length > 3) {
                    doc.addPage();
                    renderNote(0, '(COPY)');
                } else {
                    doc.setDrawColor(200);
                    doc.setLineDashPattern([2, 1], 0);
                    doc.line(10, 148, 200, 148);
                    doc.setDrawColor(0);
                    doc.setLineDashPattern([], 0);
                    renderNote(148, '(COPY)');
                }
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
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto scrollbar-hide space-y-8">
                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                order.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
                                    order.status === 'approved' ? 'bg-primary/10 text-primary border-primary/20' :
                                        order.status === 'in_transit' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                            'bg-success/10 text-success border-success/20'
                            )}>
                                {order.status === 'pending' ? <Clock className="w-6 h-6" /> :
                                    order.status === 'approved' ? <PackageCheck className="w-6 h-6" /> :
                                        order.status === 'in_transit' ? <Truck className="w-6 h-6 animate-pulse" /> :
                                            <CheckCircle className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Current Fulfillment State</p>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black uppercase tracking-tight text-foreground">{order.status.replace('_', ' ')}</h4>
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                    <p className="text-xs text-muted-foreground font-medium">Updated just now</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {order.status === 'pending' && (
                                <>
                                    <button onClick={handleApprove} className="flex-1 md:flex-none px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        Release Order
                                    </button>
                                    <button onClick={handleCancel} className="flex-1 md:flex-none px-6 py-3 bg-destructive/10 text-destructive rounded-xl font-bold text-sm hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-2">
                                        Cancel
                                    </button>
                                </>
                            )}
                            {order.status === 'approved' && !isDispatching && (
                                <button onClick={() => setIsDispatching(true)} className="w-full md:w-auto px-8 py-3 bg-info/10 text-info border border-info/20 rounded-xl font-bold text-sm hover:bg-info hover:text-white transition-all flex items-center justify-center gap-2">
                                    <Navigation className="w-4 h-4" />
                                    Prepare Dispatch
                                </button>
                            )}
                            {order.status === 'approved' && isDispatching && (
                                <div className="flex gap-2 w-full md:w-auto">
                                    <button onClick={handleDispatch} className="flex-1 md:flex-none px-6 py-3 bg-info text-white rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                        Confirm Dispatch
                                    </button>
                                    <button onClick={() => setIsDispatching(false)} className="px-4 py-3 bg-muted text-muted-foreground rounded-xl font-bold text-sm hover:bg-muted/80 transition-all">
                                        Cancel
                                    </button>
                                </div>
                            )}
                            {order.status === 'in_transit' && (
                                <a
                                    href={`/deliveries?orderId=${order.id}`}
                                    className="w-full md:w-auto px-8 py-3 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                >
                                    <Activity className="w-4 h-4" />
                                    View Live Progress
                                </a>
                            )}
                            {order.status === 'delivered' && (
                                <div className="px-4 py-2 rounded-lg bg-success/10 text-success text-[10px] font-black uppercase tracking-widest border border-success/20">
                                    Fulfillment Complete
                                </div>
                            )}
                        </div>
                    </div>

                    {order.status === 'approved' && isDispatching && (
                        <div className="space-y-6 p-6 bg-info/5 border border-info/10 rounded-2xl animate-fade-in">
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase text-info tracking-widest flex items-center gap-2">
                                    <User className="w-3 h-3" />
                                    Assign Delivery Agent
                                </label>
                                <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} className="w-full px-4 py-3 bg-card border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-info/20 outline-none transition-all">
                                    <option value="">Select an agent...</option>
                                    {agents.map((agent) => (
                                        <option key={agent.id} value={agent.id}>{agent.full_name} ({agent.phone || 'No phone'})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase text-info tracking-widest flex items-center gap-2">
                                    <MapPin className="w-3 h-3" />
                                    Verify Delivery Location
                                </label>
                                <div className="h-[300px] border border-border/50 rounded-xl overflow-hidden">
                                    <LocationPicker
                                        initialLocation={{
                                            lat: location.latitude,
                                            lng: location.longitude,
                                            address: location.address
                                        }}
                                        onLocationSelect={(loc) => setLocation({ latitude: loc.lat, longitude: loc.lng, address: loc.address })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

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

                <div className="p-6 border-t border-border/50 bg-muted/10 flex gap-3">
                    <button onClick={handleThermalPrint} className="flex-1 py-3 bg-zinc-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all shadow-sm">
                        <Receipt className="w-4 h-4" />
                        Thermal Receipt
                    </button>
                    <button onClick={() => generateDeliveryNote(true)} className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all shadow-sm">
                        <FileText className="w-4 h-4" />
                        A4 Note
                    </button>
                    <button onClick={() => generateDeliveryNote(false)} className="flex-1 py-3 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-lg">
                        <Printer className="w-4 h-4" />
                        Print Note
                    </button>
                </div>
            </div>

            <DispatchOrderModal
                isOpen={!!dispatchingOrder}
                onClose={() => setDispatchingOrder(null)}
                order={dispatchingOrder}
            />
        </div>
    );
}
