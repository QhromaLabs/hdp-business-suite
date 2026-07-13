-- Double-entry accounting: General Journal
-- journal_entries is the transaction header; journal_entry_lines holds the debit/credit lines.
-- A deferred constraint trigger enforces sum(debit) = sum(credit) per entry at COMMIT time,
-- so no code path (trigger, RPC, or manual insert) can ever leave an unbalanced entry in the ledger.

CREATE TABLE public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    memo TEXT,
    source_type TEXT NOT NULL, -- e.g. 'sales_order', 'payment', 'expense', 'payroll'
    source_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_source ON public.journal_entries(source_type, source_id);
CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date);

CREATE TABLE public.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
    debit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_side_only CHECK (
        (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
    )
);

CREATE INDEX idx_journal_entry_lines_entry ON public.journal_entry_lines(entry_id);
CREATE INDEX idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);

-- Balance-enforcing trigger: fires once per affected row but checks the whole entry's
-- debit/credit sum, deferred to end of transaction so multi-line inserts can complete first.
CREATE OR REPLACE FUNCTION public.check_journal_entry_balanced()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_entry_id UUID;
    v_diff NUMERIC;
BEGIN
    v_entry_id := COALESCE(NEW.entry_id, OLD.entry_id);

    SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
    INTO v_diff
    FROM public.journal_entry_lines
    WHERE entry_id = v_entry_id;

    IF v_diff <> 0 THEN
        RAISE EXCEPTION 'Journal entry % is not balanced: debit-credit difference = %', v_entry_id, v_diff;
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_check_journal_entry_balanced
    AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.check_journal_entry_balanced();

-- Also reject an entry left with zero lines (e.g. all lines deleted).
CREATE OR REPLACE FUNCTION public.check_journal_entry_has_lines()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.journal_entry_lines WHERE entry_id = OLD.entry_id) THEN
        RAISE EXCEPTION 'Journal entry % has no lines left; delete the entry itself instead', OLD.entry_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_check_journal_entry_has_lines
    AFTER DELETE ON public.journal_entry_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.check_journal_entry_has_lines();

-- Helper used by all posting triggers: takes a JSONB array of
-- {"account_code": "...", "debit": n, "credit": n, "memo": "..."} lines and posts one balanced entry.
CREATE OR REPLACE FUNCTION public.post_journal_entry(
    p_entry_date DATE,
    p_memo TEXT,
    p_source_type TEXT,
    p_source_id UUID,
    p_lines JSONB,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_entry_id UUID;
    v_line JSONB;
    v_account_id UUID;
    v_debit NUMERIC;
    v_credit NUMERIC;
BEGIN
    INSERT INTO public.journal_entries (entry_date, memo, source_type, source_id, created_by)
    VALUES (p_entry_date, p_memo, p_source_type, p_source_id, p_created_by)
    RETURNING id INTO v_entry_id;

    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        v_debit := COALESCE((v_line->>'debit')::NUMERIC, 0);
        v_credit := COALESCE((v_line->>'credit')::NUMERIC, 0);

        -- Skip zero-amount lines rather than posting a line that would violate one_side_only.
        IF v_debit = 0 AND v_credit = 0 THEN
            CONTINUE;
        END IF;

        SELECT id INTO v_account_id FROM public.chart_of_accounts WHERE code = v_line->>'account_code';
        IF v_account_id IS NULL THEN
            RAISE EXCEPTION 'Unknown chart of accounts code: %', v_line->>'account_code';
        END IF;

        INSERT INTO public.journal_entry_lines (entry_id, account_id, debit, credit, memo)
        VALUES (v_entry_id, v_account_id, v_debit, v_credit, v_line->>'memo');
    END LOOP;

    RETURN v_entry_id;
END;
$$;

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view journal entries" ON public.journal_entries FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage journal entries" ON public.journal_entries FOR ALL USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated can view journal entry lines" ON public.journal_entry_lines FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage journal entry lines" ON public.journal_entry_lines FOR ALL USING (is_admin_or_manager(auth.uid()));
