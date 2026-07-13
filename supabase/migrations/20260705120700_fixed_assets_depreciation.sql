-- Fixed asset depreciation, built on the existing `machines` table (purchase_cost,
-- current_value, depreciation_rate already exist there but nothing ever posted
-- depreciation or moved current_value off being a manually-edited number).
--
-- NOTE: this migration does NOT add a posting trigger for machine *purchases*, because
-- machine purchases appear to already be recorded through the `expenses` table
-- (category = 'Equipment', which the expense trigger already debits to Fixed Assets 1050).
-- Adding another trigger on machines INSERT would double-count if both paths are used.
-- If machines are sometimes added without a matching expense row, that purchase's debit
-- to Fixed Assets needs to be entered as a manual journal entry instead.

ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS accumulated_depreciation NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS last_depreciated_at DATE;

-- Posts one month of straight-line depreciation for every active machine that hasn't
-- already been depreciated this month. Callable manually (e.g. an admin "Run
-- Depreciation" action) or from a scheduler (pg_cron / edge function cron) if configured
-- -- this migration does not assume pg_cron is enabled on this project.
CREATE OR REPLACE FUNCTION public.post_monthly_depreciation()
RETURNS TABLE (machine_id UUID, amount_posted NUMERIC)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_machine RECORD;
    v_monthly_amount NUMERIC;
    v_remaining_book_value NUMERIC;
BEGIN
    FOR v_machine IN
        SELECT * FROM public.machines
        WHERE status <> 'disposed'
          AND purchase_cost > 0
          AND (last_depreciated_at IS NULL OR last_depreciated_at < date_trunc('month', CURRENT_DATE))
    LOOP
        v_remaining_book_value := v_machine.purchase_cost - v_machine.accumulated_depreciation;
        v_monthly_amount := LEAST(
            ROUND(v_machine.purchase_cost * (v_machine.depreciation_rate / 100.0) / 12.0, 2),
            v_remaining_book_value
        );

        IF v_monthly_amount > 0 THEN
            PERFORM public.post_journal_entry(
                CURRENT_DATE,
                'Monthly depreciation: ' || v_machine.name,
                'depreciation',
                v_machine.id,
                jsonb_build_array(
                    jsonb_build_object('account_code', '5040', 'debit', v_monthly_amount),
                    jsonb_build_object('account_code', '1055', 'credit', v_monthly_amount)
                )
            );

            UPDATE public.machines
            SET accumulated_depreciation = accumulated_depreciation + v_monthly_amount,
                current_value = purchase_cost - (accumulated_depreciation + v_monthly_amount),
                last_depreciated_at = CURRENT_DATE
            WHERE id = v_machine.id;

            machine_id := v_machine.id;
            amount_posted := v_monthly_amount;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_monthly_depreciation() TO authenticated;
