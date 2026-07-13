import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

// NOTE: chart_of_accounts / journal_entries / journal_entry_lines / trial_balance /
// balance_sheet / income_statement are not yet in the generated Supabase types
// (src/integrations/supabase/types.ts) because that file is regenerated via
// `supabase gen types typescript` against the live project, which requires CLI
// credentials this environment doesn't have. Hence the `as any` casts below --
// replace with typed calls once types are regenerated after the migration is applied.

export interface AccountBalanceRow {
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  total_debit: number;
  total_credit: number;
  balance?: number;
}

export function useTrialBalance() {
  return useQuery({
    queryKey: ['trial_balance'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('trial_balance')
        .select('*');
      if (error) throw error;
      return (data || []) as AccountBalanceRow[];
    },
  });
}

export function useBalanceSheetGL() {
  return useQuery({
    queryKey: ['balance_sheet_gl'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('balance_sheet')
        .select('*');
      if (error) throw error;
      return (data || []) as AccountBalanceRow[];
    },
  });
}

export function useIncomeStatementGL() {
  return useQuery({
    queryKey: ['income_statement_gl'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('income_statement')
        .select('*');
      if (error) throw error;
      return (data || []) as AccountBalanceRow[];
    },
  });
}

export function useNetIncomeGL() {
  return useQuery({
    queryKey: ['net_income_gl'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('net_income')
        .select('*')
        .single();
      if (error) throw error;
      return (data?.net_income || 0) as number;
    },
  });
}

export function useJournalEntries(limit = 50) {
  return useQuery({
    queryKey: ['journal_entries', limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('journal_entries')
        .select('*, journal_entry_lines(*, chart_of_accounts(code, name))')
        .order('entry_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRunDepreciation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc('post_monthly_depreciation');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trial_balance'] });
      queryClient.invalidateQueries({ queryKey: ['balance_sheet_gl'] });
      queryClient.invalidateQueries({ queryKey: ['income_statement_gl'] });
      toast({ title: 'Depreciation posted', description: `${(data || []).length} asset(s) depreciated.` });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to post depreciation', description: error.message, variant: 'destructive' });
    },
  });
}
