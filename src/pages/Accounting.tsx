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
  ArrowUp,
  ArrowDown,
  Activity,
  DollarSign,
  Info,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DateRange } from "react-day-picker";
import { subDays, startOfYear, endOfYear, startOfMonth } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, ReferenceLine } from 'recharts';

import {
  useFinancialSummary,
  useRecordExpense,
  useDeleteExpense,
} from '@/hooks/useAccounting';
// import { usePayrollEntries } from '@/hooks/useEmployees';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';
import TransactionLedgerModal from '@/components/accounting/TransactionLedgerModal';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

function CalculatingLoader() {
  const [dataPoints, setDataPoints] = useState([0, 0, 0, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDataPoints(prev => prev.map(() => Math.floor(Math.random() * 900000) + 100000));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-8 animate-fade-in">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-primary/20 animate-[spin_3s_linear_infinite]" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-b-transparent animate-spin" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-0 rounded-full border-4 border-info/50 border-l-transparent animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
          <Activity className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-3xl font-black tracking-tight text-foreground animate-pulse">Calculating data...</h2>
          <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground font-medium text-sm">
             <span className="px-3 py-1 bg-card rounded-full border border-border/50 animate-pulse shadow-sm">Reconciling ledgers</span>
             <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
             <span className="px-3 py-1 bg-card rounded-full border border-border/50 animate-pulse shadow-sm" style={{ animationDelay: '300ms' }}>Computing profit margins</span>
             <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '450ms' }} />
             <span className="px-3 py-1 bg-card rounded-full border border-border/50 animate-pulse shadow-sm" style={{ animationDelay: '600ms' }}>Fetching transactions</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 opacity-60">
          {dataPoints.map((val, i) => (
            <div key={i} className="bg-card/50 backdrop-blur-sm border border-border/50 p-5 rounded-2xl flex flex-col items-center justify-center min-w-[140px] shadow-sm">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                {['Revenue', 'Expenses', 'Net Profit', 'Taxes'][i]}
              </div>
              <div className="font-mono text-xl font-black text-foreground">
                Ksh {val.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
  );
}

export default function Accounting() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState("overview");

  const queryDateRange = dateRange ? { from: dateRange.from!, to: dateRange.to! } : undefined;
  const { userRole } = useAuth();
  const { data: financialSummary, isLoading: summaryLoading } = useFinancialSummary(queryDateRange);
  const expenseCategories = financialSummary?.expenseCategories || [];
  const transactions = financialSummary?.bankTransactionsList || [];
  const bankAccounts = financialSummary?.bankAccountsList || [];
  const expenses = financialSummary?.expensesList || [];
  const payments = financialSummary?.paymentsList || [];
  const productionRuns = financialSummary?.productionRunsList || [];
  const creditorTransactions = financialSummary?.creditorTransactionsList || [];
  const payrollEntries = financialSummary?.payrollEntriesList || [];
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
  const queryClient = useQueryClient();

  // Realtime Sync for Accounting Tables
  useEffect(() => {
    const tables = ['expenses', 'payments', 'sales_orders', 'creditor_transactions', 'payroll', 'production_runs'];
    const channels = tables.map(table => {
      return supabase
        .channel(`realtime_${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          // Invalidate ALL accounting related queries on any change
          queryClient.invalidateQueries({ queryKey: ['financial_summary_v2'] });
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['expenses_by_category'] });
          queryClient.invalidateQueries({ queryKey: ['payments'] });
          queryClient.invalidateQueries({ queryKey: ['creditor_transactions'] });
          queryClient.invalidateQueries({ queryKey: ['payroll'] });
          queryClient.invalidateQueries({ queryKey: ['production_batches'] });
        })
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [queryClient]);

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

  const isLoading = summaryLoading;

  const availableCategories = useMemo(() => {
    const existingNames = expenseCategories.map((c) => c.name);
    const allCategories = [...new Set([...DEFAULT_EXPENSE_CATEGORIES, ...existingNames])];
    return allCategories.filter(Boolean).sort();
  }, [expenseCategories]);

  const cashBalance = financialSummary?.assets?.cash || 0;
  const receivables = financialSummary?.assets?.receivables || 0;
  const payables = financialSummary?.liabilities?.payables || 0;
  const pendingPayroll = financialSummary?.liabilities?.payroll || 0;

  // Period Credit Calculation
  const periodCreditIssued = financialSummary?.periodCreditIssued || 0;

  let periodLabel = "Period";
  if (dateRange?.from && dateRange?.to) {
    const diffDays = Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 360) {
      if (dateRange.from.getFullYear() === 2000) periodLabel = "All-time";
      else periodLabel = `${dateRange.from.getFullYear()}`;
    } else if (diffDays <= 31) {
      periodLabel = dateRange.from.toLocaleString('default', { month: 'short' });
    }
  }

  // Calculate cash from payment methods (actual cash received) using financialSummary for legacy support
  const paymentMethodBreakdown = financialSummary?.paymentBreakdown || {};

  // Calculate actual cash balance across all non-credit payment methods (Cash, M-Pesa, Bank, etc.)
  const actualCashBalance = Object.entries(paymentMethodBreakdown)
    .filter(([method]) => method !== 'credit')
    .reduce((sum, [_, amount]) => sum + amount, 0);

  // Derived Totals for Balance Sheet
  const totalAssetsSum = actualCashBalance + receivables + (financialSummary?.assets?.inventory || 0) + (financialSummary?.assets?.rawMaterials || 0) + (financialSummary?.assets?.equipment || 0);
  const totalLiabilitiesSum = payables + pendingPayroll;
  const retainedEarningsSum = totalAssetsSum - totalLiabilitiesSum;

  const workingCapital = actualCashBalance + receivables - payables;

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



  const liquidityCover = payables > 0 ? ((actualCashBalance + receivables) / payables).toFixed(2) : 'N/A';
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
          date: entry.paid_at || entry.pay_period_end,
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
    .filter(entry => entry.status === 'paid' && new Date(entry.paid_at || entry.pay_period_end) >= thirtyDaysAgo)
    .reduce((sum, entry) => sum + Number(entry.net_salary), 0);

  const cashOut30 = expensesLast30 + supplierPaymentsLast30 + payrollLast30;

  const creditorPayouts = creditorTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0);

  // Helper for Payment Methods (topPaymentMethods uses the paymentMethodBreakdown defined earlier)
  const topPaymentMethods = Object.entries(paymentMethodBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  if (isLoading) {
    return <CalculatingLoader />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Accounting & Finance</h1>
          <p className="text-muted-foreground">Real-time financial overview and reporting</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 p-1 bg-card/60 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm">
            {/* Presets */}
            <Select 
              value={
                !dateRange?.from ? 'all' 
                : (dateRange.from.getTime() === startOfYear(new Date()).getTime() && dateRange.to?.getTime() === endOfYear(new Date()).getTime()) ? 'this_year' 
                : 'custom'
              }
              onValueChange={(val) => {
                if (val === 'all') setDateRange(undefined);
                if (val === 'this_year') setDateRange({ from: startOfYear(new Date()), to: endOfYear(new Date()) });
              }}
            >
              <SelectTrigger className="w-[120px] h-8 bg-background/50 border-transparent rounded-lg focus:ring-primary/20 transition-all text-xs font-semibold hover:bg-background/80">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-border/50">
                <SelectItem value="all" className="font-medium cursor-pointer rounded-lg text-xs">All Time</SelectItem>
                <SelectItem value="this_year" className="font-medium cursor-pointer rounded-lg text-xs">This Year</SelectItem>
                <SelectItem value="custom" disabled className="hidden">Specific Month</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-5 bg-border/50 mx-0.5 rounded-full hidden sm:block" />

            {/* Custom Month */}
            <Select 
              value={
                dateRange?.from && 
                dateRange?.from.getTime() !== startOfYear(dateRange.from).getTime() 
                ? dateRange.from.getMonth().toString() 
                : "all_months"
              }
              onValueChange={(val) => {
                if (val === "all_months") {
                   // If they clear the month, just show the whole year
                   const year = dateRange?.from ? dateRange.from.getFullYear() : new Date().getFullYear();
                   setDateRange({ from: startOfYear(new Date(year, 0, 1)), to: endOfYear(new Date(year, 0, 1)) });
                   return;
                }
                const year = dateRange?.from ? dateRange.from.getFullYear() : new Date().getFullYear();
                const start = new Date(year, parseInt(val), 1);
                const end = new Date(year, parseInt(val) + 1, 0, 23, 59, 59);
                setDateRange({ from: start, to: end });
              }}
            >
              <SelectTrigger className="w-[130px] h-8 bg-background/50 border-transparent rounded-lg focus:ring-primary/20 transition-all text-xs font-medium hover:bg-background/80">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-border/50 max-h-[300px]">
                <SelectItem value="all_months" className="cursor-pointer rounded-lg text-xs font-semibold">All Months</SelectItem>
                {Array.from({length: 12}).map((_, i) => (
                  <SelectItem key={i} value={i.toString()} className="cursor-pointer rounded-lg text-xs">
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom Year */}
            <Select 
              value={dateRange?.from ? dateRange.from.getFullYear().toString() : new Date().getFullYear().toString()}
              onValueChange={(val) => {
                // Selecting a year ALWAYS selects the entire year independently
                const year = parseInt(val);
                setDateRange({ from: startOfYear(new Date(year, 0, 1)), to: endOfYear(new Date(year, 0, 1)) });
              }}
            >
              <SelectTrigger className="w-[80px] h-8 bg-background/50 border-transparent rounded-lg focus:ring-primary/20 transition-all text-xs font-medium hover:bg-background/80">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-border/50">
                {[...Array(6)].map((_, i) => {
                   const y = new Date().getFullYear() - i + 1;
                   return <SelectItem key={y} value={y.toString()} className="cursor-pointer rounded-lg text-xs">{y}</SelectItem>
                })}
              </SelectContent>
            </Select>
          </div>
                      <Button
              variant="outline"
              onClick={() => setIsLedgerModalOpen(true)}
              className="hidden md:flex"
            >
              <FileText className="w-4 h-4 mr-2" />
              Ledger
            </Button>
            </div>
      </div>

      {userRole !== 'admin' && userRole !== 'manager' ? (
        <div className="space-y-6">
            {/* Regular user just sees Expense Form from below */}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-md border border-border/50 p-1 rounded-xl h-12 w-full max-w-md grid grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold h-9">Overview</TabsTrigger>
            <TabsTrigger value="balance_sheet" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold h-9">Balance Sheet</TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold h-9">Expenses & Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-700">
            {/* HERO KPI SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Cash Collected Card */}
              <div className="group bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm hover:shadow-2xl hover:border-success/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-success/10 rounded-full blur-3xl group-hover:bg-success/20 transition-all duration-500" />
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <div className="p-3 bg-success/10 text-success rounded-2xl">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider">
                    Actual Liquidity
                  </div>
                </div>
                <div className="relative z-10 mt-auto">
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5 cursor-help">
                    Cash Collected 
                    <TooltipProvider delayDuration={100}>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] bg-card border border-border text-foreground font-medium p-3 rounded-lg shadow-xl" sideOffset={8}>
                          <p>Total cash physically received from customers across all payment methods.</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(financialSummary?.cashCollected || 0)}</p>
                  <div className="text-[11px] font-semibold text-warning mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse"></span>
                      {formatCurrency(financialSummary?.assets?.receivables || 0)} total credit
                    </span>
                    {periodCreditIssued > 0 && (
                      <span className="flex items-center gap-1.5 text-muted-foreground ml-3 cursor-help" title="Exact sum of sales generated specifically as 'Credit' during this period.">
                        ↳ {formatCurrency(periodCreditIssued)} {periodLabel} credit issued
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Accrued Revenue Card */}
              <div className="group bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm hover:shadow-2xl hover:border-primary/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                    Gross Margin: {financialSummary?.grossMargin?.toFixed(1) || 0}%
                  </div>
                </div>
                <div className="relative z-10 mt-auto">
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5 cursor-help">
                    Accrued Revenue 
                    <TooltipProvider delayDuration={100}>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] bg-card border border-border text-foreground font-medium p-3 rounded-lg shadow-xl" sideOffset={8}>
                          <p>Total value of all sales generated (invoiced), regardless of whether cash has been fully collected yet.</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(financialSummary?.revenue || 0)}</p>
                  <div className="text-[11px] font-semibold text-primary mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium mb-0.5">
                       Generated from {(financialSummary?.orderPipeline?.completed || 0) + (financialSummary?.orderPipeline?.in_progress || 0)} valid orders:
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      {financialSummary?.orderPipeline?.completed || 0} delivered & completed
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground ml-3">
                      ↳ {financialSummary?.orderPipeline?.in_progress || 0} approved & in-transit
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Profit Card */}
              <div className="group bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm hover:shadow-2xl hover:border-warning/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-warning/10 rounded-full blur-3xl group-hover:bg-warning/20 transition-all duration-500" />
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <div className="p-3 bg-warning/10 text-warning rounded-2xl">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-warning/10 text-warning text-[10px] font-bold uppercase tracking-wider">
                    Net Margin: {financialSummary?.netMargin?.toFixed(1) || 0}%
                  </div>
                </div>
                <div className="relative z-10 mt-auto">
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5 cursor-help">
                    Net Profit 
                    <TooltipProvider delayDuration={100}>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] bg-card border border-border text-foreground font-medium p-3 rounded-lg shadow-xl" sideOffset={8}>
                          <p>Gross Profit minus Operating Expenses, Supplier Payouts, and Payroll. Represents the true bottom line.</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(financialSummary?.netProfit || 0)}</p>
                  <div className="text-[11px] font-semibold text-warning mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium mb-0.5">
                       Gross profit minus operating costs:
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse"></span>
                      {formatCurrency(financialSummary?.grossProfit || 0)} gross profit
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground ml-3">
                      ↳ - {formatCurrency(financialSummary?.expenses || 0)} OPEX & Payroll
                    </span>
                  </div>
                </div>
              </div>

              {/* COGS Card */}
              <div className="group bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm hover:shadow-2xl hover:border-destructive/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-destructive/10 rounded-full blur-3xl group-hover:bg-destructive/20 transition-all duration-500" />
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <div className="p-3 bg-destructive/10 text-destructive rounded-2xl">
                    <ArrowDown className="w-6 h-6" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider">
                    Cost of Goods Sold
                  </div>
                </div>
                <div className="relative z-10 mt-auto">
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5 cursor-help">
                    Total COGS 
                    <TooltipProvider delayDuration={100}>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] bg-card border border-border text-foreground font-medium p-3 rounded-lg shadow-xl" sideOffset={8}>
                          <p>Cost of Goods Sold: The base cost of sold items plus all historical freight and customs markups.</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(financialSummary?.breakdown?.cogs || 0)}</p>
                  <div className="text-[11px] font-semibold text-destructive mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium mb-0.5">
                       Pure item cost + dynamic freight:
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"></span>
                      {formatCurrency(financialSummary?.breakdown?.pureSupplierCOGS || 0)} Supplier cost of goods
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground ml-3">
                      ↳ + {formatCurrency(financialSummary?.breakdown?.totalLandedMarkupCOGS || 0)} Landed markup (shipping/tax)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Liquidity Velocity (Area Chart) */}
              <div className="lg:col-span-2 bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm flex flex-col h-[450px]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Liquidity & Accrual Velocity</h3>
                    <p className="text-xs text-muted-foreground mt-1">Tracking recorded revenue versus operating cash burn.</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-xl text-secondary-foreground">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                  {financialSummary?.trends && financialSummary.trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={financialSummary?.trends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(value) => `KSh ${value/1000}k`} />
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#333" opacity={0.15} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', backgroundColor: 'var(--background)' }}
                          formatter={(value: number) => [formatCurrency(value), undefined]}
                        />
                        <Area type="monotone" dataKey="revenue" name="Accrued Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        <Area type="monotone" dataKey="expenses" name="Opex + Mfg" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                        <Area type="monotone" dataKey="payroll" name="Payroll" stroke="#f59e0b" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: 500 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm opacity-50 font-medium">
                      Not enough data to plot velocity trends
                    </div>
                  )}
                </div>
              </div>

              {/* Order Pipeline Progress */}
              <div className="bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm flex flex-col h-[450px]">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground">Order Pipeline</h3>
                  <p className="text-xs text-muted-foreground mt-1">Fulfillment lifecycle mapping</p>
                </div>
                
                <div className="flex-1 flex flex-col justify-center space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-sm font-bold text-destructive flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive animate-pulse"/> Trapped in Pending</span>
                        <p className="text-[11px] text-muted-foreground mt-1">{financialSummary?.orderPipeline?.pending || 0} stagnant orders</p>
                      </div>
                      <span className="font-bold text-lg">{formatCurrency(financialSummary?.orderPipeline?.total_value_pending || 0)}</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-destructive rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((financialSummary?.orderPipeline?.pending || 0) / Math.max(1, (financialSummary?.orderPipeline?.pending || 0) + (financialSummary?.orderPipeline?.completed || 0))) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-sm font-bold text-blue-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/> In Progress / Dispatched</span>
                        <p className="text-[11px] text-muted-foreground mt-1">{financialSummary?.orderPipeline?.in_progress || 0} active orders</p>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((financialSummary?.orderPipeline?.in_progress || 0) / Math.max(1, (financialSummary?.orderPipeline?.completed || 0))) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-sm font-bold text-success flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success"/> Completed & Delivered</span>
                        <p className="text-[11px] text-muted-foreground mt-1">{financialSummary?.orderPipeline?.completed || 0} finalized orders</p>
                      </div>
                      <span className="font-bold text-lg text-success">{formatCurrency(financialSummary?.orderPipeline?.total_value_completed || 0)}</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-success rounded-full transition-all duration-1000" style={{ width: `100%` }} />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Capital Outflow Distribution */}
              <div className="lg:col-span-2 bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-sm">
                <div className="flex flex-col md:flex-row gap-12 items-center">
                  <div className="flex-1 w-full max-w-md">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-foreground">Capital Outflow Distribution</h3>
                      <p className="text-sm text-muted-foreground mt-2">Where is your liquidity actually being deployed? This breaks down every dollar that left your accounts.</p>
                    </div>
                    <div className="space-y-5">
                      {[
                        { name: 'General Operating (OPEX)', value: financialSummary?.breakdown?.general || 0, color: '#3b82f6', desc: 'Rent, software, admin' },
                        { name: 'Direct Payroll', value: financialSummary?.breakdown?.payroll || 0, color: '#f59e0b', desc: 'Salaries & wages' },
                        { name: 'Manufacturing Operations', value: financialSummary?.breakdown?.manufacturing_spend || 0, color: '#8b5cf6', desc: 'Production runs & equipment' },
                        { name: 'Inventory Procurement', value: financialSummary?.breakdown?.purchases || 0, color: '#ec4899', desc: 'Raw material & stock purchases' },
                      ].map(item => (
                        <div key={item.name} className="flex justify-between items-center group cursor-default">
                          <div className="flex items-center gap-4">
                            <div className="w-4 h-4 rounded-full shadow-sm group-hover:scale-125 transition-transform" style={{ backgroundColor: item.color }} />
                            <div>
                              <p className="font-semibold text-sm">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                            </div>
                          </div>
                          <span className="font-bold text-base">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-[350px] h-[350px] relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Total Outflow</p>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(
                          (financialSummary?.breakdown?.general || 0) + 
                          (financialSummary?.breakdown?.payroll || 0) + 
                          (financialSummary?.breakdown?.manufacturing_spend || 0) + 
                          (financialSummary?.breakdown?.purchases || 0)
                        )}
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'OPEX', value: Math.max(1, financialSummary?.breakdown?.general || 0), color: '#3b82f6' },
                            { name: 'Payroll', value: Math.max(1, financialSummary?.breakdown?.payroll || 0), color: '#f59e0b' },
                            { name: 'Manufacturing', value: Math.max(1, financialSummary?.breakdown?.manufacturing_spend || 0), color: '#8b5cf6' },
                            { name: 'Purchases', value: Math.max(1, financialSummary?.breakdown?.purchases || 0), color: '#ec4899' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={110}
                          outerRadius={150}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={8}
                        >
                          {
                            [
                              { color: '#3b82f6' },
                              { color: '#f59e0b' },
                              { color: '#8b5cf6' },
                              { color: '#ec4899' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))
                          }
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Spend']}
                          contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', backgroundColor: 'var(--background)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Operating Burn & Actions */}
              <div className="lg:col-span-1 bg-card/60 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-sm flex flex-col h-full justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Operating Burn</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-6">Opex vs Accrued Revenue</p>
                  
                  <div className="flex items-end gap-2 mb-8">
                    <p className="text-5xl font-bold text-destructive tracking-tight">{financialSummary?.operatingRatio?.toFixed(1) || 0}%</p>
                    <p className="text-sm text-muted-foreground mb-2 pb-1">of revenue</p>
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
                  <Button 
                    className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20" 
                    onClick={() => setActiveTab('expenses')}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Record New Expense
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl font-bold border-border/50"
                    onClick={() => setActiveTab('expenses')}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    View Expense Ledger
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
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
                    {!expense.id?.startsWith('bank-') && (
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
      </TabsContent>

      <TabsContent value="overview" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
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

              <div></div>{/* Filler for Grid */}
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            {/* Elevated Transaction Ledger */}
            <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-foreground tracking-tight">Ledger Stream</h3>
                  <p className="text-xs text-muted-foreground">All financial transactions</p>
                </div>
                <button
                  onClick={() => setIsLedgerModalOpen(true)}
                  className="w-10 h-10 rounded-2xl bg-secondary/50 flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                >
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
                      <div key={item.id || `ledger-${idx}`} className="group flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
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
          </TabsContent>

          <TabsContent value="balance_sheet" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            {/* TRADITIONAL BALANCE SHEET */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
              {/* ASSETS */}
              <div className="space-y-6">
                <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-sm h-full flex flex-col hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-foreground tracking-tight">Assets</h3>
                      <p className="text-sm text-muted-foreground font-medium mt-1">Resources owned by the business</p>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-lg shadow-inner">
                      {formatCurrency((actualCashBalance || 0) + (receivables || 0) + (financialSummary?.assets?.inventory || 0) + (financialSummary?.assets?.rawMaterials || 0) + (financialSummary?.assets?.equipment || 0))}
                    </div>
                  </div>

                  <div className="space-y-8 flex-1">
                    <div>
                      <h4 className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] mb-4 border-b border-border/50 pb-3">Current Assets</h4>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between group">
                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Cash & Equivalents</span>
                            <span className="text-base font-black text-foreground">{formatCurrency(actualCashBalance || 0)}</span>
                          </div>
                          <div className="flex flex-col gap-1 pl-4 border-l-2 border-border/50 ml-1">
                            {Object.entries(paymentMethodBreakdown)
                              .filter(([method, amount]) => method !== 'credit' && amount > 0)
                              .sort((a, b) => b[1] - a[1])
                              .map(([method, amount]) => (
                                <div key={method} className="flex items-center justify-between">
                                  <span className="text-[11px] font-medium text-muted-foreground capitalize flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                                    {method === 'nat' ? 'Bank' : method === 'mpesa' ? 'M-Pesa' : method.replaceAll('_', ' ')}
                                  </span>
                                  <span className="text-[11px] font-bold text-muted-foreground/80">{formatCurrency(amount)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between group">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Accounts Receivable</span>
                          <span className="text-base font-black text-foreground">{formatCurrency(receivables || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between group">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Finished Goods Inventory</span>
                          <span className="text-base font-black text-foreground">{formatCurrency(financialSummary?.assets?.inventory || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between group">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Raw Materials Inventory</span>
                          <span className="text-base font-black text-foreground">{formatCurrency(financialSummary?.assets?.rawMaterials || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] mb-4 border-b border-border/50 pb-3">Fixed Assets</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between group">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Machinery & Equipment</span>
                          <span className="text-base font-black text-foreground">{formatCurrency(financialSummary?.assets?.equipment || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIABILITIES & EQUITY */}
              <div className="space-y-6">
                <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-sm h-full flex flex-col hover:border-warning/30 transition-colors">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-foreground tracking-tight">Liabilities & Equity</h3>
                      <p className="text-sm text-muted-foreground font-medium mt-1">How assets are financed</p>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-lg shadow-inner">
                      {formatCurrency((actualCashBalance || 0) + (receivables || 0) + (financialSummary?.assets?.inventory || 0) + (financialSummary?.assets?.rawMaterials || 0) + (financialSummary?.assets?.equipment || 0))}
                    </div>
                  </div>

                  <div className="space-y-8 flex-1">
                    <div>
                      <h4 className="text-[11px] font-bold text-warning uppercase tracking-[0.2em] mb-4 border-b border-border/50 pb-3">Current Liabilities</h4>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between group">
                            <span className="text-sm font-semibold text-foreground group-hover:text-warning transition-colors">Accounts Payable</span>
                            <span className="text-base font-black text-destructive">{formatCurrency(payables || 0)}</span>
                          </div>
                          {(financialSummary?.liabilities?.creditorsList?.length || 0) > 0 && (
                            <div className="flex flex-col gap-1 pl-4 border-l-2 border-border/50 ml-1">
                              {financialSummary?.liabilities?.creditorsList?.map((creditor: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-2 truncate max-w-[150px]">
                                    <span className="w-1 h-1 rounded-full bg-warning/40"></span>
                                    {creditor.name || 'Unknown Supplier'}
                                  </span>
                                  <span className="text-[11px] font-bold text-destructive/80">{formatCurrency(Math.abs(creditor.outstanding_balance))}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-border/30">
                          <div className="flex items-center justify-between group">
                            <span className="text-sm font-semibold text-foreground group-hover:text-warning transition-colors">Pending Payroll</span>
                            <span className="text-base font-black text-destructive">{formatCurrency(pendingPayroll || 0)}</span>
                          </div>
                          {(financialSummary?.liabilities?.payrollList?.length || 0) > 0 && (
                            <div className="flex flex-col gap-1 pl-4 border-l-2 border-border/50 ml-1">
                              {financialSummary?.liabilities?.payrollList?.map((p: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-2 truncate max-w-[150px]">
                                    <span className="w-1 h-1 rounded-full bg-warning/40"></span>
                                    {p.employee?.full_name || 'Unknown Employee'}
                                  </span>
                                  <span className="text-[11px] font-bold text-destructive/80">{formatCurrency(p.net_salary)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-6">
                      <h4 className="text-[11px] font-bold text-success uppercase tracking-[0.2em] mb-4 border-b border-border/50 pb-3">Shareholder's Equity</h4>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between group">
                            <span className="text-sm font-semibold text-foreground group-hover:text-success transition-colors">Retained Earnings / Net Worth</span>
                            <span className="text-base font-black text-success">
                              {formatCurrency(retainedEarningsSum)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 pl-4 border-l-2 border-border/50 ml-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                                Total Assets
                              </span>
                              <span className="text-[11px] font-bold text-muted-foreground/80">{formatCurrency(totalAssetsSum)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-2">
                                  <span className="w-1 h-1 rounded-full bg-destructive/40"></span>
                                  Less: Liabilities
                                </span>
                                <span className="text-[11px] font-bold text-destructive/80">-{formatCurrency(totalLiabilitiesSum)}</span>
                              </div>
                              <div className="flex flex-col gap-1 pl-4 border-l border-border/30 ml-1 mb-1">
                                {payables > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-medium text-muted-foreground/70 flex items-center gap-2">
                                      ↳ Accounts Payable
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground/70">-{formatCurrency(payables)}</span>
                                  </div>
                                )}
                                {pendingPayroll > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-medium text-muted-foreground/70 flex items-center gap-2">
                                      ↳ Pending Payroll
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground/70">-{formatCurrency(pendingPayroll)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 bg-primary/5 rounded-2xl p-5 border border-primary/10 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black uppercase tracking-wider text-primary">Total L&E</span>
                      <span className="text-xl font-black text-primary">{formatCurrency(totalAssetsSum)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* WORKING CAPITAL & BANKS */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
              <div className="xl:col-span-2">
                <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-1">Working Capital</p>
                      <p className="text-4xl font-black text-foreground tracking-tight">{formatCurrency(workingCapital)}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-2">Cash + receivables - payables</p>
                    </div>
                    <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 shadow-sm">Liquidity Profile</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-8">
                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col justify-between hover:scale-105 transition-transform duration-300">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Cash on Hand</p>
                      <p className="text-xl font-black text-foreground mt-3 tracking-tight">{formatCurrency(actualCashBalance)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground mt-1">Ready liquidity</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-success/5 border border-success/10 flex flex-col justify-between hover:scale-105 transition-transform duration-300">
                      <p className="text-[10px] font-black text-success uppercase tracking-[0.2em]">Receivables</p>
                      <p className="text-xl font-black text-foreground mt-3 tracking-tight">{formatCurrency(receivables)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground mt-1">Expected inflow</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-warning/5 border border-warning/10 flex flex-col justify-between hover:scale-105 transition-transform duration-300">
                      <p className="text-[10px] font-black text-warning uppercase tracking-[0.2em]">Payables</p>
                      <p className="text-xl font-black text-foreground mt-3 tracking-tight">{formatCurrency(payables)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground mt-1">Upcoming outflow</p>
                    </div>
                  </div>
                  <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wider">Liquidity cover ratio</span>
                    <span className="text-base font-black text-primary">{liquidityCover}x</span>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Cash & Banks</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Active treasury positions</p>
                    </div>
                    <span className="text-[11px] px-3 py-1 rounded-full bg-muted text-muted-foreground font-bold">
                      {bankAccounts.length + (actualCashBalance > 0 ? 1 : 0)} accounts
                    </span>
                  </div>
                  
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {actualCashBalance > 0 && (
                      <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 shadow-sm">
                            <Wallet className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">Cash in Hand</p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Main Cash Register</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">{formatCurrency(actualCashBalance)}</p>
                          <span className="text-[10px] font-bold text-success uppercase tracking-wider">Active</span>
                        </div>
                      </div>
                    )}
                    {bankAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">Bank Account</p>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Treasury Account</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">{formatCurrency(account.current_balance)}</p>
                          <span className="text-[10px] font-bold text-success uppercase tracking-wider">Active</span>
                        </div>
                      </div>
                    ))}
                    
                    {bankAccounts.length === 0 && actualCashBalance === 0 && (
                      <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                        <Wallet className="w-12 h-12 mb-4 text-muted-foreground" />
                        <p className="text-sm font-bold">No active treasury</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
          {/* Premium Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            {[
              { label: 'Ledger & Expenses', icon: FileText, desc: 'View all transactions', primary: true, action: () => setActiveTab('expenses') },
              { label: 'Balance Sheet', icon: Building2, desc: 'Equity & Liability overview', action: () => setActiveTab('balance_sheet') },
              { label: 'Cash Flow', icon: TrendingUp, desc: 'Opex vs Capex streams', action: () => { } },
              {
                label: 'Record Expense', icon: Plus, desc: 'Register a direct outflow', action: () => {
                  setActiveTab('expenses');
                  setTimeout(() => {
                    document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' });
                    document.getElementById('category')?.focus();
                  }, 300);
                }
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.action}
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

          </TabsContent>
        </Tabs>
      )}

          <TransactionLedgerModal
            open={isLedgerModalOpen}
            onClose={() => setIsLedgerModalOpen(false)}
            transactions={unifiedLedger}
          />
    </div>
  );
}
