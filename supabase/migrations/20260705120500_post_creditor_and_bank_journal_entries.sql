-- Post journal entries for creditor_transactions and bank_transactions.
--
-- creditor_transactions.transaction_type is free text; the only values used in the
-- codebase today are 'bill' (a supplier invoice/purchase, increasing Accounts Payable)
-- and 'payment' (paying down that payable). There is no payment_method column on this
-- table, so supplier payments are assumed to be from Bank Accounts -- flagged as an
-- assumption to validate.
--
-- bank_transactions.transaction_type is also free text and not tied to any specific
-- offsetting account (it's a reconciliation log, not a source document). Rather than
-- guess at a business meaning we can't verify, inflows/outflows post against a Suspense
-- account (9000) so the ledger stays balanced and cash-correct while flagging these
-- for manual reclassification instead of silently mis-categorizing them.
--
-- 'Payroll Payout' rows are skipped here: the payroll trigger already recognizes that
-- expense/liability, so posting it again here would double-count. (Note: as of this
-- writing, usePayPayrollEntry() in useEmployees.ts inserts into bank_transactions using
-- a column named account_id, but the real column is bank_account_id -- that insert is
-- likely failing today. Worth fixing independently of this migration.)

INSERT INTO public.chart_of_accounts (code, name, account_type, normal_balance)
VALUES ('9000', 'Suspense / Uncategorized', 'liability', 'credit');

CREATE OR REPLACE FUNCTION public.post_creditor_transaction_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
        RETURN NEW;
    END IF;

    IF NEW.transaction_type = 'bill' THEN
        PERFORM public.post_journal_entry(
            NEW.created_at::date,
            'Supplier bill' || CASE WHEN NEW.reference_number IS NOT NULL THEN ' ' || NEW.reference_number ELSE '' END,
            'creditor_transaction',
            NEW.id,
            jsonb_build_array(
                jsonb_build_object('account_code', '1040', 'debit', NEW.amount),
                jsonb_build_object('account_code', '2010', 'credit', NEW.amount)
            ),
            NEW.created_by
        );
    ELSIF NEW.transaction_type = 'payment' THEN
        PERFORM public.post_journal_entry(
            NEW.created_at::date,
            'Supplier payment' || CASE WHEN NEW.reference_number IS NOT NULL THEN ' ' || NEW.reference_number ELSE '' END,
            'creditor_transaction',
            NEW.id,
            jsonb_build_array(
                jsonb_build_object('account_code', '2010', 'debit', NEW.amount),
                jsonb_build_object('account_code', '1015', 'credit', NEW.amount)
            ),
            NEW.created_by
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_creditor_transaction_journal_entry
    AFTER INSERT ON public.creditor_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.post_creditor_transaction_journal_entry();

CREATE OR REPLACE FUNCTION public.post_bank_transaction_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_is_inflow BOOLEAN;
BEGIN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
        RETURN NEW;
    END IF;

    IF lower(NEW.transaction_type) LIKE '%payroll%' THEN
        RETURN NEW; -- handled by the payroll trigger instead
    END IF;

    v_is_inflow := lower(NEW.transaction_type) LIKE '%credit%'
        OR lower(NEW.transaction_type) LIKE '%deposit%'
        OR lower(NEW.transaction_type) LIKE '%receive%'
        OR lower(NEW.transaction_type) LIKE '%inflow%';

    PERFORM public.post_journal_entry(
        NEW.transaction_date,
        'Bank ' || NEW.transaction_type || COALESCE(': ' || NEW.description, ''),
        'bank_transaction',
        NEW.id,
        CASE WHEN v_is_inflow THEN
            jsonb_build_array(
                jsonb_build_object('account_code', '1015', 'debit', NEW.amount),
                jsonb_build_object('account_code', '9000', 'credit', NEW.amount)
            )
        ELSE
            jsonb_build_array(
                jsonb_build_object('account_code', '9000', 'debit', NEW.amount),
                jsonb_build_object('account_code', '1015', 'credit', NEW.amount)
            )
        END,
        NEW.created_by
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_bank_transaction_journal_entry
    AFTER INSERT ON public.bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.post_bank_transaction_journal_entry();
