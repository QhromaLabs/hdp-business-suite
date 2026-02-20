
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Edit2, Package, Calendar, User, Loader2, CheckCircle2, ArrowDownToLine, AlertTriangle, Truck, Gavel, Scale, DollarSign, Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    open: boolean;
    order: any;
    onClose: () => void;
    onUpdate: () => void;
}

export default function PurchaseOrderDetailsModal({ open, order, onClose, onUpdate }: PurchaseOrderDetailsModalProps) {
    const [loading, setLoading] = useState(false);
    const [loadingItems, setLoadingItems] = useState(true);
    const [receiving, setReceiving] = useState(false);
    const [showConfirmReceive, setShowConfirmReceive] = useState(false);
    const [notes, setNotes] = useState(order.notes || '');
    const [isEditing, setIsEditing] = useState(false);
    const [items, setItems] = useState<any[]>([]);

    // Payment State
    const [payments, setPayments] = useState<any[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [newPaymentAmount, setNewPaymentAmount] = useState('');
    const [newPaymentMethod, setNewPaymentMethod] = useState('cash');

    // Calculate Financials
    const totalAmount = Number(order.total_amount) || 0;
    const paidAmount = Number(order.paid_amount) || 0;
    const remainingBalance = Math.max(0, totalAmount - paidAmount);
    const isFullyPaid = remainingBalance <= 0;

    useEffect(() => {
        if (order.id) {
            fetchItems();
            fetchPayments();
        }
    }, [order.id]);

    const fetchItems = async () => {
        setLoadingItems(true);
        try {
            const { data, error } = await supabase
                .from('purchase_order_items')
                .select(`
                    *,
                    variant:product_variants (
                        variant_name,
                        weight,
                        product:products (name)
                    )
                `)
                .eq('purchase_order_id', order.id);

            if (error) throw error;

            const formattedItems = (data || []).map((item: any) => ({
                ...item,
                name: item.variant?.product?.name
                    ? `${item.variant.product.name} (${item.variant.variant_name})`
                    : 'Unknown Item',
                weight: item.variant?.weight || 0
            }));

            setItems(formattedItems);
        } catch (error) {
            console.error('Error fetching items:', error);
            toast.error('Failed to load items');
        } finally {
            setLoadingItems(false);
        }
    };

    const fetchPayments = async () => {
        setLoadingPayments(true);
        try {
            const { data, error } = await supabase
                .from('purchase_order_payments')
                .select('*')
                .eq('purchase_order_id', order.id)
                .order('payment_date', { ascending: false });

            if (error) throw error;
            setPayments(data || []);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoadingPayments(false);
        }
    };

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

    const handleAddPayment = async () => {
        const amount = parseFloat(newPaymentAmount);

        if (!amount || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (amount > remainingBalance + 0.01) {
            toast.error(`Payment cannot exceed KES ${remainingBalance.toLocaleString()}`);
            return;
        }

        setLoading(true);
        try {
            // const amount = parseFloat(newPaymentAmount); // Already parsed above

            // 1. Create PO Payment Record
            const { error: poPayError } = await supabase
                .from('purchase_order_payments')
                .insert([{
                    purchase_order_id: order.id,
                    amount: amount,
                    payment_date: new Date().toISOString(),
                    payment_method: newPaymentMethod,
                    reference_number: `PAY-${order.order_number}-${Date.now().toString().slice(-4)}`,
                    notes: 'Manual Payment Entry'
                }]);

            if (poPayError) throw poPayError;

            // 2. Create Creditor Transaction (Payment)
            const { error: credPayError } = await supabase
                .from('creditor_transactions')
                .insert([{
                    creditor_id: order.creditor_id,
                    transaction_type: 'payment',
                    amount: amount,
                    reference_number: `PAY-${order.order_number}`,
                    notes: `Payment for PO ${order.order_number}`,
                    created_at: new Date().toISOString()
                }]);
            if (credPayError) throw credPayError;

            // 3. Update Creditor Balance
            // New Balance = Old Balance - Payment
            // Fetch current balance first to be safe
            const { data: creditor } = await supabase.from('creditors').select('outstanding_balance').eq('id', order.creditor_id).single();
            const currentBalance = creditor?.outstanding_balance || 0;
            const { error: updateCredError } = await supabase
                .from('creditors')
                .update({ outstanding_balance: currentBalance - amount })
                .eq('id', order.creditor_id);
            if (updateCredError) throw updateCredError;

            // 4. Update PO Paid Amount
            const newPaidTotal = (order.paid_amount || 0) + amount;
            const status = newPaidTotal >= order.total_amount ? 'completed' : 'partial';
            const { error: updatePOError } = await supabase
                .from('purchase_orders')
                .update({
                    paid_amount: newPaidTotal,
                    status: status
                })
                .eq('id', order.id);

            if (updatePOError) throw updatePOError;

            toast.success('Payment recorded successfully');
            setNewPaymentAmount('');
            setShowAddPayment(false);
            fetchPayments();
            onUpdate();

        } catch (error: any) {
            console.error('Error adding payment:', error);
            toast.error('Failed to add payment: ' + error.message);
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
            // Client-side Landed Cost Logic

            // 1. Calculate Costs
            // Note: 'order.total_amount' currently is strictly Items Subtotal based on CreatePurchaseOrder logic.
            // If it includes costs, we should subtract them. But my logic was Total = Subtotal.
            // Let's rely on summing items subtotal to be robust.

            const itemsSubtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
            const variableCosts = (order.freight_cost || 0) + (order.customs_cost || 0) + (order.handling_cost || 0);

            // 2. Process Items
            for (const item of items) {
                // Calculate Share
                const share = itemsSubtotal > 0 ? (item.subtotal / itemsSubtotal) : 0;
                const allocatedCost = variableCosts * share;
                const totalItemCost = item.subtotal + allocatedCost;
                const newUnitCost = item.quantity > 0 ? totalItemCost / item.quantity : 0;

                // A. Update Inventory (Upsert pattern to increment quantity)
                const { data: currentInv } = await supabase
                    .from('inventory')
                    .select('quantity')
                    .eq('variant_id', item.variant_id)
                    .maybeSingle();

                const currentQty = currentInv?.quantity || 0;
                const newQty = currentQty + item.quantity;

                const { error: invError } = await supabase
                    .from('inventory')
                    .upsert({
                        variant_id: item.variant_id,
                        quantity: newQty,
                        last_stock_date: new Date().toISOString()
                    }, { onConflict: 'variant_id' });

                if (invError) throw invError;

                // B. Create Inventory Transaction Log
                const { error: transError } = await supabase
                    .from('inventory_transactions')
                    .insert([{
                        variant_id: item.variant_id,
                        transaction_type: 'purchase_recv',
                        quantity_change: item.quantity,
                        previous_quantity: currentQty,
                        new_quantity: newQty,
                        reference_type: 'purchase_order',
                        reference_id: order.id,
                        notes: `Recv PO #${order.order_number} (Landed Cost: ${newUnitCost.toFixed(2)})`,
                        created_by: (await supabase.auth.getUser()).data.user?.id
                    }]);

                if (transError) throw transError;

                // C. Update Product Cost Price
                const { error: varError } = await supabase
                    .from('product_variants')
                    .update({ cost_price: newUnitCost })
                    .eq('id', item.variant_id);

                if (varError) throw varError;
            }

            // 3. Mark PO as Received
            const { error: poError } = await supabase
                .from('purchase_orders')
                .update({
                    received_at: new Date().toISOString()
                    // We don't change 'status' here as status tracks Payment (pending/partial/completed)
                })
                .eq('id', order.id);

            if (poError) throw poError;

            toast.success('Items received. Stock and Cost Prices updated.');
            onUpdate();
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
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full p-0 gap-0 bg-card border-border/50">
                <DialogHeader className="px-6 py-4 border-b border-border bg-muted/10 sticky top-0 z-10 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Package className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-xl">{order.order_number}</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-normal text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" />
                                        {order.creditor?.name || 'Unknown Supplier'}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {order.created_at ? format(new Date(order.created_at), 'PPP') : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </DialogTitle>
                        <div className="hidden">Purchase Order Details</div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </DialogHeader>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: Items & Costs */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Variable Costs Display */}
                        {(order.freight_cost > 0 || order.customs_cost > 0 || order.handling_cost > 0) && (
                            <div className="bg-muted/10 border border-border rounded-xl p-4">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                                    Landed Costs Breakdown
                                </h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-xs">Freight</span>
                                        <span className="font-mono font-medium">{order.freight_cost?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-xs">Customs</span>
                                        <span className="font-mono font-medium">{order.customs_cost?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-xs">Handling</span>
                                        <span className="font-mono font-medium">{order.handling_cost?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium">{item.name}</div>
                                                        {item.weight > 0 && (
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Scale className="w-3 h-3" /> {item.weight} kg
                                                            </div>
                                                        )}
                                                    </td>
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

                        {/* Receive Items Action */}
                        {!order.received_at ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-blue-900">Receive Inventory</h4>
                                    <p className="text-sm text-blue-700">Add these items to stock and update Landed Costs.</p>
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
                                <div className="flex-1">
                                    <h4 className="font-semibold text-green-900">Inventory Received</h4>
                                    <p className="text-sm text-green-700">
                                        Stock updated on {order.received_at ? format(new Date(order.received_at), 'PPP p') : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                                    Notes
                                </h3>
                                {!isEditing ? (
                                    <button onClick={() => setIsEditing(true)} className="text-xs text-primary hover:underline">Edit</button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsEditing(false)} className="text-xs text-muted-foreground">Cancel</button>
                                        <button onClick={handleSaveNotes} disabled={loading} className="text-xs text-primary font-bold">Save</button>
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

                    </div>


                    {/* Right Column: Financials */}
                    <div className="space-y-6">
                        {/* Financial Summary */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Total Amount</div>
                                <div className="text-2xl font-bold">KES {order.total_amount?.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground mt-1">+ Variable Costs (Separate)</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                                <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Paid Amount</div>
                                <div className={`text-2xl font-bold ${order.paid_amount >= order.total_amount ? 'text-green-600' : 'text-orange-600'}`}>
                                    KES {order.paid_amount?.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Due: KES {Math.max(0, order.total_amount - order.paid_amount).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Payments Section */}
                        <div className="bg-card w-full border border-border rounded-2xl overflow-hidden flex flex-col">
                            <div className="p-4 bg-muted/10 border-b border-border flex justify-between items-center">
                                <h3 className="font-semibold">Payments</h3>
                                {!isFullyPaid && (
                                    <button
                                        onClick={() => setShowAddPayment(!showAddPayment)}
                                        className="text-xs bg-white border border-border px-2 py-1 rounded shadow-sm hover:bg-muted transition-colors"
                                    >
                                        {showAddPayment ? 'Cancel' : '+ Record Payment'}
                                    </button>
                                )}
                            </div>

                            {showAddPayment && !isFullyPaid && (
                                <div className="p-4 bg-muted/20 border-b border-border space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase">New Payment</h4>
                                    <div className="space-y-2">
                                        <input
                                            type="number"
                                            placeholder="Amount (KES)"
                                            value={newPaymentAmount}
                                            onChange={e => setNewPaymentAmount(e.target.value)}
                                            min="0"
                                            max={remainingBalance}
                                            className="w-full h-9 px-3 rounded-lg border border-input text-sm"
                                        />
                                        <select
                                            value={newPaymentMethod}
                                            onChange={e => setNewPaymentMethod(e.target.value)}
                                            className="w-full h-9 px-3 rounded-lg border border-input text-sm bg-background"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="mpesa">M-Pesa</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="capital">Capital Injection</option>
                                        </select>
                                        <button
                                            onClick={handleAddPayment}
                                            disabled={loading}
                                            className="w-full h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Record Payment'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isFullyPaid && showAddPayment && (
                                <div className="p-4 bg-green-50 border-b border-green-100 text-center text-green-700 text-sm font-medium">
                                    Order is fully paid.
                                </div>
                            )}

                            <div className="max-h-[300px] overflow-y-auto">
                                {loadingPayments ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
                                ) : payments.length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm italic">No payments recorded</div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {payments.map(pay => (
                                            <div key={pay.id} className="p-3 hover:bg-muted/5 flex justify-between items-center">
                                                <div>
                                                    <div className="font-medium text-sm">KES {pay.amount.toLocaleString()}</div>
                                                    <div className="text-xs text-muted-foreground capitalize">{pay.payment_method?.replace('_', ' ')}</div>
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <div>{(pay.payment_date || pay.created_at) ? format(new Date(pay.payment_date || pay.created_at), 'MMM d, yyyy') : 'N/A'}</div>
                                                    {pay.notes && <div className="max-w-[100px] truncate" title={pay.notes}>{pay.notes}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                                This will add the items to your inventory count and update the <b>Cost Price</b> for these products based on the Landed Cost (Items Cost + Variable Costs).
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
            </DialogContent>
        </Dialog >
    );
}
