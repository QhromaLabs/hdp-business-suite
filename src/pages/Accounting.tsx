import {
  Wallet,
  TrendingUp,
  CreditCard,
  Building2,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useFinancialSummary,
  useExpensesByCategory,
  useBankTransactions,
  useBankAccounts,
  useExpenses,
  useRecordExpense,
  useDeleteExpense,
  usePayments,
  useProductionRuns,
  useCreditorTransactions,
} from '@/hooks/useAccounting';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function Accounting() {
  const { data: financialSummary, isLoading: summaryLoading } = useFinancialSummary();
  const { data: expenseCategories = [], isLoading: expensesLoading } = useExpensesByCategory();
  const { data: transactions = [], isLoading: transactionsLoading } = useBankTransactions();
  const { data: bankAccounts = [], isLoading: accountsLoading } = useBankAccounts();
  const { data: expenses = [], isLoading: expensesListLoading } = useExpenses();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: productionRuns = [], isLoading: productionLoading } = useProductionRuns();
  const { data: creditorTransactions = [], isLoading: creditorTxLoading } = useCreditorTransactions();
  const { mutateAsync: recordExpense, isPending: savingExpense } = useRecordExpense();
  const { mutate: deleteExpense } = useDeleteExpense();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [expenseForm, setExpenseForm] = useState({
    category: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const DEFAULT_EXPENSE_CATEGORIES = [
    'Rent',
    'Fuel',
    'Usable', // As requested
    'Electricity',
    'Car Service',
    'Airtime',
    'Office Costs',
    'On Assigned Wages',
    'Shipping Handling Costs',
    'Custom Taxes',
    'Shipping Freight Charges',
  ];

  const isLoading =
    summaryLoading ||
    expensesLoading ||
    transactionsLoading ||
    accountsLoading ||
    expensesListLoading ||
    paymentsLoading ||
    productionLoading ||
    creditorTxLoading;

  const availableCategories = useMemo(() => {
    const existingNames = expenseCategories.map((c) => c.name);
    const allCategories = [...new Set([...DEFAULT_EXPENSE_CATEGORIES, ...existingNames])];
    return allCategories.filter(Boolean).sort();
  }, [expenseCategories]);

  const workingCapital =
    (financialSummary?.cashBalance || 0) +
    (financialSummary?.receivables || 0) -
    (financialSummary?.payables || 0);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNumber = Number(expenseForm.amount);

    if (!expenseForm.category || !expenseForm.description || !expenseForm.amount) {
      toast({
        variant: 'destructive',
        title: 'Missing details',
        description: 'Add category, description, and amount to record an expense.',
      });
      return;
    }

    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Enter a positive amount before saving.',
      });
      return;
    }

    try {
      await recordExpense({
        category: expenseForm.category,
        description: expenseForm.description,
        amount: amountNumber,
        expense_date: expenseForm.expense_date,
        reference_number: expenseForm.reference_number || null,
      });

      toast({
        title: 'Expense logged',
        description: 'We updated your ledger and refreshed the finance snapshot.',
      });

      setExpenseForm((prev) => ({
        ...prev,
        description: '',
        amount: '',
        reference_number: '',
        // Keep category for faster entry of similar expenses
      }));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Unable to record expense',
        description: error instanceof Error ? error.message : 'Please try again shortly.',
      });
    }
  };

  const handleDeleteExpense = (id: string, description: string) => {
    if (confirm(`Are you sure you want to delete the expense: "${description}"?`)) {
      deleteExpense(id, {
        onSuccess: () => {
          toast({
            title: 'Expense removed',
            description: 'The ledger has been updated successfully.',
          });
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Deletion failed',
            description: error instanceof Error ? error.message : 'Please try again.',
          });
        },
      });
    }
  };

  const isCreditTxn = (txnType: string) => {
    const type = txnType.toLowerCase();
    return ['credit', 'deposit', 'income', 'inflow', 'receive', 'received'].some((t) => type.includes(t));
  };

  const stats = [
    {
      title: 'Total Revenue',
      value: financialSummary?.revenue || 0,
      icon: Wallet,
      color: 'primary',
    },
    {
      title: 'Net Profit',
      value: financialSummary?.netProfit || 0,
      icon: TrendingUp,
      color: 'success',
    },
    {
      title: 'Cash Balance',
      value: financialSummary?.cashBalance || 0,
      icon: Wallet,
      color: 'warning',
    },
    {
      title: 'Receivables',
      value: financialSummary?.receivables || 0,
      icon: CreditCard,
      color: 'destructive',
    },
  ];

  const receivables = financialSummary?.receivables || 0;
  const payables = financialSummary?.payables || 0;
  const cashBalance = financialSummary?.cashBalance || 0;
  const liquidityCover = payables > 0 ? ((cashBalance + receivables) / payables).toFixed(2) : 'N/A';
  const topExpenses = expenses.slice(0, 6);

  const manufacturingExpenses = expenses.filter((e) => e.is_manufacturing_cost);
  const manufacturingExpenseTotal = manufacturingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const productionRunCosts = productionRuns.reduce((sum, run) => sum + Number(run.production_cost || 0), 0);
  const totalManufacturingSpend = manufacturingExpenseTotal + productionRunCosts;

  const recentTransactions = transactions.filter((txn) => {
    const txnDate = new Date(txn.transaction_date);
    const now = new Date();
    const diffDays = (now.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  });

  const cashIn30 = recentTransactions
    .filter((txn) => isCreditTxn(txn.transaction_type))
    .reduce((sum, txn) => sum + Number(txn.amount), 0);
  const cashOut30 = recentTransactions
    .filter((txn) => !isCreditTxn(txn.transaction_type))
    .reduce((sum, txn) => sum + Number(txn.amount), 0);

  const creditorPayouts = creditorTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0);

  const paymentMethodBreakdown = payments.reduce((acc, payment) => {
    const method = payment.payment_method || 'unknown';
    acc[method] = (acc[method] || 0) + Number(payment.amount);
    return acc;
  }, {} as Record<string, number>);

  const topPaymentMethods = Object.entries(paymentMethodBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton actions={2} />
        <StatsSkeleton />
        <CardGridSkeleton cards={6} />
        <TableSkeleton rows={6} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      {/* Premium Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="group bg-card rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  'p-3 rounded-2xl transition-transform group-hover:scale-110 duration-500',
                  stat.color === 'primary' && 'bg-primary/10 text-primary',
                  stat.color === 'success' && 'bg-success/10 text-success',
                  stat.color === 'warning' && 'bg-warning/10 text-warning',
                  stat.color === 'destructive' && 'bg-destructive/10 text-destructive',
                )}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(stat.value)}</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">{stat.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expense Management Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="xl:col-span-2">
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-bold text-foreground">Record an Expense</p>
                <p className="text-xs text-muted-foreground">Post an outflow straight into the ledger</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">Instant</div>
            </div>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleExpenseSubmit}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category">Category</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      setExpenseForm((prev) => ({ ...prev, category: '' }));
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {isCustomCategory ? 'Select from list' : 'Type custom category'}
                  </button>
                </div>
                {!isCustomCategory ? (
                  <Select
                    value={expenseForm.category}
                    onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="category" className="h-11 rounded-xl bg-card border-border/60">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {availableCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="category"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="h-11 rounded-xl bg-card border-border/60"
                    placeholder="Type a category name"
                    autoFocus
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="h-11 rounded-xl bg-card border-border/60"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="min-h-[96px] rounded-2xl bg-card border-border/60"
                  placeholder="Describe the expense or vendor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_date">Expense Date</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, expense_date: e.target.value }))}
                  className="h-11 rounded-xl bg-card border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference</Label>
                <Input
                  id="reference_number"
                  value={expenseForm.reference_number}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, reference_number: e.target.value }))}
                  className="h-11 rounded-xl bg-card border-border/60"
                  placeholder="Invoice or receipt number"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingExpense}
                  className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  {savingExpense ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" /> Log expense
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Recent Expenses</h3>
              <p className="text-xs text-muted-foreground">Newest entries first</p>
            </div>
            <span className="text-[11px] px-3 py-1 rounded-full bg-secondary/50 text-muted-foreground font-semibold">
              {expenses.length} tracked
            </span>
          </div>
          {topExpenses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">No expenses posted yet.</div>
          ) : (
            <div className="space-y-3">
              {topExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate max-w-[160px]">
                      {expense.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                      {expense.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">-{formatCurrency(Number(expense.amount))}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(expense.expense_date).toLocaleDateString('en-KE', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    {!expense.id.startsWith('bank-') && (
                      <button
                        onClick={() => handleDeleteExpense(expense.id, expense.description)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Premium P&L & Expenses */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-foreground">Financial Performance</h3>
                <p className="text-sm text-muted-foreground">Detailed Profit & Loss analytics</p>
              </div>
              <button
                onClick={() => navigate('/audit')}
                className="btn-primary rounded-2xl shadow-lg premium-glow h-12 px-6"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                Full Audit
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-success/5 border border-success/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-sm font-medium text-success mb-2">Total Inflow</p>
                  <p className="text-3xl font-bold text-foreground">{formatCurrency(financialSummary?.revenue || 0)}</p>
                </div>
                <ArrowUpRight className="absolute -bottom-2 -right-2 w-20 h-20 text-success/10 group-hover:scale-125 transition-transform duration-700" />
              </div>
              <div className="bg-destructive/5 border border-destructive/10 p-6 rounded-2xl relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-sm font-medium text-destructive mb-2">Total Outflow</p>
                  <p className="text-3xl font-bold text-foreground">{formatCurrency(financialSummary?.expenses || 0)}</p>
                </div>
                <ArrowDownRight className="absolute -bottom-2 -right-2 w-20 h-20 text-destructive/10 group-hover:scale-125 transition-transform duration-700" />
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-muted-foreground">Net Performance</span>
                <span className="text-xs font-medium text-primary">Calculated Real-time</span>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-4xl font-bold text-primary tracking-tight">
                  {formatCurrency(financialSummary?.netProfit || 0)}
                </p>
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                  <span className="px-3 py-1 bg-success/10 text-success text-xs font-semibold rounded-lg">Healthy Margin</span>
                </div>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground">Expense Vertical Breakdown</h4>
                <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">Categories List</button>
              </div>
              {expenseCategories.length === 0 ? (
                <div className="py-8 bg-muted/20 rounded-2xl text-center">
                  <p className="text-sm font-medium text-muted-foreground opacity-60">Zero recorded outflows</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {expenseCategories.map((category) => (
                    <div key={category.name} className="group">
                      <div className="flex items-center justify-between text-xs font-medium mb-2">
                        <span className="text-foreground">{category.name}</span>
                        <div className="flex gap-2 items-baseline">
                          <span className="text-muted-foreground">{category.percentage}%</span>
                          <span className="text-foreground font-bold">{formatCurrency(category.amount)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000 ease-out group-hover:opacity-80"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Elevated Transaction Ledger */}
        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">Ledger Stream</h3>
              <p className="text-xs text-muted-foreground">Live reconciliation events</p>
            </div>
            <button className="w-10 h-10 rounded-2xl bg-secondary/50 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
              <TrendingUp className="w-4 h-4" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
              <FileText className="w-12 h-12 opacity-30 mb-4" />
              <p className="text-xs font-medium uppercase tracking-wider opacity-50">No entries detected</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {transactions.map((txn, idx) => {
                const isCredit = txn.transaction_type === 'credit' || txn.transaction_type === 'deposit';
                return (
                  <div key={txn.id} className="group flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-transform group-hover:rotate-12',
                        isCredit ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      )}>
                        {isCredit
                          ? <ArrowUpRight className="w-5 h-5" />
                          : <ArrowDownRight className="w-5 h-5" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                          {txn.description || txn.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(txn.transaction_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-sm font-bold',
                        isCredit ? 'text-success' : 'text-destructive'
                      )}>
                        {isCredit ? '+' : '-'}{formatCurrency(Number(txn.amount))}
                      </p>
                      <span className={cn(
                        'text-[10px] font-semibold uppercase',
                        txn.is_reconciled ? 'text-success' : 'text-warning'
                      )}>
                        {txn.is_reconciled ? 'Reconciled' : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button className="w-full mt-6 py-4 bg-muted/30 rounded-2xl text-xs font-semibold uppercase text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all tracking-wider">
            Request Full Statement
          </button>
        </div>
      </div>

      {/* Operational insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">30-day cashflow</p>
              <p className="text-lg font-bold text-foreground">In {formatCurrency(cashIn30)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Out</p>
              <p className="text-base font-semibold text-destructive">-{formatCurrency(cashOut30)}</p>
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: cashIn30 + cashOut30 === 0 ? '0%' : `${Math.min(100, (cashIn30 / (cashIn30 + cashOut30)) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Based on bank transactions in the last 30 days</p>
        </div>

        <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Manufacturing spend</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalManufacturingSpend)}</p>
            </div>
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Production runs</span>
              <span className="text-foreground font-semibold">{formatCurrency(productionRunCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span>Flagged expenses</span>
              <span className="text-foreground font-semibold">{formatCurrency(manufacturingExpenseTotal)}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Includes expenses marked manufacturing and production_run costs</p>
        </div>

        <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Collections vs payouts</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(financialSummary?.revenue || 0)}</p>
            </div>
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Creditor payouts</span>
              <span className="text-destructive font-semibold">-{formatCurrency(creditorPayouts)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending payables</span>
              <span className="text-foreground font-semibold">{formatCurrency(payables)}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Uses payments received and creditor transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Working Capital</p>
                  <p className="text-3xl font-bold text-foreground">{formatCurrency(workingCapital)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Cash + receivables - payables</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">Liquidity</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-4 rounded-2xl bg-success/5 border border-success/10">
                  <p className="text-[11px] font-semibold text-success uppercase">Receivables</p>
                  <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(receivables)}</p>
                  <p className="text-[11px] text-muted-foreground">Expected inflow</p>
                </div>
                <div className="p-4 rounded-2xl bg-warning/5 border border-warning/10">
                  <p className="text-[11px] font-semibold text-warning uppercase">Payables</p>
                  <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(payables)}</p>
                  <p className="text-[11px] text-muted-foreground">Upcoming outflow</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Liquidity cover</span>
                <span className="text-sm font-semibold text-primary">{liquidityCover}x</span>
              </div>
            </div>

            <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Cash Availability</p>
                  <p className="text-xs text-muted-foreground">Receivables + cash reserves</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-secondary/60 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Ready</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(cashBalance + receivables)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Cash on hand</span>
                  <span className="text-foreground">{formatCurrency(cashBalance)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Receivables pipeline</span>
                  <span className="text-foreground">{formatCurrency(receivables)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Payables</span>
                  <span className="text-destructive">{formatCurrency(payables)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="space-y-6">
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Cash & Banks</h3>
                <p className="text-xs text-muted-foreground">Active treasury positions</p>
              </div>
              <span className="text-[11px] px-3 py-1 rounded-full bg-muted text-muted-foreground font-semibold">
                {bankAccounts.length} accounts
              </span>
            </div>
            {bankAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No bank accounts captured yet.</div>
            ) : (
              <div className="space-y-3">
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{account.account_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {account.bank_name} - {account.account_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(account.current_balance)}</p>
                      <span className="text-[10px] font-semibold text-success uppercase">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Payment Methods</h3>
                <p className="text-xs text-muted-foreground">Collections by channel</p>
              </div>
              <span className="text-[11px] px-3 py-1 rounded-full bg-muted text-muted-foreground font-semibold">
                {payments.length} receipts
              </span>
            </div>
            {topPaymentMethods.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">No payments collected yet.</div>
            ) : (
              <div className="space-y-3">
                {topPaymentMethods.map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between p-3 bg-card rounded-2xl border border-border/50">
                    <div>
                      <p className="text-sm font-semibold text-foreground capitalize">{method.replaceAll('_', ' ')}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Method</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Premium Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Balance Sheet', icon: FileText, desc: 'Equity & Liability overview' },
          { label: 'Cash Flow', icon: TrendingUp, desc: 'Opex vs Capex streams' },
          { label: 'Reconciliation', icon: Building2, desc: 'Sync with bank ledgers' },
          { label: 'Record Expense', icon: Plus, desc: 'Register a direct outflow', primary: true },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className={cn(
                "group relative bg-card rounded-3xl border border-border/50 p-6 flex flex-col items-start gap-4 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden",
                action.primary && "border-primary/20 bg-primary/5 shadow-glow"
              )}
            >
              <div className={cn(
                "p-4 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 shadow-sm",
                action.primary ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-foreground text-sm">{action.label}</span>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {action.desc}
                </p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-4 h-4 text-primary" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
