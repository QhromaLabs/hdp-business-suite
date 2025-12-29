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
    queryKey: ['production_batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_batches')
        .select('id, production_cost, status, start_date, recipe:recipes(name)')
        .order('start_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      // Map to interface, handling the join shape
      return data.map((b: any) => ({
        id: b.id,
        production_cost: b.production_cost,
        status: b.status,
        start_date: b.start_date,
        machine: { name: b.recipe?.name || 'Batch' } // reuse machine field for recipe name
      })) as ProductionRun[];
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
      // Execute parallel queries for all financial data points
      const [
        { data: payments },
        { data: salesOrders },
        { data: expenses },
        { data: payroll },
        { data: accounts },
        { data: receivables },
        { data: payables },
        { data: machines },
        { data: inventory },
        { data: rawMaterials },
        { data: productionBatches }
      ] = await Promise.all([
        supabase.from('payments').select('amount'),
        supabase.from('sales_orders').select('total_amount'),
        supabase.from('expenses').select('amount, category, is_manufacturing_cost'),
        supabase.from('payroll').select('net_salary, status'),
        supabase.from('bank_accounts').select('current_balance').eq('is_active', true),
        supabase.from('customers').select('credit_balance'),
        supabase.from('creditors').select('outstanding_balance'),
        supabase.from('machines').select('purchase_cost'),
        supabase.from('inventory').select('quantity, variant:product_variants(cost_price)'),
        supabase.from('raw_materials').select('quantity_in_stock, unit_cost'),
        supabase.from('production_batches').select('production_cost')
      ]);

      // --- Revenue & Expenses ---
      const paymentsTotal = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const salesTotal = salesOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const revenue = paymentsTotal > 0 ? paymentsTotal : salesTotal; // Prefer collected cash

      // Filter Expenses
      const allExpenses = expenses || [];
      const manufacturingExpenses = allExpenses.filter(e =>
        e.category === 'Raw Materials' ||
        e.category === 'Equipment' ||
        e.is_manufacturing_cost
      );
      const operatingExpenses = allExpenses.filter(e => !manufacturingExpenses.includes(e));

      const totalOpex = operatingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Add Paid Payroll to Opex
      const paidPayroll = payroll?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.net_salary), 0) || 0;
      const totalExpenses = totalOpex + paidPayroll;

      // --- COGS (Approximate from Production Costs or Sales) ---
      // For now, let's use Production Costs as a proxy for "Cost of Goods Manufactured"
      const totalProductionCost = productionBatches?.reduce((sum, b) => sum + Number(b.production_cost || 0), 0) || 0;

      // Calculate COGS based on Sales (Standard Inventory Method)
      // Note: This requires sales_items query which we skipped to save connections, 
      // but we can infer or fetch if needed. For now, we'll use a simplified margin or 0 if strictly cash basis.
      // Let's re-fetch sales items for accurate Gross Profit if possible, or stick to Cash flow.
      // RE-ADDING Sales Items fetch for COGS:
      const { data: salesItems } = await supabase
        .from('sales_order_items')
        .select('quantity, variant:product_variants(cost_price)');

      const totalCOGS = salesItems?.reduce((sum, item: any) => {
        const cost = item.variant?.cost_price || 0;
        return sum + (cost * item.quantity);
      }, 0) || 0;


      // --- Assets ---
      const cashBalance = accounts?.reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;
      const totalReceivables = receivables?.reduce((sum, c) => sum + Number(c.credit_balance), 0) || 0;

      const rawMaterialValue = rawMaterials?.reduce((sum, m) => sum + (m.quantity_in_stock * m.unit_cost), 0) || 0;
      const finishedGoodsValue = inventory?.reduce((sum, i: any) => sum + (i.quantity * (i.variant?.cost_price || 0)), 0) || 0;
      const totalStockValue = rawMaterialValue + finishedGoodsValue;

      const fixedAssets = machines?.reduce((sum, m) => sum + Number(m.purchase_cost), 0) || 0;

      const totalAssets = cashBalance + totalReceivables + totalStockValue + fixedAssets;

      // --- Liabilities ---
      const totalPayables = payables?.reduce((sum, c) => sum + Number(c.outstanding_balance), 0) || 0;
      const pendingPayroll = payroll?.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.net_salary), 0) || 0;

      const totalLiabilities = totalPayables + pendingPayroll;

      // 1. Equipment: Sum of purchase_cost from machines table (Source of Truth for Assets)
      const accumulatedEquipmentCost = machines?.reduce((sum, m) => sum + Number(m.purchase_cost || 0), 0) || 0;

      // 2. Production Runs: Sum of production_cost from production_batches (Source of Truth for Output)
      const accumulatedProductionCost = productionBatches?.reduce((sum, b) => sum + Number(b.production_cost || 0), 0) || 0;

      // 3. Raw Materials: Use Current Stock Value from raw_materials table
      // This matches the "Raw Materials" inventory card on the Manufacturing page, representing active material assets.
      const accumulatedMaterialCost = rawMaterials?.reduce((sum, m) => sum + ((m.quantity_in_stock || 0) * (m.unit_cost || 0)), 0) || 0;

      const totalManufacturingSpend = accumulatedEquipmentCost + accumulatedProductionCost + accumulatedMaterialCost;

      return {
        revenue,
        expenses: totalExpenses,
        grossProfit: revenue - totalCOGS,
        netProfit: revenue - totalCOGS - totalExpenses,
        breakdown: {
          general: totalOpex,
          payroll: paidPayroll,
          manufacturing_spend: totalManufacturingSpend,
          cogs: totalCOGS,

          // New granular fields for the UI
          manufacturing_details: {
            equipment: accumulatedEquipmentCost,
            production: accumulatedProductionCost,
            materials: accumulatedMaterialCost
          }
        },

        // Balance Sheet Data
        assets: {
          cash: cashBalance,
          receivables: totalReceivables,
          stock: totalStockValue,
          raw_materials: rawMaterialValue,
          finished_goods: finishedGoodsValue,
          fixed_assets: fixedAssets,
          total: totalAssets
        },
        liabilities: {
          payables: totalPayables,
          payroll: pendingPayroll,
          total: totalLiabilities
        },
        equity: totalAssets - totalLiabilities
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
