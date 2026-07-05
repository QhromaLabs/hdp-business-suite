-- Post journal entries for the `payments` table.
--
-- ASSUMPTION (please validate against real data before trusting reports):
--   Cash from non-credit sales is already recognized by the sales_order trigger at delivery
--   (debits Cash/Bank directly, not AR). To avoid double-counting cash, this trigger only
--   posts a payment as an AR settlement (Dr Cash/Bank, Cr Accounts Receivable) when:
--     - the payment has no order_id (a standalone customer payment against their running
--       credit_balance), or
--     - the linked sales_orders.is_credit_sale = true (this is collection on existing AR).
--   Payments against non-credit sales are skipped here since that cash was already posted
--   at delivery. If payments can arrive BEFORE delivery (e.g. deposits), this will
--   under-record cash until the order is marked delivered -- flagged for review.

CREATE OR REPLACE FUNCTION public.post_payment_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_is_credit_sale BOOLEAN;
    v_cash_account TEXT;
BEGIN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
        RETURN NEW;
    END IF;

    IF NEW.order_id IS NOT NULL THEN
        SELECT is_credit_sale INTO v_is_credit_sale FROM public.sales_orders WHERE id = NEW.order_id;
        IF v_is_credit_sale IS NOT TRUE THEN
            RETURN NEW; -- already recognized at delivery
        END IF;
    END IF;

    IF NEW.payment_method = 'cash' THEN
        v_cash_account := '1010';
    ELSE
        v_cash_account := '1015';
    END IF;

    PERFORM public.post_journal_entry(
        NEW.created_at::date,
        'Payment received' || CASE WHEN NEW.reference_number IS NOT NULL THEN ' ' || NEW.reference_number ELSE '' END,
        'payment',
        NEW.id,
        jsonb_build_array(
            jsonb_build_object('account_code', v_cash_account, 'debit', NEW.amount),
            jsonb_build_object('account_code', '1020', 'credit', NEW.amount)
        ),
        NEW.received_by
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_payment_journal_entry
    AFTER INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.post_payment_journal_entry();
