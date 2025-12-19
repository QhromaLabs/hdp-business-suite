import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Building2,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { useFinancialSummary, useExpensesByCategory, useBankTransactions } from '@/hooks/useAccounting';
import { cn } from '@/lib/utils';

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

  const isLoading = summaryLoading || expensesLoading || transactionsLoading;

  const stats = [
    {
      title: 'Total Revenue',
      value: financialSummary?.revenue || 0,
      change: 12.5,
      icon: DollarSign,
      color: 'primary',
    },
    {
      title: 'Net Profit',
      value: financialSummary?.netProfit || 0,
      change: 8.2,
      icon: TrendingUp,
      color: 'success',
    },
    {
      title: 'Cash Balance',
      value: financialSummary?.cashBalance || 0,
      change: 5.1,
      icon: Wallet,
      color: 'warning',
    },
    {
      title: 'Receivables',
      value: financialSummary?.receivables || 0,
      change: -3.2,
      icon: CreditCard,
      color: 'destructive',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change > 0;
          return (
            <div
              key={stat.title}
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className={cn(
                  'p-3 rounded-xl',
                  stat.color === 'primary' && 'bg-primary/10 text-primary',
                  stat.color === 'success' && 'bg-success/10 text-success',
                  stat.color === 'warning' && 'bg-warning/10 text-warning',
                  stat.color === 'destructive' && 'bg-destructive/10 text-destructive',
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  isPositive ? 'text-success' : 'text-destructive'
                )}>
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(stat.change)}%
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stat.value)}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* P&L Summary */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Profit & Loss Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-success/5 rounded-xl border border-success/20">
              <div className="flex items-center gap-3">
                <ArrowUpRight className="w-5 h-5 text-success" />
                <span className="font-medium text-foreground">Total Revenue</span>
              </div>
              <span className="text-xl font-bold text-success">{formatCurrency(financialSummary?.revenue || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-xl border border-destructive/20">
              <div className="flex items-center gap-3">
                <ArrowDownRight className="w-5 h-5 text-destructive" />
                <span className="font-medium text-foreground">Total Expenses</span>
              </div>
              <span className="text-xl font-bold text-destructive">{formatCurrency(financialSummary?.expenses || 0)}</span>
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                <span className="font-semibold text-foreground">Gross Profit</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(financialSummary?.grossProfit || 0)}</span>
              </div>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Expense Breakdown</h4>
            {expenseCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No expenses recorded</p>
            ) : (
              <div className="space-y-3">
                {expenseCategories.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{category.name}</span>
                      <span className="font-medium text-foreground">{formatCurrency(category.amount)}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
            <button className="text-sm text-primary hover:underline">View All</button>
          </div>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => {
                const isCredit = txn.transaction_type === 'credit' || txn.transaction_type === 'deposit';
                return (
                  <div key={txn.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        isCredit ? 'bg-success/10' : 'bg-destructive/10'
                      )}>
                        {isCredit 
                          ? <ArrowUpRight className="w-4 h-4 text-success" />
                          : <ArrowDownRight className="w-4 h-4 text-destructive" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[150px]">
                          {txn.description || txn.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.transaction_date).toLocaleDateString('en-KE')}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'font-semibold text-sm',
                      isCredit ? 'text-success' : 'text-destructive'
                    )}>
                      {isCredit ? '+' : '-'}{formatCurrency(Number(txn.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Balance Sheet', icon: FileText },
          { label: 'Cash Flow', icon: TrendingUp },
          { label: 'Bank Reconciliation', icon: Building2 },
          { label: 'Creditors', icon: CreditCard },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:border-primary/30 hover:shadow-md transition-all duration-200"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
