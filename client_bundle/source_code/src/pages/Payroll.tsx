
import { useState } from 'react';
import {
    Wallet,
    Loader2,
    Banknote,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import { usePayrollSummary, useRunPayroll, usePayrollEntries, usePayPayrollEntry } from '@/hooks/useEmployees';
import { useWithdrawalRequests } from '@/hooks/useCommissions';
import { cn } from '@/lib/utils';
import { PageHeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useBankAccounts } from '@/hooks/useAccounting';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function Payroll() {
    // Existing Payroll Hooks
    const { data: payrollSummary, isLoading: payrollLoading } = usePayrollSummary();
    const { data: payrollEntries = [], isLoading: entriesLoading } = usePayrollEntries();
    const runPayroll = useRunPayroll();
    const payPayrollEntry = usePayPayrollEntry();
    
    const { data: bankAccounts = [] } = useBankAccounts();
    const [selectedEntry, setSelectedEntry] = useState<any>(null);
    const [payAmount, setPayAmount] = useState<string>('');
    const [selectedAccount, setSelectedAccount] = useState<string>('cash');

    const handleOpenPayment = (entry: any) => {
        setSelectedEntry(entry);
        setPayAmount(entry.net_salary.toString());
        setSelectedAccount('cash');
    };

    const handleConfirmPayment = () => {
        if (!selectedEntry) return;
        payPayrollEntry.mutate({
            id: selectedEntry.id,
            amount: Number(payAmount) || 0,
            accountId: selectedAccount === 'cash' ? undefined : selectedAccount,
            employeeName: selectedEntry.employee?.full_name
        });
        setSelectedEntry(null);
    };

    // Commission Hooks
    const { data: withdrawals = [], isLoading: withdrawalsLoading } = useWithdrawalRequests();

    const isLoading = payrollLoading || entriesLoading || withdrawalsLoading;

    // Commission Stats
    const paidWithdrawals = withdrawals.filter(w => w.status === 'paid');
    const totalCommissionPaid = paidWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

    if (isLoading) {
        return (
            <div className="space-y-6 animate-fade-in">
                <PageHeaderSkeleton actions={1} />
                <StatsSkeleton />
                <TableSkeleton rows={5} columns={5} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in text-left">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Payroll & Commissions</h1>
                <p className="text-sm text-muted-foreground">Manage employee salaries and agent commission payouts</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payroll</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(payrollSummary?.netPayroll || 0)}</div>
                        <p className="text-xs text-muted-foreground">Variable monthly estimate</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commission Payouts</CardTitle>
                        <Banknote className="h-4 w-4 text-success" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalCommissionPaid)}</div>
                        <p className="text-xs text-muted-foreground">Total commissions paid via withdrawals</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(payrollSummary?.deductions || 0)}</div>
                        <p className="text-xs text-muted-foreground">Tax & other deductions</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Payroll Ledger */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-inner">
                        <CardHeader>
                            <CardTitle>Combined Ledger</CardTitle>
                            <CardDescription>Salary and Commission breakdown</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Base Salaries</span>
                                <span className="text-base font-semibold text-foreground">
                                    {formatCurrency(payrollSummary?.totalSalaries || 0)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Agent Commissions (Paid)</span>
                                <span className="text-base font-semibold text-foreground">
                                    +{formatCurrency(totalCommissionPaid)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Allowances</span>
                                <span className="text-base font-semibold text-success">
                                    +{formatCurrency(payrollSummary?.allowances || 0)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Deductions</span>
                                <span className="text-base font-semibold text-destructive">
                                    -{formatCurrency(payrollSummary?.deductions || 0)}
                                </span>
                            </div>

                            <div className="pt-6 border-t border-primary/20">
                                <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-primary">Total Outflow Estimate</span>
                                        <Wallet className="w-4 h-4 text-primary" />
                                    </div>
                                    <p className="text-3xl font-semibold text-primary">
                                        {formatCurrency((payrollSummary?.netPayroll || 0) + totalCommissionPaid)}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => runPayroll.mutate()}
                                className="btn-primary w-full mt-6 h-14 rounded-2xl font-semibold text-lg shadow-lg premium-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                disabled={runPayroll.isPending}
                            >
                                {runPayroll.isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing Salaries...
                                    </>
                                ) : (
                                    'RUN SALARY PAYROLL'
                                )}
                            </button>
                            <p className="text-xs text-center text-muted-foreground">
                                * Commissions are paid separately via the Commissions page.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Transactions List */}
                <div className="space-y-6">
                    <Card className="bg-card/40 backdrop-blur-md border-border/50 shadow-inner h-full">
                        <CardHeader>
                            <CardTitle>Recent Payouts</CardTitle>
                            <CardDescription>Latest salaries and commissions</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                            {/* Salary Entries */}
                            {payrollEntries.map((p) => (
                                <div key={`pymt-${p.id}`} className="p-4 rounded-2xl bg-card border border-border/50 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-foreground">{p.employee?.full_name || 'Employee'}</p>
                                        <p className="text-xs text-muted-foreground">Salary • {new Date(p.pay_period_end).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <p className="text-sm font-semibold text-foreground">{formatCurrency(p.net_salary)}</p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={p.status === 'pending' ? 'outline' : 'default'} className="text-[10px]">
                                                    {p.status}
                                                </Badge>
                                                {p.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleOpenPayment(p)}
                                                        className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                                                    >
                                                        {payPayrollEntry.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                                        {payPayrollEntry.isPending ? 'Processing' : 'PAY NOW'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* Commission Withdrawals */}
                            {paidWithdrawals.slice(0, 10).map((w) => (
                                <div key={`wd-${w.id}`} className="p-4 rounded-2xl bg-card border border-border/50 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-foreground">{w.sales_agent?.full_name || 'Agent'}</p>
                                        <p className="text-xs text-muted-foreground">Commission • {new Date(w.requested_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-foreground">{formatCurrency(w.amount)}</p>
                                        <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                                            {w.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}

                            {payrollEntries.length === 0 && paidWithdrawals.length === 0 && (
                                <p className="text-sm text-center text-muted-foreground py-10">No recent transactions.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Payroll Payment</DialogTitle>
                        <DialogDescription>
                            Process salary payout for <span className="font-bold text-foreground">{selectedEntry?.employee?.full_name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="payAmount">Final Payout Amount (KES)</Label>
                            <Input 
                                id="payAmount" 
                                type="number" 
                                value={payAmount} 
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="font-bold text-lg"
                            />
                            <p className="text-xs text-muted-foreground">You can adjust this amount if they were terminated or received a deduction.</p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="account">Payment Channel</Label>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment channel" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash / External (No Bank Deduction)</SelectItem>
                                    {bankAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.account_name} ({formatCurrency(acc.current_balance)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Selecting a bank account will automatically deduct the amount from its balance.</p>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedEntry(null)}>Cancel</Button>
                        <Button onClick={handleConfirmPayment} className="font-bold">Process Payment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
