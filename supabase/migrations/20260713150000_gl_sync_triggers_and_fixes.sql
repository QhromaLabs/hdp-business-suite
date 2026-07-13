-- GL hardening: keep the ledger in sync when source rows change, and fix defects
-- found in the initial double-entry rollout.
--
-- 1. check_journal_entry_has_lines previously made deleting ANY journal entry
--    impossible: deleting the entry cascades to its lines, the AFTER DELETE
--    constraint trigger fired for each cascaded line, found zero lines left, and
--    raised. Now it only raises when the parent entry still exists (i.e. someone
--    stripped the lines but left the header).
-- 2. Posting/deleting functions become SECURITY DEFINER: journal_entries RLS only
--    lets admin/manager write, but sales can be marked delivered by delivery agents,
--    payments recorded by sales staff, etc. Without DEFINER those posts would be
--    blocked by RLS for non-admin users.
-- 3. Source-row sync: UPDATE/DELETE on expenses, payments, sales_orders,
--    creditor_transactions, bank_transactions, and payroll now delete (and repost,
--    for updates) their journal entries, so the books can no longer drift from the
--    operational tables when rows are edited or removed.
-- 4. Account mapping fixes:
--    - Expenses with NULL payment_method were being booked as unpaid credit
--      purchases (Cr Accounts Payable), overstating AP by millions vs. the
--      creditors table. This business records already-paid expenses without a
--      method, so NULL now means Cash on Hand. Only an explicit 'credit' hits AP.
--    - Creditor bills and inventory-purchase expenses were debited to Raw
--      Materials (1040), but purchase orders here buy sellable finished goods.
--      They now debit Finished Goods Inventory (1030); only the explicit
--      'Raw Materials' expense category still hits 1040.

-- ---------------------------------------------------------------------------
-- 1. Fix the has-lines constraint trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_journal_entry_has_lines()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.journal_entries WHERE id = OLD.entry_id)
       AND NOT EXISTS (SELECT 1 FROM public.journal_entry_lines WHERE entry_id = OLD.entry_id) THEN
        RAISE EXCEPTION 'Journal entry % has no lines left; delete the entry itself instead', OLD.entry_id;
    END IF;
    RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. SECURITY DEFINER on the posting engine + shared delete helper
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.post_journal_entry(DATE, TEXT, TEXT, UUID, JSONB, UUID) SECURITY DEFINER;
ALTER FUNCTION public.post_sales_order_journal_entry() SECURITY DEFINER;
ALTER FUNCTION public.post_payment_journal_entry() SECURITY DEFINER;
ALTER FUNCTION public.post_bank_transaction_journal_entry() SECURITY DEFINER;
ALTER FUNCTION public.post_payroll_journal_entry() SECURITY DEFINER;
ALTER FUNCTION public.post_monthly_depreciation() SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_journal_entries_for(p_source_type TEXT, p_source_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.journal_entries
    WHERE source_type = p_source_type AND source_id = p_source_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Expenses: shared posting logic + INSERT/UPDATE/DELETE sync
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_expense_journal_for(e public.expenses)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_debit_account TEXT;
    v_credit_account TEXT;
BEGIN
    IF e.amount IS NULL OR e.amount <= 0 THEN
        RETURN;
    END IF;

    IF e.category = 'Raw Materials' THEN
        v_debit_account := '1040'; -- Raw Materials Inventory
    ELSIF e.category IN ('Inventory Purchase', 'Stock Purchase', 'Inventory') THEN
        v_debit_account := '1030'; -- Finished Goods Inventory (sellable stock)
    ELSIF e.category = 'Equipment' THEN
        v_debit_account := '1050'; -- Fixed Assets
    ELSIF e.category IN ('Shipping Freight Charges', 'Shipping Handling Costs', 'Custom Taxes') THEN
        v_debit_account := '5010'; -- COGS (landed cost)
    ELSIF e.is_manufacturing_cost THEN
        v_debit_account := '5015'; -- Manufacturing Overhead
    ELSE
        v_debit_account := '5020'; -- Operating Expenses
    END IF;

    IF e.payment_method = 'credit' THEN
        v_credit_account := '2010'; -- Accounts Payable (explicitly on credit)
    ELSIF e.payment_method IS NULL OR e.payment_method = 'cash' THEN
        v_credit_account := '1010'; -- Cash on Hand (NULL = recorded as already paid)
    ELSE
        v_credit_account := '1015'; -- Bank Accounts
    END IF;

    PERFORM public.post_journal_entry(
        e.expense_date,
        e.category || ': ' || e.description,
        'expense',
        e.id,
        jsonb_build_array(
            jsonb_build_object('account_code', v_debit_account, 'debit', e.amount),
            jsonb_build_object('account_code', v_credit_account, 'credit', e.amount)
        ),
        COALESCE(e.approved_by, e.created_by)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.post_expense_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.post_expense_journal_for(NEW);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_expense_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.delete_journal_entries_for('expense', OLD.id);
    IF TG_OP = 'UPDATE' THEN
        PERFORM public.post_expense_journal_for(NEW);
        RETURN NEW;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_expense_journal_entry_upd ON public.expenses;
CREATE TRIGGER trg_sync_expense_journal_entry_upd
    AFTER UPDATE ON public.expenses
    FOR EACH ROW
    WHEN (OLD.amount IS DISTINCT FROM NEW.amount
       OR OLD.category IS DISTINCT FROM NEW.category
       OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
       OR OLD.expense_date IS DISTINCT FROM NEW.expense_date
       OR OLD.is_manufacturing_cost IS DISTINCT FROM NEW.is_manufacturing_cost)
    EXECUTE FUNCTION public.sync_expense_journal_entry();

DROP TRIGGER IF EXISTS trg_sync_expense_journal_entry_del ON public.expenses;
CREATE TRIGGER trg_sync_expense_journal_entry_del
    AFTER DELETE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_expense_journal_entry();

-- ---------------------------------------------------------------------------
-- 4. Payments: shared posting logic + UPDATE/DELETE sync
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_payment_journal_for(p public.payments)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_credit_sale BOOLEAN;
    v_cash_account TEXT;
BEGIN
    IF p.amount IS NULL OR p.amount <= 0 THEN
        RETURN;
    END IF;

    IF p.order_id IS NOT NULL THEN
        SELECT is_credit_sale INTO v_is_credit_sale FROM public.sales_orders WHERE id = p.order_id;
        IF v_is_credit_sale IS NOT TRUE THEN
            RETURN; -- cash for this order is recognized at delivery by the sales trigger
        END IF;
    END IF;

    IF p.payment_method = 'cash' THEN
        v_cash_account := '1010';
    ELSE
        v_cash_account := '1015';
    END IF;

    PERFORM public.post_journal_entry(
        p.created_at::date,
        'Payment received' || CASE WHEN p.reference_number IS NOT NULL THEN ' ' || p.reference_number ELSE '' END,
        'payment',
        p.id,
        jsonb_build_array(
            jsonb_build_object('account_code', v_cash_account, 'debit', p.amount),
            jsonb_build_object('account_code', '1020', 'credit', p.amount)
        ),
        p.received_by
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.post_payment_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.post_payment_journal_for(NEW);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_payment_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.delete_journal_entries_for('payment', OLD.id);
    IF TG_OP = 'UPDATE' THEN
        PERFORM public.post_payment_journal_for(NEW);
        RETURN NEW;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_journal_entry_upd ON public.payments;
CREATE TRIGGER trg_sync_payment_journal_entry_upd
    AFTER UPDATE ON public.payments
    FOR EACH ROW
    WHEN (OLD.amount IS DISTINCT FROM NEW.amount
       OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
       OR OLD.order_id IS DISTINCT FROM NEW.order_id)
    EXECUTE FUNCTION public.sync_payment_journal_entry();

DROP TRIGGER IF EXISTS trg_sync_payment_journal_entry_del ON public.payments;
CREATE TRIGGER trg_sync_payment_journal_entry_del
    AFTER DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_payment_journal_entry();

-- ---------------------------------------------------------------------------
-- 5. Sales orders: make the delivery-posting function DEFINER, and remove the
--    journal entry when a delivered order is deleted or reverted to an
--    undelivered status. (Re-delivering later reposts via the existing trigger.)
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.post_sales_order_journal_entry() SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_sales_order_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.delete_journal_entries_for('sales_order', OLD.id);
    IF TG_OP = 'UPDATE' THEN
        RETURN NEW;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_sales_order_journal_entry_del ON public.sales_orders;
CREATE TRIGGER trg_sync_sales_order_journal_entry_del
    AFTER DELETE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_sales_order_journal_entry();

DROP TRIGGER IF EXISTS trg_sync_sales_order_journal_entry_revert ON public.sales_orders;
CREATE TRIGGER trg_sync_sales_order_journal_entry_revert
    AFTER UPDATE ON public.sales_orders
    FOR EACH ROW
    WHEN (OLD.status IN ('delivered', 'completed') AND NEW.status NOT IN ('delivered', 'completed'))
    EXECUTE FUNCTION public.sync_sales_order_journal_entry();

-- ---------------------------------------------------------------------------
-- 6. Creditor transactions: bills now debit Finished Goods; UPDATE/DELETE sync
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_creditor_transaction_journal_for(t public.creditor_transactions)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF t.amount IS NULL OR t.amount <= 0 THEN
        RETURN;
    END IF;

    IF t.transaction_type = 'bill' THEN
        PERFORM public.post_journal_entry(
            t.created_at::date,
            'Supplier bill' || CASE WHEN t.reference_number IS NOT NULL THEN ' ' || t.reference_number ELSE '' END,
            'creditor_transaction',
            t.id,
            jsonb_build_array(
                jsonb_build_object('account_code', '1030', 'debit', t.amount),
                jsonb_build_object('account_code', '2010', 'credit', t.amount)
            ),
            t.created_by
        );
    ELSIF t.transaction_type = 'payment' THEN
        PERFORM public.post_journal_entry(
            t.created_at::date,
            'Supplier payment' || CASE WHEN t.reference_number IS NOT NULL THEN ' ' || t.reference_number ELSE '' END,
            'creditor_transaction',
            t.id,
            jsonb_build_array(
                jsonb_build_object('account_code', '2010', 'debit', t.amount),
                jsonb_build_object('account_code', '1015', 'credit', t.amount)
            ),
            t.created_by
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_creditor_transaction_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.post_creditor_transaction_journal_for(NEW);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_creditor_transaction_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.delete_journal_entries_for('creditor_transaction', OLD.id);
    IF TG_OP = 'UPDATE' THEN
        PERFORM public.post_creditor_transaction_journal_for(NEW);
        RETURN NEW;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_creditor_transaction_journal_entry_upd ON public.creditor_transactions;
CREATE TRIGGER trg_sync_creditor_transaction_journal_entry_upd
    AFTER UPDATE ON public.creditor_transactions
    FOR EACH ROW
    WHEN (OLD.amount IS DISTINCT FROM NEW.amount
       OR OLD.transaction_type IS DISTINCT FROM NEW.transaction_type)
    EXECUTE FUNCTION public.sync_creditor_transaction_journal_entry();

DROP TRIGGER IF EXISTS trg_sync_creditor_transaction_journal_entry_del ON public.creditor_transactions;
CREATE TRIGGER trg_sync_creditor_transaction_journal_entry_del
    AFTER DELETE ON public.creditor_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_creditor_transaction_journal_entry();

-- ---------------------------------------------------------------------------
-- 7. Bank transactions + payroll: DELETE/revert sync
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_bank_transaction_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.delete_journal_entries_for('bank_transaction', OLD.id);
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bank_transaction_journal_entry_del ON public.bank_transactions;
CREATE TRIGGER trg_sync_bank_transaction_journal_entry_del
    AFTER DELETE ON public.bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_bank_transaction_journal_entry();

CREATE OR REPLACE FUNCTION public.sync_payroll_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.delete_journal_entries_for('payroll', OLD.id);
    IF TG_OP = 'UPDATE' THEN
        RETURN NEW;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payroll_journal_entry_revert ON public.payroll;
CREATE TRIGGER trg_sync_payroll_journal_entry_revert
    AFTER UPDATE ON public.payroll
    FOR EACH ROW
    WHEN (OLD.status = 'paid' AND NEW.status IS DISTINCT FROM 'paid')
    EXECUTE FUNCTION public.sync_payroll_journal_entry();

DROP TRIGGER IF EXISTS trg_sync_payroll_journal_entry_del ON public.payroll;
CREATE TRIGGER trg_sync_payroll_journal_entry_del
    AFTER DELETE ON public.payroll
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_payroll_journal_entry();
