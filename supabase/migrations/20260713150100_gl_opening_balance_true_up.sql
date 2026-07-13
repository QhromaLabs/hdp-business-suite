-- Opening-balance true-up: align GL balance-sheet accounts with the operational
-- tables that actually track those quantities, offsetting to a dedicated equity
-- account (3020 Opening Balance Adjustments). This is the standard adoption step
-- when a general ledger is introduced mid-life: the P&L flows are journaled going
-- forward, but the opening LEVELS have to be seeded from reality.
--
-- Why each account needs it (verified against live data on 2026-07-13):
--   1020 AR   was -4.4M (impossible) because backfilled standalone payments
--             over-credited AR; customers.credit_balance says 5.57M is owed.
--   2010 AP   was 12.26M but creditors.outstanding_balance nets to ~0; the gap is
--             NULL-payment-method expenses that were booked as unpaid (fixed
--             going forward in the sync-triggers migration).
--   1030/1040 had no debits from purchase receipts (backfill routed PO bills to
--             1040 and nothing relieved it into 1030), so both are seeded from
--             inventory_batches / raw_materials live values.
--   1050/1055 machines bought before the GL existed never hit Fixed Assets.
--
-- Targets are computed LIVE at execution time, so this migration is correct
-- whenever it runs. It is also idempotent: it refuses to run twice (guarded by
-- the presence of a prior 'opening_balance' journal entry).

INSERT INTO public.chart_of_accounts (code, name, account_type, normal_balance)
SELECT '3020', 'Opening Balance Adjustments', 'equity', 'credit'
WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE code = '3020');

DO $$
DECLARE
    v_lines JSONB := '[]'::JSONB;
    v_debits NUMERIC := 0;
    v_credits NUMERIC := 0;
    v_target NUMERIC;
    v_current NUMERIC;
    v_delta NUMERIC;
    v_rec RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM public.journal_entries WHERE source_type = 'opening_balance') THEN
        RAISE NOTICE 'Opening balance true-up already posted; skipping.';
        RETURN;
    END IF;

    FOR v_rec IN
        SELECT * FROM (VALUES
            ('1020', 'debit'::text,  (SELECT COALESCE(SUM(credit_balance), 0) FROM public.customers)),
            ('2010', 'credit'::text, (SELECT COALESCE(SUM(GREATEST(outstanding_balance, 0)), 0) FROM public.creditors)),
            ('1030', 'debit'::text,  (SELECT COALESCE(SUM(quantity_remaining * landed_cost_per_unit), 0) FROM public.inventory_batches)),
            ('1040', 'debit'::text,  (SELECT COALESCE(SUM(quantity_in_stock * unit_cost), 0) FROM public.raw_materials)),
            ('1050', 'debit'::text,  (SELECT COALESCE(SUM(purchase_cost), 0) FROM public.machines)),
            ('1055', 'credit'::text, (SELECT COALESCE(SUM(accumulated_depreciation), 0) FROM public.machines))
        ) AS t(code, normal_side, target)
    LOOP
        v_target := ROUND(v_rec.target, 2);

        SELECT COALESCE(balance, 0) INTO v_current
        FROM public.account_balances
        WHERE code = v_rec.code;

        v_delta := v_target - COALESCE(v_current, 0);

        IF v_delta = 0 THEN
            CONTINUE;
        END IF;

        -- Positive delta means the account needs MORE of its normal side.
        IF (v_rec.normal_side = 'debit' AND v_delta > 0) OR (v_rec.normal_side = 'credit' AND v_delta < 0) THEN
            v_lines := v_lines || jsonb_build_object(
                'account_code', v_rec.code, 'debit', ABS(v_delta),
                'memo', 'True-up to operational records');
            v_debits := v_debits + ABS(v_delta);
        ELSE
            v_lines := v_lines || jsonb_build_object(
                'account_code', v_rec.code, 'credit', ABS(v_delta),
                'memo', 'True-up to operational records');
            v_credits := v_credits + ABS(v_delta);
        END IF;
    END LOOP;

    IF v_lines = '[]'::JSONB THEN
        RAISE NOTICE 'All accounts already match operational values; nothing to post.';
        RETURN;
    END IF;

    -- Balance the entry against Opening Balance Adjustments equity.
    IF v_debits > v_credits THEN
        v_lines := v_lines || jsonb_build_object('account_code', '3020', 'credit', v_debits - v_credits, 'memo', 'Opening balance offset');
    ELSIF v_credits > v_debits THEN
        v_lines := v_lines || jsonb_build_object('account_code', '3020', 'debit', v_credits - v_debits, 'memo', 'Opening balance offset');
    END IF;

    PERFORM public.post_journal_entry(
        CURRENT_DATE,
        'Opening balance true-up: align GL with operational tables (customers, creditors, inventory batches, raw materials, machines)',
        'opening_balance',
        NULL,
        v_lines
    );
END $$;
