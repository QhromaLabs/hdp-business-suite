import { Loader2, TrendingUp, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useTrialBalance,
  useBalanceSheetGL,
  useIncomeStatementGL,
  useNetIncomeGL,
  useRunDepreciation,
} from '@/hooks/useGeneralLedger';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

export default function GeneralLedgerPanel() {
  const { data: trialBalance, isLoading: tbLoading } = useTrialBalance();
  const { data: balanceSheet, isLoading: bsLoading } = useBalanceSheetGL();
  const { data: incomeStatement, isLoading: isLoading } = useIncomeStatementGL();
  const { data: netIncome } = useNetIncomeGL();
  const runDepreciation = useRunDepreciation();

  const totalDebits = (trialBalance || []).reduce((sum, a) => sum + Number(a.total_debit), 0);
  const totalCredits = (trialBalance || []).reduce((sum, a) => sum + Number(a.total_credit), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const assets = (balanceSheet || []).filter((a) => a.account_type === 'asset');
  const liabilities = (balanceSheet || []).filter((a) => a.account_type === 'liability');
  const equity = (balanceSheet || []).filter((a) => a.account_type === 'equity');

  const totalAssets = assets.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalEquity = equity.reduce((sum, a) => sum + Number(a.balance), 0) + Number(netIncome || 0);

  if (tbLoading || bsLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-black text-foreground">Real Double-Entry General Ledger</h3>
            <p className="text-sm text-muted-foreground">
              Computed from posted journal entries (chart_of_accounts + journal_entry_lines), not from ad-hoc table sums.
            </p>
          </div>
          <Button onClick={() => runDepreciation.mutate()} disabled={runDepreciation.isPending} variant="outline" className="gap-2">
            {runDepreciation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Run Monthly Depreciation
          </Button>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${isBalanced ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
          <TrendingUp className="w-4 h-4" />
          {isBalanced ? 'Ledger is balanced' : 'Ledger is NOT balanced — this should be impossible; investigate immediately'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
          <h4 className="text-lg font-black text-foreground mb-4">Balance Sheet</h4>
          <div className="space-y-1 mb-4">
            <div className="text-xs font-bold text-primary uppercase tracking-wide">Assets</div>
            {assets.map((a) => (
              <div key={a.code} className="flex justify-between text-sm py-1">
                <span className="text-foreground">{a.name}</span>
                <span className="font-semibold">{formatCurrency(a.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-black pt-2 border-t border-border/50">
              <span>Total Assets</span>
              <span>{formatCurrency(totalAssets)}</span>
            </div>
          </div>
          <div className="space-y-1 mb-4">
            <div className="text-xs font-bold text-warning uppercase tracking-wide">Liabilities</div>
            {liabilities.map((a) => (
              <div key={a.code} className="flex justify-between text-sm py-1">
                <span className="text-foreground">{a.name}</span>
                <span className="font-semibold">{formatCurrency(a.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-black pt-2 border-t border-border/50">
              <span>Total Liabilities</span>
              <span>{formatCurrency(totalLiabilities)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-success uppercase tracking-wide">Equity</div>
            {equity.map((a) => (
              <div key={a.code} className="flex justify-between text-sm py-1">
                <span className="text-foreground">{a.name}</span>
                <span className="font-semibold">{formatCurrency(a.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-1">
              <span className="text-foreground">Net Income (current)</span>
              <span className="font-semibold">{formatCurrency(netIncome || 0)}</span>
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

        <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
          <h4 className="text-lg font-black text-foreground mb-4">Trial Balance</h4>
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
              {(trialBalance || []).map((a) => (
                <tr key={a.code} className="border-b border-border/20">
                  <td className="py-1.5 text-muted-foreground">{a.code}</td>
                  <td className="py-1.5">{a.name}</td>
                  <td className="py-1.5 text-right font-medium">{a.total_debit ? formatCurrency(a.total_debit) : '-'}</td>
                  <td className="py-1.5 text-right font-medium">{a.total_credit ? formatCurrency(a.total_credit) : '-'}</td>
                </tr>
              ))}
              {(trialBalance || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No journal entries posted yet.
                  </td>
                </tr>
              )}
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

      <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-sm">
        <h4 className="text-lg font-black text-foreground mb-4">Income Statement</h4>
        <div className="space-y-1">
          {(incomeStatement || []).map((a) => (
            <div key={a.code} className="flex justify-between text-sm py-1">
              <span className="text-foreground">{a.name}</span>
              <span className="font-semibold">{formatCurrency(a.balance)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-base font-black pt-3 mt-3 border-t-2 border-border">
          <span>Net Income</span>
          <span>{formatCurrency(netIncome || 0)}</span>
        </div>
      </div>
    </div>
  );
}
