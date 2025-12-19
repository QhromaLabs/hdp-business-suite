import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  current_balance: number;
  is_active: boolean;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_type: string;
  amount: number;
  transaction_date: string;
  description: string | null;
  reference_number: string | null;
  is_reconciled: boolean;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  reference_number: string | null;
}

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_name');
      
      if (error) throw error;
      return data as BankAccount[];
    },
  });
}

export function useBankTransactions() {
  return useQuery({
    queryKey: ['bank_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as BankTransaction[];
    },
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: ['financial_summary'],
    queryFn: async () => {
      // Get total revenue from sales
      const { data: sales } = await supabase
        .from('sales_orders')
        .select('total_amount')
        .eq('status', 'delivered');
      
      const revenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
      
      // Get total expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount');
      
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      
      // Get cash balance from bank accounts
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('is_active', true);
      
      const cashBalance = accounts?.reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;
      
      // Get receivables (credit sales unpaid)
      const { data: receivables } = await supabase
        .from('customers')
        .select('credit_balance');
      
      const totalReceivables = receivables?.reduce((sum, c) => sum + Number(c.credit_balance), 0) || 0;
      
      // Get payables
      const { data: payables } = await supabase
        .from('creditors')
        .select('outstanding_balance');
      
      const totalPayables = payables?.reduce((sum, c) => sum + Number(c.outstanding_balance), 0) || 0;
      
      return {
        revenue,
        expenses: totalExpenses,
        grossProfit: revenue - totalExpenses,
        netProfit: revenue - totalExpenses,
        cashBalance,
        receivables: totalReceivables,
        payables: totalPayables,
      };
    },
  });
}

export function useExpensesByCategory() {
  return useQuery({
    queryKey: ['expenses_by_category'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('category, amount');
      
      if (error) throw error;
      
      // Group by category
      const grouped = data.reduce((acc, expense) => {
        const cat = expense.category;
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += Number(expense.amount);
        return acc;
      }, {} as Record<string, number>);
      
      const total = Object.values(grouped).reduce((sum, v) => sum + v, 0);
      
      return Object.entries(grouped).map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }));
    },
  });
}
