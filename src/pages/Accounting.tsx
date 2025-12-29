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
import { usePayrollEntries } from '@/hooks/useEmployees';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';
import TransactionLedgerModal from '@/components/accounting/TransactionLedgerModal';

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
  const { data: payrollEntries = [], isLoading: payrollLoading } = usePayrollEntries();
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
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  const DEFAULT_EXPENSE_CATEGORIES = [
    'Rent',
    'Fuel',
    'Usable',
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

  // Use new nested structure
  const cashBalance = financialSummary?.assets?.cash || 0;
  const receivables = financialSummary?.assets?.receivables || 0;
  const payables = financialSummary?.liabilities?.payables || 0;

  // Calculate cash from payment methods (actual cash received)
  const paymentMethodBreakdown = payments.reduce(
    (acc, payment) => {
      const method = payment.payment_method || 'other';
      acc[method] = (acc[method] || 0) + Number(payment.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  // Use actual cash payments for cash balance instead of bank account data
  const actualCashBalance = paymentMethodBreakdown['cash'] || 0;

  const workingCapital = cashBalance + receivables - payables;

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNumber = Number(expenseForm.amount);

    if (!expenseForm.category || !expenseForm.description || !expenseForm.amount) {
      toast({ variant: 'destructive', title: 'Missing details', description: 'Add category, description, and amount.' });
      return;
    }

    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter a positive amount.' });
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

      toast({ title: 'Expense logged', description: 'Ledger updated successfully.' });

      setExpenseForm((prev) => ({ ...prev, description: '', amount: '', reference_number: '' }));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Please try again.' });
    }
  };

  const handleDeleteExpense = (id: string, description: string) => {
    if (confirm(`Delete expense: "${description}"?`)) {
      deleteExpense(id, {
        onSuccess: () => toast({ title: 'Expense removed' }),
        onError: (error) => toast({ variant: 'destructive', title: 'Failed', description: error instanceof Error ? error.message : 'Error' }),
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
      value: actualCashBalance,
      icon: Wallet,
      color: 'warning',
    },
    {
      title: 'Receivables',
      value: receivables,
      icon: CreditCard,
      color: 'destructive',
    },
  ];

  const liquidityCover = payables > 0 ? ((cashBalance + receivables) / payables).toFixed(2) : 'N/A';
  const topExpenses = expenses.slice(0, 6);

  // Create unified transaction ledger (income + expenses)
  const unifiedLedger = useMemo(() => {
    const ledgerItems: Array<{
      id: string;
      type: 'income' | 'expense';
      category: string;
      amount: number;
      date: string;
      description?: string;
    }> = [];

    // Add payments as income (money received from customers)
    payments.forEach(payment => {
      ledgerItems.push({
        id: payment.id,
        type: 'income',
        category: 'Payment Received',
        amount: payment.amount,
        date: payment.created_at,
        description: payment.payment_method
      });
    });

    // Add expenses as outflow (general business costs)
    expenses.forEach(expense => {
      ledgerItems.push({
        id: expense.id,
        type: 'expense',
        category: expense.category,
        amount: expense.amount,
        date: expense.expense_date,
        description: expense.description
      });
    });

    // Add creditor transactions (supplier payments)
    creditorTransactions.forEach(txn => {
      const isPayment = txn.transaction_type === 'payment';
      ledgerItems.push({
        id: txn.id,
        type: isPayment ? 'expense' : 'income', // Payment = expense, credit/refund = income
        category: isPayment ? 'Supplier Payment' : 'Supplier Credit',
        amount: txn.amount,
        date: txn.created_at,
        description: txn.notes || undefined
      });
    });

    // Add payroll disbursements (employee salary payments)
    payrollEntries
      .filter(entry => entry.status === 'paid')
      .forEach(entry => {
        ledgerItems.push({
          id: entry.id,
          type: 'expense',
          category: 'Payroll',
          amount: entry.net_salary,
          date: entry.payment_date || entry.created_at,
          description: `Salary - ${entry.employee?.full_name || 'Employee'}`
        });
      });

    // Sort by date (most recent first)
    return ledgerItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, expenses, creditorTransactions, payrollEntries]);

  // New Manufacturing Spend Calculation from Summary
  const totalManufacturingSpend = financialSummary?.breakdown?.manufacturing_spend || 0;

  // Manufacturing spend data comes from useFinancialSummary hook (raw_materials table)

  // Calculate 30-day cashflow from actual payments and expenses
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Cash IN: Payments received in last 30 days (from orders, including cash sales)
  const cashIn30 = payments
    .filter(payment => new Date(payment.created_at) >= thirtyDaysAgo)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  // Cash OUT: Expenses + Supplier Payments + Payroll in last 30 days
  const expensesLast30 = expenses
    .filter(expense => new Date(expense.expense_date) >= thirtyDaysAgo)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const supplierPaymentsLast30 = creditorTransactions
    .filter(txn => txn.transaction_type === 'payment' && new Date(txn.created_at) >= thirtyDaysAgo)
    .reduce((sum, txn) => sum + Number(txn.amount), 0);

  const payrollLast30 = payrollEntries
    .filter(entry => entry.status === 'paid' && new Date(entry.payment_date || entry.created_at) >= thirtyDaysAgo)
    .reduce((sum, entry) => sum + Number(entry.net_salary), 0);

  const cashOut30 = expensesLast30 + supplierPaymentsLast30 + payrollLast30;

  const creditorPayouts = creditorTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0);

  // Helper for Payment Methods (topPaymentMethods uses the paymentMethodBreakdown defined earlier)
  const topPaymentMethods = Object.entries(paymentMethodBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton actions={2} />
        <StatsSkeleton />
        <CardGridSkeleton cards={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="group bg-card rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className={cn('p-3 rounded-2xl transition-transform group-hover:scale-110 duration-500', stat.color === 'primary' && 'bg-primary/10 text-primary', stat.color === 'success' && 'bg-success/10 text-success', stat.color === 'warning' && 'bg-warning/10 text-warning', stat.color === 'destructive' && 'bg-destructive/10 text-destructive')}>
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

      {/* --- BALANCE SHEET SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
        {/* Assets Card */}
        <div className="bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Assets (What you Own)</h3>
                <p className="text-xs text-muted-foreground">Total: {formatCurrency(
                  (financialSummary?.assets?.stock || 0) +
                  (financialSummary?.assets?.fixed_assets || 0) +
                  (financialSummary?.assets?.receivables || 0) +
                  actualCashBalance
                )}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-card rounded-2xl border border-border/50">
              <div className="text-sm font-medium">Cash & Bank</div>
              <div className="font-bold">{formatCurrency(actualCashBalance)}</div>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded-2xl border border-border/50">
              <div className="text-sm font-medium">Inventory Stock <span className="text-[10px] text-muted-foreground ml-1">(Raw + Finished)</span></div>
              <div className="font-bold text-blue-600">{formatCurrency(financialSummary?.assets?.stock || 0)}</div>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded-2xl border border-border/50">
              <div className="text-sm font-medium">Equipment & Fixed Assets</div>
              <div className="font-bold">{formatCurrency(financialSummary?.assets?.fixed_assets || 0)}</div>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded-2xl border border-border/50">
              <div className="text-sm font-medium">Receivables (Owed by Customers)</div>
              <div className="font-bold">{formatCurrency(financialSummary?.assets?.receivables || 0)}</div>
            </div>
          </div>
        </div>

        {/* Liabilities Card */}
        <div className="bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Liabilities (What you Owe)</h3>
                <p className="text-xs text-muted-foreground">Total: {formatCurrency(financialSummary?.liabilities?.total || 0)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-card rounded-2xl border border-border/50">
              <div className="text-sm font-medium">Supplier Payables</div>
              <div className="font-bold text-red-500">{formatCurrency(financialSummary?.liabilities?.payables || 0)}</div>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded-2xl border border-border/50">
              <div className="text-sm font-medium">Pending Payroll</div>
              <div className="font-bold text-orange-500">{formatCurrency(financialSummary?.liabilities?.payroll || 0)}</div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="flex justify-between items-center">
                <div className="text-sm font-bold text-muted-foreground">Owner's Equity</div>
                <div className="text-2xl font-bold text-success">{formatCurrency(financialSummary?.equity || 0)}</div>
              </div>
              <p className="text-[10px] text-muted-foreground text-right mt-1">Assets - Liabilities</p>
            </div>
          </div>
        </div>
      </div>

      {/* Operational insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Manufacturing Spend Card */}
        <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Manufacturing Spend</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalManufacturingSpend)}</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground/80">
              <div className="flex justify-between">
                <span>Materials</span>
                <span className="text-foreground font-semibold">
                  {formatCurrency(financialSummary?.breakdown?.manufacturing_details?.materials || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Equipment</span>
                <span className="text-foreground font-semibold">
                  {formatCurrency(financialSummary?.breakdown?.manufacturing_details?.equipment || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Production Runs</span>
                <span className="text-foreground font-semibold">
                  {formatCurrency(financialSummary?.breakdown?.manufacturing_details?.production || 0)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 opacity-60">
            Source: Machines + {formatCurrency(financialSummary?.breakdown?.manufacturing_details?.production || 0)} Production
          </p>
        </div>

        {/* ... Rest of existing dashboard widgets (retained but condensed) ... */}
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
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="xl:col-span-2">
          {/* Expense Form Section - Retained */}
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
                <div>
                  <p className={cn("text-4xl font-bold tracking-tight", (financialSummary?.netProfit || 0) >= 0 ? "text-primary" : "text-destructive")}>
                    {formatCurrency(financialSummary?.netProfit || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gross: {formatCurrency(financialSummary?.grossProfit || 0)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                  <span className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg",
                    (financialSummary?.netProfit || 0) >= 0
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  )}>
                    {(financialSummary?.netProfit || 0) >= 0 ? "Profitable" : "Loss Making"}
                  </span>
                </div>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground">Spending Breakdown</h4>
                <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">Details</button>
              </div>

              <div className="space-y-4">
                {/* 1. Production Costs */}
                <div className="group">
                  <div className="flex items-center justify-between text-xs font-medium mb-2">
                    <span className="text-foreground">Manufacturing & Production</span>
                    <div className="flex gap-2 items-baseline">
                      <span className="text-muted-foreground">
                        {financialSummary?.expenses ? Math.round(((financialSummary.breakdown?.manufacturing_spend || 0) / financialSummary.expenses) * 100) : 0}%
                      </span>
                      <span className="text-foreground font-bold">{formatCurrency(financialSummary?.breakdown?.manufacturing_spend || 0)}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${financialSummary?.expenses ? ((financialSummary.breakdown?.manufacturing_spend || 0) / financialSummary.expenses) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* 2. Payroll */}
                <div className="group">
                  <div className="flex items-center justify-between text-xs font-medium mb-2">
                    <span className="text-foreground">Payroll & Salaries</span>
                    <div className="flex gap-2 items-baseline">
                      <span className="text-muted-foreground">
                        {financialSummary?.expenses ? Math.round(((financialSummary.breakdown?.payroll || 0) / financialSummary.expenses) * 100) : 0}%
                      </span>
                      <span className="text-foreground font-bold">{formatCurrency(financialSummary?.breakdown?.payroll || 0)}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${financialSummary?.expenses ? ((financialSummary.breakdown?.payroll || 0) / financialSummary.expenses) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* 3. General Expenses */}
                <div className="group">
                  <div className="flex items-center justify-between text-xs font-medium mb-2">
                    <span className="text-foreground">General Expenses</span>
                    <div className="flex gap-2 items-baseline">
                      <span className="text-muted-foreground">
                        {financialSummary?.expenses ? Math.round(((financialSummary.breakdown?.general || 0) / financialSummary.expenses) * 100) : 0}%
                      </span>
                      <span className="text-foreground font-bold">{formatCurrency(financialSummary?.breakdown?.general || 0)}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${financialSummary?.expenses ? ((financialSummary.breakdown?.general || 0) / financialSummary.expenses) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown (Sub-section) */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <h5 className="text-xs font-semibold text-muted-foreground mb-4">General Expense Categories</h5>
              {expenseCategories.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-muted-foreground opacity-60">No general expenses recorded</p>
                </div>
              ) : (
                <div className="space-y-3 pl-2 border-l-2 border-border/50">
                  {expenseCategories.map((category) => (
                    <div key={category.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{category.name}</span>
                      <span className="text-foreground font-medium">{formatCurrency(category.amount)}</span>
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
              <p className="text-xs text-muted-foreground">All financial transactions</p>
            </div>
            <button className="w-10 h-10 rounded-2xl bg-secondary/50 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
              <TrendingUp className="w-4 h-4" />
            </button>
          </div>

          {unifiedLedger.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
              <FileText className="w-12 h-12 opacity-30 mb-4" />
              <p className="text-xs font-medium uppercase tracking-wider opacity-50">No entries detected</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {unifiedLedger.slice(0, 15).map((item, idx) => {
                const isIncome = item.type === 'income';
                return (
                  <div key={item.id} className="group flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-transform group-hover:rotate-12',
                        isIncome ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      )}>
                        {isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                          {item.category}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-sm font-bold',
                        isIncome ? 'text-success' : 'text-destructive'
                      )}>
                        {isIncome ? '+' : '-'}{formatCurrency(Number(item.amount))}
                      </p>
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {isIncome ? 'Income' : 'Expense'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={() => setIsLedgerModalOpen(true)}
            className="w-full mt-6 py-4 bg-muted/30 rounded-2xl text-xs font-semibold uppercase text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all tracking-wider"
          >
            View All Transactions
          </button>
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
                {bankAccounts.length + (actualCashBalance > 0 ? 1 : 0)} accounts
              </span>
            </div>
            {bankAccounts.length === 0 && actualCashBalance === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No cash or bank accounts captured yet.</div>
            ) : (
              <div className="space-y-3">
                {actualCashBalance > 0 && (
                  <div className="flex items-center justify-between p-3 bg-card rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Cash in Hand</p>
                        <p className="text-[11px] text-muted-foreground">Main Cash Register</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(actualCashBalance)}</p>
                      <span className="text-[10px] font-semibold text-success uppercase">Active</span>
                    </div>
                  </div>
                )}
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

      {/* Transaction Ledger Modal */}
      <TransactionLedgerModal
        open={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        transactions={unifiedLedger}
      />
    </div>
  );
}
