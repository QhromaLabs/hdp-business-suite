-- Manual journal entries for accountants (adjustments, reclassifications,
-- corrections like setting real bank balances against 3020).
--
-- post_journal_entry is SECURITY DEFINER and Postgres grants EXECUTE on new
-- functions to PUBLIC by default, so lock it down first: only triggers and
-- privileged wrappers may call it directly.
REVOKE EXECUTE ON FUNCTION public.post_journal_entry(DATE, TEXT, TEXT, UUID, JSONB, UUID) FROM PUBLIC, anon, authenticated;

-- Admin/manager-only wrapper used by the "New Journal Entry" form in the app.
CREATE OR REPLACE FUNCTION public.post_manual_journal_entry(
    p_entry_date DATE,
    p_memo TEXT,
    p_lines JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin_or_manager(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins and managers can post manual journal entries';
    END IF;
    IF p_memo IS NULL OR btrim(p_memo) = '' THEN
        RAISE EXCEPTION 'A memo describing the adjustment is required';
    END IF;
    RETURN public.post_journal_entry(p_entry_date, p_memo, 'manual', NULL, p_lines, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_manual_journal_entry(DATE, TEXT, JSONB) TO authenticated;

-- Voiding a manual entry (only manual ones — trigger-posted entries must be
-- corrected by editing/deleting their source record so books and records stay
-- in sync).
CREATE OR REPLACE FUNCTION public.delete_manual_journal_entry(p_entry_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin_or_manager(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins and managers can delete manual journal entries';
    END IF;
    DELETE FROM public.journal_entries
    WHERE id = p_entry_id AND source_type = 'manual';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Entry not found or not a manual entry (system-posted entries are corrected via their source record)';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_manual_journal_entry(UUID) TO authenticated;
