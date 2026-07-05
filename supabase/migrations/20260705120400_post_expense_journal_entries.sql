-- Post journal entries for the `expenses` table, mapped by category
-- (matching the category strings already used in useAccounting.ts's classification logic).

CREATE OR REPLACE FUNCTION public.post_expense_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_debit_account TEXT;
    v_credit_account TEXT;
BEGIN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
        RETURN NEW;
    END IF;

    IF NEW.category IN ('Inventory Purchase', 'Stock Purchase', 'Raw Materials', 'Inventory') THEN
        v_debit_account := '1040'; -- Raw Materials Inventory (asset, not an expense)
    ELSIF NEW.category = 'Equipment' THEN
        v_debit_account := '1050'; -- Fixed Assets
    ELSIF NEW.category IN ('Shipping Freight Charges', 'Shipping Handling Costs', 'Custom Taxes') THEN
        v_debit_account := '5010'; -- Cost of Goods Sold (landed cost)
    ELSIF NEW.is_manufacturing_cost THEN
        v_debit_account := '5015'; -- Manufacturing Overhead
    ELSE
        v_debit_account := '5020'; -- Operating Expenses
    END IF;

    IF NEW.payment_method IS NULL OR NEW.payment_method = 'credit' THEN
        v_credit_account := '2010'; -- Accounts Payable (unpaid / on credit)
    ELSIF NEW.payment_method = 'cash' THEN
        v_credit_account := '1010'; -- Cash on Hand
    ELSE
        v_credit_account := '1015'; -- Bank Accounts
    END IF;

    PERFORM public.post_journal_entry(
        NEW.expense_date,
        NEW.category || ': ' || NEW.description,
        'expense',
        NEW.id,
        jsonb_build_array(
            jsonb_build_object('account_code', v_debit_account, 'debit', NEW.amount),
            jsonb_build_object('account_code', v_credit_account, 'credit', NEW.amount)
        ),
        COALESCE(NEW.approved_by, NEW.created_by)
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_expense_journal_entry
    AFTER INSERT ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.post_expense_journal_entry();
