-- Post journal entries when a payroll entry is marked paid.
--
-- ASSUMPTION: this trigger only sees the payroll row, not which bank account (if any)
-- was debited client-side -- that choice happens separately in usePayPayrollEntry() and
-- isn't itself an instrumented event. So the net amount is credited to Wages Payable
-- (a liability) rather than assumed to be cash out of a specific bank account. This
-- keeps the ledger honest; reconciling Wages Payable against actual bank withdrawals
-- is a manual/periodic step until bank account deductions are themselves journaled.
--
-- Gross (Payroll Expense) = basic_salary + allowances. Net credited to Wages Payable is
-- derived as gross - deductions (not the stored net_salary column), so the entry always
-- balances even if net_salary was manually overridden and doesn't reconcile exactly.

CREATE OR REPLACE FUNCTION public.post_payroll_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_gross NUMERIC := COALESCE(NEW.basic_salary, 0) + COALESCE(NEW.allowances, 0);
    v_deductions NUMERIC := COALESCE(NEW.deductions, 0);
    v_net NUMERIC;
    v_lines JSONB := '[]'::JSONB;
BEGIN
    IF v_gross <= 0 THEN
        RETURN NEW;
    END IF;

    IF v_deductions > v_gross THEN
        v_deductions := v_gross;
    END IF;
    v_net := v_gross - v_deductions;

    v_lines := jsonb_build_array(jsonb_build_object('account_code', '5030', 'debit', v_gross));

    IF v_deductions > 0 THEN
        v_lines := v_lines || jsonb_build_object('account_code', '2025', 'credit', v_deductions);
    END IF;

    IF v_net > 0 THEN
        v_lines := v_lines || jsonb_build_object('account_code', '2020', 'credit', v_net);
    END IF;

    PERFORM public.post_journal_entry(
        COALESCE(NEW.paid_at::date, CURRENT_DATE),
        'Payroll ' || NEW.pay_period_start || ' to ' || NEW.pay_period_end,
        'payroll',
        NEW.id,
        v_lines,
        NEW.created_by
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_payroll_journal_entry
    AFTER UPDATE ON public.payroll
    FOR EACH ROW
    WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid')
    EXECUTE FUNCTION public.post_payroll_journal_entry();
