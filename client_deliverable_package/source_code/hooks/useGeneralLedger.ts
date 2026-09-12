import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface AccountBalanceRow {
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  total_debit: number;
  total_credit: number;
  balance?: number;
}

export interface JournalEntryLine {
  id: string;
  debit: number;
  credit: number;
  memo: string | null;
  chart_of_accounts: { code: string; name: string } | null;
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  memo: string | null;
  source_type: string;
  created_at: string;
  journal_entry_lines: JournalEntryLine[];
}

const GL_KEYS = [
  ['trial_balance'],
  ['balance_sheet_gl'],
  ['income_statement_gl'],
  ['net_income_gl'],
  ['journal_entries'],
  ['gl_income_statement_period'],
] as const;

export function useInvalidateGL() {
  const queryClient = useQueryClient();
  return () => GL_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [...key] }));
}

export function useTrialBalance() {
  return useQuery({
    queryKey: ['trial_balance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('trial_balance').select('*');
      if (error) throw error;
      return (data || []) as AccountBalanceRow[];
    },
  });
}

export function useBalanceSheetGL() {
  return useQuery({
    queryKey: ['balance_sheet_gl'],
    queryFn: async () => {
      const { data, error } = await supabase.from('balance_sheet').select('*');
      if (error) throw error;
      return (data || []) as AccountBalanceRow[];
    },
  });
}

/** All-time income statement (levels since GL adoption). */
export function useIncomeStatementGL() {
  return useQuery({
    queryKey: ['income_statement_gl'],
    queryFn: async () => {
      const { data, error } = await supabase.from('income_statement').select('*');
      if (error) throw error;
      return (data || []) as AccountBalanceRow[];
    },
  });
}

const toDateOnly = (d: Date) => {
  const tzAdjusted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tzAdjusted.toISOString().slice(0, 10);
};

/** Income statement for a specific period, computed server-side from journal entries. */
export function useIncomeStatementPeriod(range?: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ['gl_income_statement_period', range?.from?.toISOString(), range?.to?.toISOString()],
    queryFn: async () => {
      const from = range?.from ? toDateOnly(range.from) : '2000-01-01';
      const to = range?.to ? toDateOnly(range.to) : toDateOnly(new Date());
      const { data, error } = await supabase.rpc('gl_income_statement', { p_from: from, p_to: to });
      if (error) throw error;
      return (data || []) as AccountBalanceRow[];
    },
  });
}

export function useNetIncomeGL() {
  return useQuery({
    queryKey: ['net_income_gl'],
    queryFn: async () => {
      const { data, error } = await supabase.from('net_income').select('*').single();
      if (error) throw error;
      return Number(data?.net_income || 0);
    },
  });
}

export function useJournalEntries(page = 1, pageSize = 25) {
  return useQuery({
    queryKey: ['journal_entries', page, pageSize],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const { data, error, count } = await supabase
        .from('journal_entries')
        .select('id, entry_date, memo, source_type, created_at, journal_entry_lines(id, debit, credit, memo, chart_of_accounts(code, name))', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      return {
        entries: (data || []) as unknown as JournalEntry[],
        totalCount: count || 0
      };
    },
  });
}

export function useRunDepreciation() {
  const invalidateGL = useInvalidateGL();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('post_monthly_depreciation');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidateGL();
      toast({ title: 'Depreciation posted', description: `${(data || []).length} asset(s) depreciated.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to post depreciation', description: error.message, variant: 'destructive' });
    },
  });
}
