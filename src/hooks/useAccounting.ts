import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  is_manufacturing_cost?: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  created_at: string;
  order_id: string | null;
  customer_id: string | null;
}

export interface ProductionRun {
  id: string;
  production_cost: number;
  status: string;
  start_date: string | null;
  machine?: { name?: string | null };
}

export interface CreditorTransaction {
  id: string;
  creditor_id: string;
  transaction_type: string;
  amount: number;
  reference_number: string | null;
  created_at: string;
  creditor?: { name?: string | null };
}

export interface Payroll {
  id: string;
  net_salary: number;
  paid_at: string | null;
  status: string;
}

export function usePayroll() {
  return useQuery({
    queryKey: ['payroll'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .order('paid_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Payroll[];
    },
  });
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
      const [{ data: expenses, error }, { data: bankTx, error: bankError }] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .order('expense_date', { ascending: false })
          .limit(50),
        supabase
          .from('bank_transactions')
          .select('id, transaction_type, amount, transaction_date, description, reference_number')
          .order('transaction_date', { ascending: false })
          .limit(50),
      ]);

      if (error) throw error;
      if (bankError) throw bankError;

      const bankOutflows: Expense[] = (bankTx || [])
        .filter(txn => {
          const t = (txn.transaction_type || '').toLowerCase();
          return !t.includes('credit') && !t.includes('deposit') && !t.includes('receive');
        })
        .map(txn => ({
          id: `bank-${txn.id}`,
          category: 'Bank Outflow',
          description: txn.description || 'Bank purchase/outflow',
          amount: Number(txn.amount || 0),
          expense_date: txn.transaction_date || '',
          reference_number: txn.reference_number,
        }));

      const combined = [...(expenses || []), ...bankOutflows];
      combined.sort((a, b) => new Date(b.expense_date || '').getTime() - new Date(a.expense_date || '').getTime());
      return combined;
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useProductionRuns() {
  return useQuery({
    queryKey: ['production_runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_runs')
        .select('id, production_cost, status, start_date, machine:machines(name)')
        .order('start_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ProductionRun[];
    },
  });
}

export function useCreditorTransactions() {
  return useQuery({
    queryKey: ['creditor_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creditor_transactions')
        .select('id, creditor_id, transaction_type, amount, reference_number, created_at, creditor:creditors(name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CreditorTransaction[];
    },
  });
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: ['financial_summary'],
    queryFn: async () => {
      // Use actual payments collected as revenue; if none, fall back to sales orders totals
      const [{ data: payments, error: paymentError }, { data: salesOrders, error: salesError }, { data: bankTx, error: bankError }, { data: expenses, error: expensesError }] = await Promise.all([
        supabase
          .from('payments')
          .select('amount'),
        supabase
          .from('sales_orders')
          .select('total_amount'),
        supabase
          .from('bank_transactions')
          .select('transaction_type, amount'),
        supabase
          .from('expenses')
          .select('amount'),
      ]);

      if (paymentError) throw paymentError;
      if (salesError) throw salesError;
      if (bankError) throw bankError;
      if (expensesError) throw expensesError;

      const paymentsTotal = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const salesTotal = salesOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const revenue = paymentsTotal > 0 ? paymentsTotal : salesTotal;

      // 1. Get General Expenses
      const generalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // 2. Get Paid Payroll
      const { data: payroll, error: payrollError } = await supabase
        .from('payroll')
        .select('net_salary')
        .eq('status', 'paid');

      if (payrollError) throw payrollError;
      const totalPayroll = payroll?.reduce((sum, p) => sum + Number(p.net_salary), 0) || 0;

      // 3. Get Production Costs
      const { data: production, error: productionError } = await supabase
        .from('production_runs')
        .select('production_cost');

      if (productionError) throw productionError;
      const totalProductionCost = production?.reduce((sum, p) => sum + Number(p.production_cost), 0) || 0;

      // Total Outflow
      const totalExpenses = generalExpenses + totalPayroll + totalProductionCost;

      // Get cash balance from bank accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('is_active', true);

      if (accountsError) throw accountsError;

      const cashBalance = accounts?.reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;

      // Get receivables (credit sales unpaid)
      const { data: receivables, error: receivablesError } = await supabase
        .from('customers')
        .select('credit_balance');

      if (receivablesError) throw receivablesError;

      const totalReceivables = receivables?.reduce((sum, c) => sum + Number(c.credit_balance), 0) || 0;

      // Get payables
      const { data: payables, error: payablesError } = await supabase
        .from('creditors')
        .select('outstanding_balance');

      if (payablesError) throw payablesError;

      const totalPayables = payables?.reduce((sum, c) => sum + Number(c.outstanding_balance), 0) || 0;

      return {
        revenue,
        expenses: totalExpenses,
        breakdown: {
          general: generalExpenses,
          payroll: totalPayroll,
          production: totalProductionCost,
        },
        grossProfit: revenue - totalProductionCost, // Revenue - COGS (roughly)
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
      const [{ data: expenses, error }, { data: bankTx, error: bankError }] = await Promise.all([
        supabase
          .from('expenses')
          .select('category, amount'),
        supabase
          .from('bank_transactions')
          .select('transaction_type, amount'),
      ]);

      if (error) throw error;
      if (bankError) throw bankError;

      const bankOutflows = (bankTx || [])
        .filter(txn => {
          const t = (txn.transaction_type || '').toLowerCase();
          return !t.includes('credit') && !t.includes('deposit') && !t.includes('receive');
        })
        .map(txn => ({
          category: 'Bank Outflow',
          amount: Number(txn.amount || 0),
        }));

      const allExpenses = [...(expenses || []), ...bankOutflows];

      // Group by category
      const grouped = allExpenses.reduce((acc, expense) => {
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

export function useRecordExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id'>) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expense])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses_by_category'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith('bank-')) {
        throw new Error('Bank-sourced outflows cannot be deleted directly. Please void the original bank transaction.');
      }

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses_by_category'] });
    },
  });
}
