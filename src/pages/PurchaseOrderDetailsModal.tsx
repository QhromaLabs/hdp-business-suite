
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Edit2, Package, Calendar, User, Loader2, CheckCircle2, ArrowDownToLine, AlertTriangle } from 'lucide-react';
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
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PurchaseOrderDetailsModalProps {
    order: any;
    onClose: () => void;
    onUpdate: () => void;
}

export default function PurchaseOrderDetailsModal({ order, onClose, onUpdate }: PurchaseOrderDetailsModalProps) {
    const [loading, setLoading] = useState(false);
    const [loadingItems, setLoadingItems] = useState(true);
    const [receiving, setReceiving] = useState(false);
    const [showConfirmReceive, setShowConfirmReceive] = useState(false);
    const [notes, setNotes] = useState(order.notes || '');
    const [isEditing, setIsEditing] = useState(false);
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        const fetchItems = async () => {
            setLoadingItems(true);
            try {
                const { data, error } = await supabase
                    .from('purchase_order_items')
                    .select(`
                        *,
                        variant:product_variants (
                            variant_name,
                            product:products (name)
                        )
                    `)
                    .eq('purchase_order_id', order.id);

                if (error) throw error;

                // Format items
                const formattedItems = (data || []).map((item: any) => ({
                    ...item,
                    name: item.variant?.product?.name
                        ? `${item.variant.product.name} (${item.variant.variant_name})`
                        : 'Unknown Item'
                }));

                setItems(formattedItems);
            } catch (error) {
                console.error('Error fetching items:', error);
                toast.error('Failed to load items');
            } finally {
                setLoadingItems(false);
            }
        };

        if (order.id) fetchItems();
    }, [order.id]);

    const handleSaveNotes = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('purchase_orders')
                .update({ notes: notes })
                .eq('id', order.id);

            if (error) throw error;
            toast.success('Order updated successfully');
            setIsEditing(false);
            onUpdate();
        } catch (error: any) {
            toast.error('Failed to update order');
        } finally {
            setLoading(false);
        }
    };

    const handleReceiveClick = () => {
        setShowConfirmReceive(true);
    };

    const confirmReceiveItems = async () => {
        setReceiving(true);
        setShowConfirmReceive(false);
        try {
            // @ts-ignore - RPC function added in migration
            const { error } = await supabase.rpc('receive_purchase_order', { order_id: order.id });

            if (error) throw error;
            toast.success('Items received and inventory updated successfully');
            onUpdate(); // Refresh parent
            onClose();
        } catch (error: any) {
            console.error('Error receiving items:', error);
            toast.error(error.message || 'Failed to receive items');
        } finally {
            setReceiving(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'partial': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-start bg-muted/20">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold">{order.order_number}</h2>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getStatusColor(order.status)}`}>
                                {order.status}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {order.creditor?.name}
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(order.created_at), 'PPP')}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-6">

                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                            <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Total Amount</div>
                            <div className="text-2xl font-bold">KES {order.total_amount?.toLocaleString()}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                            <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Paid Amount</div>
                            <div className={`text-2xl font-bold ${order.paid_amount >= order.total_amount ? 'text-green-600' : 'text-orange-600'}`}>
                                KES {order.paid_amount?.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Receive Items Action */}
                    {!order.items_received ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-blue-900">Receive Inventory</h4>
                                <p className="text-sm text-blue-700">Add these items to stock and update cost prices.</p>
                            </div>
                            <button
                                onClick={handleReceiveClick}
                                disabled={receiving || loadingItems}
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                            >
                                {receiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
                                Receive Items
                            </button>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-full">
                                <CheckCircle2 className="w-5 h-5 text-green-700" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-green-900">Inventory Received</h4>
                                <p className="text-sm text-green-700">
                                    Stock updated on {order.received_at ? format(new Date(order.received_at), 'PPP') : 'Unknown date'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Order Notes (Editable) */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-muted-foreground" />
                                Notes / Title
                            </h3>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Edit
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveNotes}
                                        disabled={loading}
                                        className="text-xs text-primary font-bold hover:underline"
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>

                        {isEditing ? (
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full p-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                                placeholder="Add notes here..."
                            />
                        ) : (
                            <div className="p-4 rounded-xl bg-muted/10 border border-border/50 text-sm whitespace-pre-wrap">
                                {notes || <span className="text-muted-foreground italic">No notes added</span>}
                            </div>
                        )}
                    </div>

                    {/* Items List */}
                    <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            Items ({items.length})
                        </h3>

                        <div className="border border-border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 text-muted-foreground h-9">
                                    <tr>
                                        <th className="px-4 text-left font-medium">Item</th>
                                        <th className="px-4 text-center font-medium">Qty</th>
                                        <th className="px-4 text-right font-medium">Cost</th>
                                        <th className="px-4 text-right font-medium">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loadingItems ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Loading items...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : items.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-center text-muted-foreground">No items found</td>
                                        </tr>
                                    ) : (
                                        items.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/5">
                                                <td className="px-4 py-3 font-medium">{item.name}</td>
                                                <td className="px-4 py-3 text-center">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right text-muted-foreground">{item.unit_cost?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right font-mono font-medium">{item.subtotal?.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmReceive} onOpenChange={setShowConfirmReceive}>
                <AlertDialogContent className="z-[80]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Receive Inventory?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will add the items to your inventory count and update the cost price for these products to the new buying price.
                            <br /><br />
                            <span className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                <AlertTriangle className="w-4 h-4" />
                                This action cannot be undone.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmReceiveItems} className="bg-blue-600 hover:bg-blue-700">
                            Confirm Receive
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
