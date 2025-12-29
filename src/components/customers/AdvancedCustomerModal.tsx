import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming shadcn Tabs component exists or using basic buttons
import { User, Phone, Mail, MapPin, CreditCard, Calendar, Building, History, AlertCircle, Plus, Minus, DollarSign, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useCustomerHistory } from '@/hooks/useCustomerHistory';
import { useCustomer } from '@/hooks/useCustomers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import RecordCustomerPaymentModal from './RecordCustomerPaymentModal';

interface AdvancedCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: any;
}

export function AdvancedCustomerModal({ isOpen, onClose, customer }: AdvancedCustomerModalProps) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('overview');
    const { data: currentCustomer, isLoading: customerLoading } = useCustomer(customer?.id);
    const { data: history, isLoading: historyLoading } = useCustomerHistory(customer?.id);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Use the live data from React Query, fallback to prop if loading
    const displayCustomer = currentCustomer || customer;

    // Adjustment State
    const [showAdjustmentInput, setShowAdjustmentInput] = useState(false);
    const [adjAmount, setAdjAmount] = useState('');
    const [adjReason, setAdjReason] = useState('');
    const [adjType, setAdjType] = useState<'increase' | 'decrease'>('decrease');
    const [loading, setLoading] = useState(false);

    if (!displayCustomer) return null;

    const handleAdjustment = async () => {
        if (!adjAmount || !adjReason) return toast.error("Please provide amount and reason");
        setLoading(true);
        try {
            const amount = parseFloat(adjAmount);
            const finalAmount = adjType === 'increase' ? amount : -amount;

            // 1. Log Adjustment
            const { error: logError } = await supabase.from('customer_adjustments').insert([{
                customer_id: displayCustomer.id,
                amount: finalAmount,
                reason: adjReason
            }]);
            if (logError) throw logError;

            // 2. Update Balance
            const newBalance = (Number(displayCustomer.credit_balance) || 0) + finalAmount;
            const { error: updateError } = await supabase
                .from('customers')
                .update({ credit_balance: newBalance })
                .eq('id', displayCustomer.id);
            if (updateError) throw updateError;

            toast.success("Balance adjusted successfully");
            setAdjAmount('');
            setAdjReason('');
            setShowAdjustmentInput(false);
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer', displayCustomer.id] });
            queryClient.invalidateQueries({ queryKey: ['customer_history'] });

        } catch (e: any) {
            toast.error("Failed to adjust: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const details = [
        { label: 'Email', value: displayCustomer.email || 'N/A', icon: Mail },
        { label: 'Phone', value: displayCustomer.phone || 'N/A', icon: Phone },
        { label: 'Address', value: displayCustomer.address || 'N/A', icon: MapPin },
        { label: 'Type', value: displayCustomer.customer_type, icon: Building, capitalize: true },
        { label: 'Joined', value: new Date(displayCustomer.created_at).toLocaleDateString(), icon: Calendar },
    ];

    const balance = Number(displayCustomer.credit_balance || 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden bg-card border-border/50">
                <div className="p-6 border-b border-border bg-muted/10 shrink-0">
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                            <span className="font-bold text-xl">{displayCustomer.name.charAt(0)}</span>
                        </div>
                        <div>
                            <div className="font-bold">{displayCustomer.name}</div>
                            <div className="text-sm text-muted-foreground font-normal flex items-center gap-2">
                                <span className="capitalize">{displayCustomer.customer_type}</span> • {displayCustomer.email || displayCustomer.phone || 'No contact info'}
                            </div>
                        </div>
                        <div className="ml-auto text-right hidden sm:block">
                            <div className="text-sm text-muted-foreground">Current Balance</div>
                            <div className={`text-xl font-bold ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                KES {balance.toLocaleString()}
                            </div>
                        </div>
                    </DialogTitle>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex p-2 bg-muted/20 border-b border-border gap-1 shrink-0">
                        {['overview', 'financials', 'history'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all flex-1 ${activeTab === tab
                                    ? 'bg-background shadow-sm text-foreground ring-1 ring-border/50'
                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                                {details.map((item) => (
                                    <div key={item.label} className="flex items-center gap-3 p-4 bg-muted/5 rounded-2xl border border-border/50">
                                        <div className="p-2.5 bg-background rounded-xl text-muted-foreground shadow-sm ring-1 ring-border/20">
                                            <item.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                                            <p className={`font-semibold text-foreground ${item.capitalize ? 'capitalize' : ''}`}>
                                                {item.value}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div className="col-span-full p-4 bg-blue-50/50 text-blue-700 rounded-2xl border border-blue-100 flex gap-3 items-start mt-4">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold">Customer Notes</h4>
                                        <p className="text-sm opacity-90 mt-1">
                                            No notes added for this customer yet. You can add notes during transactions or implementation logic to support customer-level notes.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* FINANCIALS TAB */}
                        {activeTab === 'financials' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="p-6 bg-gradient-to-br from-card to-muted/20 rounded-3xl border border-border shadow-sm text-center">
                                    <p className="text-muted-foreground font-medium mb-2">Outstanding Balance</p>
                                    <div className={`text-4xl font-bold mb-6 ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        KES {balance.toLocaleString()}
                                    </div>
                                    <div className="flex justify-center gap-3">
                                        <button
                                            onClick={() => setShowPaymentModal(true)}
                                            className="px-6 py-2.5 bg-success hover:bg-success/90 text-white rounded-xl font-semibold shadow-lg shadow-success/20 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <CreditCard className="w-4 h-4" />
                                            Record Payment
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-muted/30 p-5 rounded-2xl border border-border animate-slide-up">
                                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-primary" />
                                        Manual Adjustment
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="flex gap-2 p-1 bg-background rounded-xl border w-fit">
                                            <button
                                                onClick={() => setAdjType('decrease')}
                                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${adjType === 'decrease' ? 'bg-success/10 text-success shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                            >
                                                Decrease Balance (-)
                                            </button>
                                            <button
                                                onClick={() => setAdjType('increase')}
                                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${adjType === 'increase' ? 'bg-destructive/10 text-destructive shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                            >
                                                Increase Balance (+)
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase">Amount</label>
                                                <input
                                                    type="number"
                                                    value={adjAmount}
                                                    onChange={e => setAdjAmount(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl border bg-background"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase">Reason</label>
                                                <input
                                                    type="text"
                                                    value={adjReason}
                                                    onChange={e => setAdjReason(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl border bg-background"
                                                    placeholder="e.g. Bad debt, Correction"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleAdjustment}
                                                disabled={loading}
                                                className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                                            >
                                                {loading ? "Processing..." : "Submit Adjustment"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* HISTORY TAB */}
                        {activeTab === 'history' && (
                            <div className="space-y-4 animate-fade-in">
                                {historyLoading ? (
                                    <div className="py-10 text-center text-muted-foreground">Loading history...</div>
                                ) : history?.length === 0 ? (
                                    <div className="py-10 text-center text-muted-foreground flex flex-col items-center">
                                        <History className="w-10 h-10 opacity-20 mb-2" />
                                        No activity recorded yet
                                    </div>
                                ) : (
                                    history?.map((item) => (
                                        <div key={item.id} className="flex gap-4 p-4 bg-muted/5 hover:bg-muted/10 border-b border-border/50 last:border-0 rounded-xl transition-colors group">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border 
                                                ${item.type === 'purchase' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                    item.type === 'payment' ? 'bg-green-50 text-green-600 border-green-100' :
                                                        'bg-gray-50 text-gray-600 border-gray-100'
                                                }`}>
                                                {item.type === 'purchase' && <CreditCard className="w-5 h-5" />}
                                                {item.type === 'payment' && <DollarSign className="w-5 h-5" />}
                                                {item.type === 'adjustment' && <Activity className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h5 className="font-semibold text-sm">{item.description}</h5>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {format(new Date(item.date), 'MMM dd, yyyy • hh:mm a')}
                                                            {item.reference && <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{item.reference}</span>}
                                                        </p>
                                                    </div>
                                                    <div className={`font-bold text-sm text-right ${item.type === 'purchase' || (item.type === 'adjustment' && item.amount > 0) ? 'text-red-500' :
                                                        item.type === 'payment' || (item.type === 'adjustment' && item.amount < 0) ? 'text-green-600' : ''
                                                        }`}>
                                                        {item.type === 'payment' ? '-' : '+'}{Math.abs(item.amount).toLocaleString()}
                                                    </div>
                                                </div>
                                                {item.status && (
                                                    <div className="mt-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${item.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                            }`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>

            {showPaymentModal && (
                <RecordCustomerPaymentModal
                    customer={displayCustomer}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['customers'] });
                        queryClient.invalidateQueries({ queryKey: ['customer', displayCustomer.id] });
                        queryClient.invalidateQueries({ queryKey: ['customer_history'] });
                    }}
                />
            )}
        </Dialog>
    );
}
