
import {
    Wallet,
    Loader2,
    Banknote,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import { usePayrollSummary, useRunPayroll, usePayrollEntries } from '@/hooks/useEmployees';
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
                                        <p className="text-sm font-semibold text-foreground">{formatCurrency(p.net_salary)}</p>
                                        <Badge variant={p.status === 'pending' ? 'outline' : 'default'} className="text-[10px]">
                                            {p.status}
                                        </Badge>
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
        </div>
    );
}
