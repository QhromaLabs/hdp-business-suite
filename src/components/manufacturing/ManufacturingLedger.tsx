import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUpRight, ArrowDownLeft, Wallet, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardGridSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';

// Types
interface LedgerEntry {
    id: string;
    transaction_date: string;
    transaction_type: string;
    debit_account: string;
    credit_account: string;
    amount: number;
    notes: string;
    production_run?: {
        id: string;
        created_at: string;
    };
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(amount);
};

export function ManufacturingLedger() {
    const { data: ledgerEntries, isLoading } = useQuery({
        queryKey: ['manufacturing_ledger'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('manufacturing_ledger')
                .select(`
                    *,
                    production_run:production_runs(id, created_at)
                `)
                .order('transaction_date', { ascending: false });

            if (error) {
                // Graceful fallback if table doesn't exist yet (migration pending)
                console.warn("Ledger table might not exist yet:", error);
                return [];
            }
            return data as LedgerEntry[];
        }
    });

    const metrics = useMemo(() => {
        if (!ledgerEntries) return { wipValue: 0, manufacturingProfit: 0 };

        // WIP Value = Sum(Debits to WIP) - Sum(Credits to WIP)
        const entries = ledgerEntries as LedgerEntry[];
        const wipDebits = entries.filter(e => e.debit_account === 'WIP').reduce((sum, e) => sum + e.amount, 0);
        const wipCredits = entries.filter(e => e.credit_account === 'WIP').reduce((sum, e) => sum + e.amount, 0);

        // Manufacturing Profit = Sum(Amount where transaction_type is 'manufacturing_profit')
        const totalProfit = entries.filter(e => e.transaction_type === 'manufacturing_profit').reduce((sum, e) => sum + e.amount, 0);

        return {
            wipValue: Math.max(0, wipDebits - wipCredits),
            manufacturingProfit: totalProfit
        };
    }, [ledgerEntries]);

    if (isLoading) return <TableSkeleton rows={5} columns={4} />;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border/50 p-4 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold text-muted-foreground">Suspense Account (WIP)</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(metrics.wipValue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Value currently in production</p>
                </div>

                <div className="bg-card border border-border/50 p-4 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold text-muted-foreground">Manufacturing profit View</h3>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(metrics.manufacturingProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total profit generated from production markup</p>
                </div>
            </div>

            <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border/50 bg-muted/20">
                    <h3 className="font-semibold text-sm">General Ledger (Manufacturing)</h3>
                </div>

                {(!ledgerEntries || ledgerEntries.length === 0) ? (
                    <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                        <AlertCircle className="w-8 h-8 opacity-20 mb-2" />
                        <p>No transactions recorded yet.</p>
                        <p className="text-xs opacity-60">Complete a production batch to generate ledger entries.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Transaction</th>
                                    <th className="px-4 py-3">Accounts</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {ledgerEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                            {new Date(entry.transaction_date).toLocaleDateString()} <br />
                                            <span className="text-[10px] opacity-70">{new Date(entry.transaction_date).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-foreground">
                                                {entry.transaction_type.replace(/_/g, ' ')}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{entry.notes}</div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">
                                            <div className="flex items-center gap-1 text-emerald-600">
                                                <ArrowUpRight className="w-3 h-3" />
                                                DR: {entry.debit_account}
                                            </div>
                                            <div className="flex items-center gap-1 text-red-500/80">
                                                <ArrowDownLeft className="w-3 h-3" />
                                                CR: {entry.credit_account}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {formatCurrency(entry.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
