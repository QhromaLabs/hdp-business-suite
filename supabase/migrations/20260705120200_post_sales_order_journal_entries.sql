-- Post revenue + COGS journal entries when a sales order is delivered.
-- Recognized at delivery (not at order creation) since pending/cancelled orders never complete.
--
-- ASSUMPTION (please validate against real order data before trusting reports):
--   Revenue and tax are derived from total_amount and tax_amount directly
--   (revenue = total_amount - tax_amount), NOT from subtotal - discount_amount.
--   This guarantees the entry always balances even if subtotal/discount_amount/tax_amount
--   don't reconcile perfectly with total_amount in existing data. If they should be the
--   source of truth instead, this trigger needs revisiting.

CREATE OR REPLACE FUNCTION public.post_sales_order_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_total NUMERIC := COALESCE(NEW.total_amount, 0);
    v_tax NUMERIC := COALESCE(NEW.tax_amount, 0);
    v_revenue NUMERIC;
    v_cogs NUMERIC;
    v_cash_account TEXT;
    v_lines JSONB := '[]'::JSONB;
BEGIN
    IF v_total <= 0 THEN
        RETURN NEW;
    END IF;

    -- Clamp so revenue is never negative regardless of bad tax_amount data.
    IF v_tax > v_total THEN
        v_tax := v_total;
    END IF;
    v_revenue := v_total - v_tax;

    IF NEW.is_credit_sale THEN
        v_cash_account := '1020'; -- Accounts Receivable
    ELSIF NEW.payment_method = 'cash' THEN
        v_cash_account := '1010'; -- Cash on Hand
    ELSE
        v_cash_account := '1015'; -- Bank Accounts (bank_transfer, mobile_money, other)
    END IF;

    v_lines := v_lines || jsonb_build_object('account_code', v_cash_account, 'debit', v_total, 'memo', 'Sale ' || NEW.order_number);

    IF v_revenue > 0 THEN
        v_lines := v_lines || jsonb_build_object('account_code', '4010', 'credit', v_revenue, 'memo', 'Sales revenue ' || NEW.order_number);
    END IF;

    IF v_tax > 0 THEN
        v_lines := v_lines || jsonb_build_object('account_code', '2030', 'credit', v_tax, 'memo', 'Sales tax ' || NEW.order_number);
    END IF;

    -- Cost of goods sold, computed from order line items x variant cost_price.
    SELECT COALESCE(SUM(soi.quantity * pv.cost_price), 0)
    INTO v_cogs
    FROM public.sales_order_items soi
    JOIN public.product_variants pv ON pv.id = soi.variant_id
    WHERE soi.order_id = NEW.id;

    IF v_cogs > 0 THEN
        v_lines := v_lines
            || jsonb_build_object('account_code', '5010', 'debit', v_cogs, 'memo', 'COGS ' || NEW.order_number)
            || jsonb_build_object('account_code', '1030', 'credit', v_cogs, 'memo', 'Inventory reduction ' || NEW.order_number);
    END IF;

    PERFORM public.post_journal_entry(
        COALESCE(NEW.dispatched_at::date, CURRENT_DATE),
        'Sales order ' || NEW.order_number || ' delivered',
        'sales_order',
        NEW.id,
        v_lines,
        NEW.approved_by
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_sales_order_journal_entry
    AFTER UPDATE ON public.sales_orders
    FOR EACH ROW
    WHEN (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered')
    EXECUTE FUNCTION public.post_sales_order_journal_entry();
