
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Save, Loader2, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface RecordPaymentModalProps {
    order: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RecordPaymentModal({ order, onClose, onSuccess }: RecordPaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');

    const remainingBalance = order.total_amount - (order.paid_amount || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);

        if (!paymentAmount || paymentAmount <= 0) {
            toast.error('Please enter a valid payment amount');
            return;
        }

        if (paymentAmount > remainingBalance) {
            toast.error(`Payment cannot exceed remaining balance of ${remainingBalance}`);
            return;
        }

        setLoading(true);
        try {
            const newPaidAmount = (order.paid_amount || 0) + paymentAmount;
            const newStatus = newPaidAmount >= order.total_amount ? 'completed' : 'partial';

            // 1. Update Purchase Order Status
            const { error: poError } = await supabase
                .from('purchase_orders')
                .update({
                    paid_amount: newPaidAmount,
                    status: newStatus
                })
                .eq('id', order.id);

            if (poError) throw poError;

            // 2. Create Creditor Transaction (Legder)
            const { error: txnError } = await supabase
                .from('creditor_transactions')
                .insert([{
                    creditor_id: order.creditor_id,
                    transaction_type: 'payment',
                    amount: paymentAmount,
                    reference_number: `PAY-${order.order_number}`,
                    notes: notes || `Payment for PO #${order.order_number}`,
                    created_at: new Date(paymentDate).toISOString()
                }]);

            if (txnError) throw txnError;

            // 3. Create Purchase Order Payment Record (Detailed Tracking)
            const { error: payError } = await supabase
                .from('purchase_order_payments')
                .insert([{
                    purchase_order_id: order.id,
                    amount: paymentAmount,
                    payment_date: new Date(paymentDate).toISOString(),
                    payment_method: paymentMethod,
                    reference_number: `PAY-${order.order_number}`,
                    notes: notes
                }]);

            if (payError) throw payError;

            // 4. Update Creditor Balance (Decrease Outstanding)
            const { data: creditorData, error: credError } = await supabase
                .from('creditors')
                .select('outstanding_balance')
                .eq('id', order.creditor_id)
                .single();

            if (credError) throw credError;

            const currentBalance = creditorData.outstanding_balance || 0;
            const { error: balanceError } = await supabase
                .from('creditors')
                .update({ outstanding_balance: currentBalance - paymentAmount })
                .eq('id', order.creditor_id);

            if (balanceError) throw balanceError;


            toast.success('Payment recorded successfully');
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Error recording payment:', error);
            toast.error('Failed to record payment: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-scale-in">

                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                    <div>
                        <h2 className="text-xl font-bold">Record Payment</h2>
                        <p className="text-sm text-muted-foreground">PO #{order.order_number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 bg-muted/10 border-b border-border">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-bold">KES {order.total_amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Already Paid:</span>
                        <span className="font-bold text-green-600">KES {order.paid_amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border mt-2">
                        <span className="font-medium">Remaining Balance:</span>
                        <span className="font-bold text-red-500">KES {remainingBalance.toLocaleString()}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Amount (KES)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="number"
                                required
                                min="1"
                                max={remainingBalance}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="date"
                                required
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Method</label>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="cash">Cash</option>
                                <option value="mpesa">M-Pesa</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="capital">Capital Injection</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Check number, bank transfer ref, etc..."
                            className="w-full px-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl font-medium hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Record Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
