import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Save, Loader2, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface RecordCustomerPaymentModalProps {
    customer: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RecordCustomerPaymentModal({ customer, onClose, onSuccess }: RecordCustomerPaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');

    const creditBalance = Number(customer.credit_balance || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);

        if (!paymentAmount || paymentAmount <= 0) {
            toast.error('Please enter a valid payment amount');
            return;
        }

        if (paymentAmount > creditBalance) {
            toast.error(`Payment cannot exceed outstanding balance of KES ${creditBalance.toLocaleString()}`);
            return;
        }

        setLoading(true);
        try {
            // 1. Record Payment
            const { error: payError } = await supabase
                .from('payments')
                .insert([{
                    customer_id: customer.id,
                    amount: paymentAmount,
                    created_at: new Date(paymentDate).toISOString(),
                    payment_method: paymentMethod as any, // Cast to any if enum type issues arise, or match exact enum
                    status: 'completed',
                    order_id: null // Explicitly null for credit payments
                }]);

            if (payError) throw payError;

            // 2. Update Customer Balance
            const newBalance = creditBalance - paymentAmount;
            const { error: updateError } = await supabase
                .from('customers')
                .update({
                    credit_balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', customer.id);

            if (updateError) throw updateError;

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
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-card border-border shadow-2xl">
                <DialogHeader className="border-b border-border pb-4 bg-muted/20 -mx-6 -mt-6 p-6">
                    <DialogTitle>
                        <span className="block text-xl font-bold">Receive Payment</span>
                        <span className="block text-sm text-muted-foreground font-normal mt-1">{customer.name}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 mb-6 flex justify-between items-center">
                        <span className="text-sm font-medium">Current Credit Balance</span>
                        <span className="font-bold text-lg">KES {creditBalance.toLocaleString()}</span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Payment Amount (KES)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max={creditBalance}
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
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Reason, reference, etc..."
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
            </DialogContent>
        </Dialog>
    );
}
