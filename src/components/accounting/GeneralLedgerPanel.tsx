import { useState } from 'react';
import { Loader2, PlayCircle, Scale, BookOpenCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useTrialBalance,
  useBalanceSheetGL,
  useIncomeStatementPeriod,
  useNetIncomeGL,
  useJournalEntries,
  useRunDepreciation,
} from '@/hooks/useGeneralLedger';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

const SOURCE_LABELS: Record<string, string> = {
  sales_order: 'Sale',
  payment: 'Payment',
  expense: 'Expense',
  creditor_transaction: 'Supplier',
  bank_transaction: 'Bank',
  payroll: 'Payroll',
  depreciation: 'Depreciation',
  opening_balance: 'Opening Balance',
};

interface GeneralLedgerPanelProps {
  dateRange?: { from: Date; to: Date };
}

export default function GeneralLedgerPanel({ dateRange }: GeneralLedgerPanelProps) {
  const { data: trialBalance, isLoading: tbLoading } = useTrialBalance();
  const { data: balanceSheet, isLoading: bsLoading } = useBalanceSheetGL();
  const { data: periodPnL, isLoading: pnlLoading } = useIncomeStatementPeriod(dateRange);
  const { data: netIncomeAllTime } = useNetIncomeGL();
  const { data: journalEntries, isLoading: jeLoading } = useJournalEntries(40);
  const runDepreciation = useRunDepreciation();
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Standard trial-balance presentation: each account shows its NET balance on its
  // debit or credit side (not lifetime gross flows, which double-count every shilling
  // that ever moved through an account and produce uselessly huge totals).
  const trialRows = (trialBalance || []).map((a) => ({
    ...a,
    netDebit: Math.max(Number(a.total_debit) - Number(a.total_credit), 0),
    netCredit: Math.max(Number(a.total_credit) - Number(a.total_debit), 0),
  }));
  const totalDebits = trialRows.reduce((sum, a) => sum + a.netDebit, 0);
  const totalCredits = trialRows.reduce((sum, a) => sum + a.netCredit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const assets = (balanceSheet || []).filter((a) => a.account_type === 'asset');
  const liabilities = (balanceSheet || []).filter((a) => a.account_type === 'liability');
  const equity = (balanceSheet || []).filter((a) => a.account_type === 'equity');

  const totalAssets = assets.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalEquity = equity.reduce((sum, a) => sum + Number(a.balance), 0) + Number(netIncomeAllTime || 0);

  const revenueRows = (periodPnL || []).filter((a) => a.account_type === 'revenue');
  const expenseRows = (periodPnL || []).filter((a) => a.account_type === 'expense');
  const periodRevenue = revenueRows.reduce((sum, a) => sum + Number(a.balance), 0);
  const periodExpenses = expenseRows.reduce((sum, a) => sum + Number(a.balance), 0);
  const periodNetIncome = periodRevenue - periodExpenses;

  if (tbLoading || bsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-foreground">General Ledger</h3>
            <p className="text-sm text-muted-foreground">
              Double-entry books. Every sale, payment, expense, and payroll run posts here automatically — and stays in sync when records are edited or deleted.
            </p>
          </div>
          <Button onClick={() => runDepreciation.mutate()} disabled={runDepreciation.isPending} variant="outline" className="gap-2 shrink-0">
            {runDepreciation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Run Monthly Depreciation
          </Button>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold', isBalanced ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
            <Scale className="w-4 h-4" />
            {isBalanced
              ? `Balanced — ${formatCurrency(totalDebits)} debits = credits`
              : 'NOT BALANCED — this should be impossible; investigate immediately'}
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary/10 text-primary">
            <BookOpenCheck className="w-4 h-4" />
            Net income (period): {formatCurrency(periodNetIncome)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Period Income Statement */}
        <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
          <div className="mb-4">
            <h4 className="text-lg font-black text-foreground">Income Statement</h4>
            <p className="text-xs text-muted-foreground">Follows the date range selected above</p>
          </div>
          {pnlLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold text-success uppercase tracking-wide mb-1">Revenue</div>
                {revenueRows.map((a) => (
                  <div key={a.code} className="flex justify-between text-sm py-1">
                    <span className="text-foreground">{a.name}</span>
                    <span className="font-semibold">{formatCurrency(a.balance || 0)}</span>
                  </div>
                ))}
                {revenueRows.length === 0 && <p className="text-sm text-muted-foreground py-1">No revenue posted in this period.</p>}
              </div>
              <div>
                <div className="text-xs font-bold text-destructive uppercase tracking-wide mb-1">Expenses</div>
                {expenseRows.map((a) => (
                  <div key={a.code} className="flex justify-between text-sm py-1">
                    <span className="text-foreground">{a.name}</span>
                    <span className="font-semibold">({formatCurrency(a.balance || 0)})</span>
                  </div>
                ))}
                {expenseRows.length === 0 && <p className="text-sm text-muted-foreground py-1">No expenses posted in this period.</p>}
              </div>
              <div className="flex justify-between text-base font-black pt-3 border-t-2 border-border">
                <span>Net Income</span>
                <span className={periodNetIncome >= 0 ? 'text-success' : 'text-destructive'}>{formatCurrency(periodNetIncome)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Balance Sheet */}
        <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
          <div className="mb-4">
            <h4 className="text-lg font-black text-foreground">Balance Sheet</h4>
            <p className="text-xs text-muted-foreground">Per books, as of today</p>
          </div>
          <div className="space-y-1 mb-4">
            <div className="text-xs font-bold text-primary uppercase tracking-wide">Assets</div>
            {assets.filter((a) => Number(a.balance) !== 0).map((a) => (
              <div key={a.code} className="flex justify-between text-sm py-1">
                <span className="text-foreground">{a.name}</span>
                <span className="font-semibold">{formatCurrency(a.balance || 0)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-black pt-2 border-t border-border/50">
              <span>Total Assets</span>
              <span>{formatCurrency(totalAssets)}</span>
            </div>
          </div>
          <div className="space-y-1 mb-4">
            <div className="text-xs font-bold text-warning uppercase tracking-wide">Liabilities</div>
            {liabilities.filter((a) => Number(a.balance) !== 0).map((a) => (
              <div key={a.code} className="flex justify-between text-sm py-1">
                <span className="text-foreground">{a.name}</span>
                <span className="font-semibold">{formatCurrency(a.balance || 0)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-black pt-2 border-t border-border/50">
              <span>Total Liabilities</span>
              <span>{formatCurrency(totalLiabilities)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-success uppercase tracking-wide">Equity</div>
            {equity.filter((a) => Number(a.balance) !== 0).map((a) => (
              <div key={a.code} className="flex justify-between text-sm py-1">
                <span className="text-foreground">{a.name}</span>
                <span className="font-semibold">{formatCurrency(a.balance || 0)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-1">
              <span className="text-foreground">Net Income (since adoption)</span>
              <span className="font-semibold">{formatCurrency(netIncomeAllTime || 0)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-2 border-t border-border/50">
              <span>Total Equity</span>
              <span>{formatCurrency(totalEquity)}</span>
            </div>
          </div>
          <div className="flex justify-between text-sm font-black pt-4 mt-4 border-t-2 border-border">
            <span>Liabilities + Equity</span>
            <span>{formatCurrency(totalLiabilities + totalEquity)}</span>
          </div>
        </div>
      </div>

      {/* Journal entry browser */}
      <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
        <div className="mb-4">
          <h4 className="text-lg font-black text-foreground">Journal Entries</h4>
          <p className="text-xs text-muted-foreground">Most recent postings — click a row to see its debit/credit lines</p>
        </div>
        {jeLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border/50">
                  <th className="pb-2 w-6"></th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Memo</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(journalEntries || []).map((entry) => {
                  const amount = entry.journal_entry_lines.reduce((sum, l) => sum + Number(l.debit), 0);
                  const isOpen = expandedEntry === entry.id;
                  return (
                    <>
                      <tr
                        key={entry.id}
                        onClick={() => setExpandedEntry(isOpen ? null : entry.id)}
                        className="border-b border-border/20 cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2 text-muted-foreground">{isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}</td>
                        <td className="py-2 whitespace-nowrap">{entry.entry_date}</td>
                        <td className="py-2">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                            {SOURCE_LABELS[entry.source_type] || entry.source_type}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground whitespace-normal break-words">{entry.memo}</td>
                        <td className="py-2 text-right font-semibold whitespace-nowrap">{formatCurrency(amount)}</td>
                      </tr>
                      {isOpen && (
                        <tr key={`${entry.id}-lines`} className="border-b border-border/20 bg-muted/20">
                          <td></td>
                          <td colSpan={4} className="py-2">
                            <table className="w-full text-xs">
                              <tbody>
                                {entry.journal_entry_lines.map((line) => (
                                  <tr key={line.id}>
                                    <td className="py-1 text-muted-foreground">{line.chart_of_accounts?.code} · {line.chart_of_accounts?.name}</td>
                                    <td className="py-1 text-right w-32">{Number(line.debit) > 0 ? formatCurrency(line.debit) : ''}</td>
                                    <td className="py-1 text-right w-32 text-muted-foreground">{Number(line.credit) > 0 ? formatCurrency(line.credit) : ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {(journalEntries || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">No journal entries posted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trial balance */}
      <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
        <div className="mb-4">
          <h4 className="text-lg font-black text-foreground">Trial Balance</h4>
          <p className="text-xs text-muted-foreground">Net balance per account — debit column must equal credit column</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border/50">
                <th className="pb-2">Code</th>
                <th className="pb-2">Account</th>
                <th className="pb-2 text-right">Debit</th>
                <th className="pb-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {trialRows.map((a) => (
                <tr key={a.code} className="border-b border-border/20">
                  <td className="py-1.5 text-muted-foreground">{a.code}</td>
                  <td className="py-1.5">{a.name}</td>
                  <td className="py-1.5 text-right font-medium">{a.netDebit ? formatCurrency(a.netDebit) : '-'}</td>
                  <td className="py-1.5 text-right font-medium">{a.netCredit ? formatCurrency(a.netCredit) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-black border-t-2 border-border">
                <td colSpan={2} className="pt-2">Total</td>
                <td className="pt-2 text-right">{formatCurrency(totalDebits)}</td>
                <td className="pt-2 text-right">{formatCurrency(totalCredits)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
