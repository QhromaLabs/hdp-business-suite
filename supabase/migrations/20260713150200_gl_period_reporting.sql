-- Period-filtered GL reporting, so the Accounting page's date-range picker can
-- drive the income statement (the all-time views can't be date-filtered through
-- PostgREST because the entry_date lives on the parent journal_entries row).
-- Balance-sheet accounts are levels, not flows, so they stay as-of views.

CREATE OR REPLACE FUNCTION public.gl_income_statement(p_from DATE, p_to DATE)
RETURNS TABLE (
    code TEXT,
    name TEXT,
    account_type public.account_type,
    balance NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        coa.code,
        coa.name,
        coa.account_type,
        CASE
            WHEN coa.normal_balance = 'debit'
                THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
            ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
        END AS balance
    FROM public.chart_of_accounts coa
    JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
    JOIN public.journal_entries je ON je.id = jel.entry_id
    WHERE coa.account_type IN ('revenue', 'expense')
      AND je.entry_date BETWEEN p_from AND p_to
    GROUP BY coa.id, coa.code, coa.name, coa.account_type, coa.normal_balance
    ORDER BY coa.account_type DESC, coa.code;
$$;

CREATE OR REPLACE FUNCTION public.gl_net_income(p_from DATE, p_to DATE)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(CASE WHEN account_type = 'revenue' THEN balance ELSE -balance END), 0)
    FROM public.gl_income_statement(p_from, p_to);
$$;

GRANT EXECUTE ON FUNCTION public.gl_income_statement(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gl_net_income(DATE, DATE) TO authenticated;
