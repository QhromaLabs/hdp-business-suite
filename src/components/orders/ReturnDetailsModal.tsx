import { useReturnItems } from '@/hooks/useReturns';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import {
    Loader2,
    X,
    User,
    Undo2,
    Package,
    Receipt,
    Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn is available

interface ReturnDetailsModalProps {
    returnOrder: any; // Using 'any' for now, ideally strictly typed from DB schema
    onClose: () => void;
}

export function ReturnDetailsModal({ returnOrder, onClose }: ReturnDetailsModalProps) {
    const { data: items = [], isLoading } = useReturnItems(returnOrder.id);

    return (
        <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-6 border-b border-border/50 flex items-center justify-between bg-accent/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                            <Undo2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight">Return #{returnOrder.return_number}</h3>
                            <p className="text-xs text-muted-foreground font-medium">Processed on {format(new Date(returnOrder.created_at), 'MMMM dd, yyyy')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto scrollbar-hide space-y-8">
                    {/* Status Banner */}
                    <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-between gap-4 animate-slide-up">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center">
                                <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Refund Status</p>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black uppercase tracking-tight text-foreground">COMPLETED</h4>
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500/40" />
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Total Refunded</p>
                            <p className="text-xl font-black text-purple-600 tracking-tight">{formatCurrency(returnOrder.refund_amount)}</p>
                        </div>
                    </div>

                    {/* Customer & Payment Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Customer Information</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">{returnOrder.customer?.name || 'Walk-in Guest'}</p>
                                    <p className="text-xs text-muted-foreground">ID: {returnOrder.customer_id?.substring(0, 8)}...</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Refund Method</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold uppercase">{returnOrder.refund_method || 'Credit'}</p>
                                    <p className="text-xs text-muted-foreground italic">"{returnOrder.reason}"</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">Returned Items</p>
                        <div className="rounded-2xl border border-border/50 overflow-hidden bg-muted/10">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-border/50">
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3 text-center">Qty</th>
                                        <th className="px-4 py-3 text-right">Refund/Unit</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30 text-sm font-medium">
                                    {isLoading ? (
                                        Array.from({ length: 2 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse h-12 bg-muted/5"></tr>
                                        ))
                                    ) : (
                                        items.map((item: any) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3">
                                                    <p className="font-bold">{item.variant?.product?.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{item.variant?.variant_name} - {item.variant?.sku}</p>
                                                </td>
                                                <td className="px-4 py-3 text-center text-muted-foreground">x{item.quantity}</td>
                                                <td className="px-4 py-3 text-right">{formatCurrency(Number(item.unit_refund_amount))}</td>
                                                <td className="px-4 py-3 text-right font-bold text-purple-600">
                                                    {formatCurrency(Number(item.unit_refund_amount) * item.quantity)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Notes Section if exists */}
                    {returnOrder.notes && (
                        <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                            <p className="text-[10px] font-black uppercase text-yellow-600 tracking-widest mb-2">Notes</p>
                            <p className="text-sm text-yellow-700/80 italic">"{returnOrder.notes}"</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
