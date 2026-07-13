-- One-time backfill: post journal entries for business activity that happened BEFORE
-- the double-entry ledger triggers existed. The triggers only fire on new inserts/status
-- transitions, so without this the GL starts empty even though the business has history.
--
-- Mirrors each posting trigger's logic exactly (can't call trigger functions directly
-- outside trigger context), reading existing rows instead of NEW. Guarded by a
-- NOT EXISTS check on journal_entries(source_type, source_id) so it's safe to re-run.
--
-- Sales orders: a completed order always passed through 'delivered' first (see
-- Orders.tsx -- the "Complete" button only appears once status = 'delivered'), so
-- status IN ('delivered', 'completed') captures every order the live trigger would
-- have fired for.

DO $$
DECLARE
    v_order RECORD;
    v_total NUMERIC;
    v_tax NUMERIC;
    v_revenue NUMERIC;
    v_cogs NUMERIC;
    v_cash_account TEXT;
    v_lines JSONB;
BEGIN
    FOR v_order IN
        SELECT * FROM public.sales_orders
        WHERE status IN ('delivered', 'completed')
          AND NOT EXISTS (
              SELECT 1 FROM public.journal_entries
              WHERE source_type = 'sales_order' AND source_id = sales_orders.id
          )
    LOOP
        v_total := COALESCE(v_order.total_amount, 0);
        IF v_total <= 0 THEN
            CONTINUE;
        END IF;

        v_tax := COALESCE(v_order.tax_amount, 0);
        IF v_tax > v_total THEN
            v_tax := v_total;
        END IF;
        v_revenue := v_total - v_tax;

        IF v_order.is_credit_sale THEN
            v_cash_account := '1020';
        ELSIF v_order.payment_method = 'cash' THEN
            v_cash_account := '1010';
        ELSE
            v_cash_account := '1015';
        END IF;

        v_lines := jsonb_build_array(jsonb_build_object('account_code', v_cash_account, 'debit', v_total, 'memo', 'Sale ' || v_order.order_number));

        IF v_revenue > 0 THEN
            v_lines := v_lines || jsonb_build_object('account_code', '4010', 'credit', v_revenue, 'memo', 'Sales revenue ' || v_order.order_number);
        END IF;

        IF v_tax > 0 THEN
            v_lines := v_lines || jsonb_build_object('account_code', '2030', 'credit', v_tax, 'memo', 'Sales tax ' || v_order.order_number);
        END IF;

        SELECT COALESCE(SUM(soi.quantity * soi.landed_cost_at_sale), 0)
        INTO v_cogs
        FROM public.sales_order_items soi
        WHERE soi.order_id = v_order.id;

        IF v_cogs > 0 THEN
            v_lines := v_lines
                || jsonb_build_object('account_code', '5010', 'debit', v_cogs, 'memo', 'COGS ' || v_order.order_number)
                || jsonb_build_object('account_code', '1030', 'credit', v_cogs, 'memo', 'Inventory reduction ' || v_order.order_number);
        END IF;

        PERFORM public.post_journal_entry(
            COALESCE(v_order.dispatched_at::date, v_order.created_at::date),
            'Sales order ' || v_order.order_number || ' delivered (backfilled)',
            'sales_order',
            v_order.id,
            v_lines,
            v_order.approved_by
        );
    END LOOP;
END $$;

DO $$
DECLARE
    v_payment RECORD;
    v_is_credit_sale BOOLEAN;
    v_cash_account TEXT;
BEGIN
    FOR v_payment IN
        SELECT * FROM public.payments
        WHERE NOT EXISTS (
            SELECT 1 FROM public.journal_entries
            WHERE source_type = 'payment' AND source_id = payments.id
        )
    LOOP
        IF v_payment.amount IS NULL OR v_payment.amount <= 0 THEN
            CONTINUE;
        END IF;

        IF v_payment.order_id IS NOT NULL THEN
            SELECT is_credit_sale INTO v_is_credit_sale FROM public.sales_orders WHERE id = v_payment.order_id;
            IF v_is_credit_sale IS NOT TRUE THEN
                CONTINUE;
            END IF;
        END IF;

        IF v_payment.payment_method = 'cash' THEN
            v_cash_account := '1010';
        ELSE
            v_cash_account := '1015';
        END IF;

        PERFORM public.post_journal_entry(
            v_payment.created_at::date,
            'Payment received' || CASE WHEN v_payment.reference_number IS NOT NULL THEN ' ' || v_payment.reference_number ELSE '' END || ' (backfilled)',
            'payment',
            v_payment.id,
            jsonb_build_array(
                jsonb_build_object('account_code', v_cash_account, 'debit', v_payment.amount),
                jsonb_build_object('account_code', '1020', 'credit', v_payment.amount)
            ),
            v_payment.received_by
        );
    END LOOP;
END $$;

DO $$
DECLARE
    v_expense RECORD;
    v_debit_account TEXT;
    v_credit_account TEXT;
BEGIN
    FOR v_expense IN
        SELECT * FROM public.expenses
        WHERE NOT EXISTS (
            SELECT 1 FROM public.journal_entries
            WHERE source_type = 'expense' AND source_id = expenses.id
        )
    LOOP
        IF v_expense.amount IS NULL OR v_expense.amount <= 0 THEN
            CONTINUE;
        END IF;

        IF v_expense.category IN ('Inventory Purchase', 'Stock Purchase', 'Raw Materials', 'Inventory') THEN
            v_debit_account := '1040';
        ELSIF v_expense.category = 'Equipment' THEN
            v_debit_account := '1050';
        ELSIF v_expense.category IN ('Shipping Freight Charges', 'Shipping Handling Costs', 'Custom Taxes') THEN
            v_debit_account := '5010';
        ELSIF v_expense.is_manufacturing_cost THEN
            v_debit_account := '5015';
        ELSE
            v_debit_account := '5020';
        END IF;

        IF v_expense.payment_method IS NULL OR v_expense.payment_method = 'credit' THEN
            v_credit_account := '2010';
        ELSIF v_expense.payment_method = 'cash' THEN
            v_credit_account := '1010';
        ELSE
            v_credit_account := '1015';
        END IF;

        PERFORM public.post_journal_entry(
            v_expense.expense_date,
            v_expense.category || ': ' || v_expense.description || ' (backfilled)',
            'expense',
            v_expense.id,
            jsonb_build_array(
                jsonb_build_object('account_code', v_debit_account, 'debit', v_expense.amount),
                jsonb_build_object('account_code', v_credit_account, 'credit', v_expense.amount)
            ),
            COALESCE(v_expense.approved_by, v_expense.created_by)
        );
    END LOOP;
END $$;

DO $$
DECLARE
    v_txn RECORD;
BEGIN
    FOR v_txn IN
        SELECT * FROM public.creditor_transactions
        WHERE NOT EXISTS (
            SELECT 1 FROM public.journal_entries
            WHERE source_type = 'creditor_transaction' AND source_id = creditor_transactions.id
        )
    LOOP
        IF v_txn.amount IS NULL OR v_txn.amount <= 0 THEN
            CONTINUE;
        END IF;

        IF v_txn.transaction_type = 'bill' THEN
            PERFORM public.post_journal_entry(
                v_txn.created_at::date,
                'Supplier bill' || CASE WHEN v_txn.reference_number IS NOT NULL THEN ' ' || v_txn.reference_number ELSE '' END || ' (backfilled)',
                'creditor_transaction',
                v_txn.id,
                jsonb_build_array(
                    jsonb_build_object('account_code', '1040', 'debit', v_txn.amount),
                    jsonb_build_object('account_code', '2010', 'credit', v_txn.amount)
                ),
                v_txn.created_by
            );
        ELSIF v_txn.transaction_type = 'payment' THEN
            PERFORM public.post_journal_entry(
                v_txn.created_at::date,
                'Supplier payment' || CASE WHEN v_txn.reference_number IS NOT NULL THEN ' ' || v_txn.reference_number ELSE '' END || ' (backfilled)',
                'creditor_transaction',
                v_txn.id,
                jsonb_build_array(
                    jsonb_build_object('account_code', '2010', 'debit', v_txn.amount),
                    jsonb_build_object('account_code', '1015', 'credit', v_txn.amount)
                ),
                v_txn.created_by
            );
        END IF;
    END LOOP;
END $$;

DO $$
DECLARE
    v_pay RECORD;
    v_gross NUMERIC;
    v_deductions NUMERIC;
    v_net NUMERIC;
    v_lines JSONB;
BEGIN
    FOR v_pay IN
        SELECT * FROM public.payroll
        WHERE status = 'paid'
          AND NOT EXISTS (
              SELECT 1 FROM public.journal_entries
              WHERE source_type = 'payroll' AND source_id = payroll.id
          )
    LOOP
        v_gross := COALESCE(v_pay.basic_salary, 0) + COALESCE(v_pay.allowances, 0);
        IF v_gross <= 0 THEN
            CONTINUE;
        END IF;

        v_deductions := COALESCE(v_pay.deductions, 0);
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
            COALESCE(v_pay.paid_at::date, v_pay.created_at::date),
            'Payroll ' || v_pay.pay_period_start || ' to ' || v_pay.pay_period_end || ' (backfilled)',
            'payroll',
            v_pay.id,
            v_lines,
            v_pay.created_by
        );
    END LOOP;
END $$;
