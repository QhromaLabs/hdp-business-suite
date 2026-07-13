-- Reporting views computed directly from chart_of_accounts + journal_entry_lines.
-- These replace the JS aggregation in useFinancialSummary() (which summed unrelated
-- tables like customers.credit_balance and bank_accounts.current_balance by hand).

-- Running balance per account, signed by normal_balance (debit-normal accounts show
-- positive when debits exceed credits; credit-normal accounts show positive when
-- credits exceed debits).
CREATE OR REPLACE VIEW public.account_balances AS
SELECT
    coa.id AS account_id,
    coa.code,
    coa.name,
    coa.account_type,
    coa.normal_balance,
    COALESCE(SUM(jel.debit), 0) AS total_debit,
    COALESCE(SUM(jel.credit), 0) AS total_credit,
    CASE
        WHEN coa.normal_balance = 'debit' THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
        ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
    END AS balance
FROM public.chart_of_accounts coa
LEFT JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
GROUP BY coa.id, coa.code, coa.name, coa.account_type, coa.normal_balance;

-- Trial balance: every account's debit/credit totals. Sums must be equal -- if they're
-- not, something bypassed the balance-enforcing trigger (should be impossible).
CREATE OR REPLACE VIEW public.trial_balance AS
SELECT code, name, account_type, total_debit, total_credit
FROM public.account_balances
WHERE total_debit <> 0 OR total_credit <> 0
ORDER BY code;

-- Balance sheet: assets vs liabilities + equity (+ retained earnings from net income).
CREATE OR REPLACE VIEW public.balance_sheet AS
SELECT account_type, code, name, balance
FROM public.account_balances
WHERE account_type IN ('asset', 'liability', 'equity')
ORDER BY account_type, code;

-- Income statement: revenue and expense account balances (all-time; filter by
-- journal_entries.entry_date in the application layer for a specific period).
CREATE OR REPLACE VIEW public.income_statement AS
SELECT account_type, code, name, balance
FROM public.account_balances
WHERE account_type IN ('revenue', 'expense')
ORDER BY account_type, code;

-- Net income = total revenue - total expense, needed to reconcile the balance sheet
-- (assets = liabilities + equity + retained earnings/net income) since there is no
-- period-close process posting net income into Retained Earnings yet.
CREATE OR REPLACE VIEW public.net_income AS
SELECT
    COALESCE(SUM(balance) FILTER (WHERE account_type = 'revenue'), 0)
        - COALESCE(SUM(balance) FILTER (WHERE account_type = 'expense'), 0) AS net_income
FROM public.account_balances
WHERE account_type IN ('revenue', 'expense');

GRANT SELECT ON public.account_balances, public.trial_balance, public.balance_sheet, public.income_statement, public.net_income TO authenticated;
