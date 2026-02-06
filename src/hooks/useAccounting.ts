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
        .limit(50); // Increased limit slightly for better overview

      if (error) throw error;
      return data as BankTransaction[];
    },
  });
}

export function useExpenses(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['expenses', dateRange],
    queryFn: async () => {
      const fromDate = dateRange?.from ? new Date(dateRange.from).toISOString() : '2000-01-01';
      const toDate = dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString();

      const [{ data: expenses, error }, { data: bankTx, error: bankError }] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .gte('expense_date', fromDate)
          .lte('expense_date', toDate)
          .order('expense_date', { ascending: false }),
        supabase
          .from('bank_transactions')
          .select('id, transaction_type, amount, transaction_date, description, reference_number')
          .gte('transaction_date', fromDate)
          .lte('transaction_date', toDate)
          .order('transaction_date', { ascending: false }),
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

export function usePayments(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['payments', dateRange],
    queryFn: async () => {
      const fromDate = dateRange?.from ? new Date(dateRange.from).toISOString() : '2000-01-01';
      const toDate = dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString();

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useProductionRuns(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['production_batches', dateRange],
    queryFn: async () => {
      const fromDate = dateRange?.from ? new Date(dateRange.from).toISOString() : '2000-01-01';
      const toDate = dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString();

      const { data, error } = await supabase
        .from('production_runs')
        .select('id, production_cost, status, start_date, recipe:recipes(name)')
        .gte('start_date', fromDate)
        .lte('start_date', toDate)
        .order('start_date', { ascending: false });

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

export function useCreditorTransactions(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['creditor_transactions', dateRange],
    queryFn: async () => {
      const fromDate = dateRange?.from ? new Date(dateRange.from).toISOString() : '2000-01-01';
      const toDate = dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString();

      const { data, error } = await supabase
        .from('creditor_transactions')
        .select('id, creditor_id, transaction_type, amount, reference_number, created_at, creditor:creditors(name)')
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CreditorTransaction[];
    },
  });
}

export interface DateRange {
  from: Date;
  to: Date;
}

export function useFinancialSummary(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['financial_summary', dateRange],
    queryFn: async () => {
      // Default to "All Time" (or realistic bounds) if no range provided
      // For "All Time" start date, we use a very old date.
      const fromDate = dateRange?.from ? new Date(dateRange.from).toISOString() : '2000-01-01';
      // For end date, we default to NOW if not provided.
      const toDate = dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString();

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
        { data: productionBatches },
        { data: inventoryTransactions } // Needed for historical stock reconstruction
      ] = await Promise.all([
        supabase.from('payments').select('amount, created_at').gte('created_at', fromDate).lte('created_at', toDate),
        supabase.from('sales_orders').select('total_amount, created_at').gte('created_at', fromDate).lte('created_at', toDate),
        supabase.from('expenses').select('amount, category, is_manufacturing_cost, expense_date').gte('expense_date', fromDate).lte('expense_date', toDate),
        supabase.from('payroll').select('net_salary, status, paid_at'), // Payroll is tricky with dates, using paid_at for cash basis
        supabase.from('bank_accounts').select('current_balance').eq('is_active', true),
        supabase.from('customers').select('credit_balance'),
        supabase.from('creditors').select('outstanding_balance'),
        supabase.from('machines').select('purchase_cost'),
        supabase.from('inventory').select('id, variant_id, quantity, variant:product_variants(cost_price)'),
        supabase.from('raw_materials').select('quantity_in_stock, unit_cost'),
        supabase.from('production_runs').select('production_cost, start_date').gte('start_date', fromDate).lte('start_date', toDate),
        // Fetch ALL transactions to reconstruct history? Ideally we filter, but for "Opening Stock" we need `txn_date > fromDate`.
        // To get Closing Stock, we need `txn_date > toDate`.
        // Optimization: Fetch transactions ONLY if we need to rollback from "Current State".
        // Strategy: 
        // 1. Current Stock (Live) is known.
        // 2. To get Stock @ EndDate: Current - (Txns > EndDate)
        // 3. To get Stock @ StartDate: Current - (Txns > StartDate)
        supabase.from('inventory_transactions').select('variant_id, quantity_change, created_at').gt('created_at', fromDate)
      ]);

      // --- Revenue ---
      // User can toggle between Cash Basis (payments) or Accrual (salesOrders). 
      // For standard accounting, we often default to Accrual for "Profitability" but Cash for "Cash Flow".
      // Let's use Accrual (Sales Orders) for Gross Profit as per standard.
      const salesTotal = salesOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const revenue = salesTotal;

      // --- Helper: Stock Value Calculator ---
      // Map Current Stock state
      const currentStats = new Map<string, { qty: number, cost: number }>();

      // Load Finished Goods
      inventory?.forEach((item: any) => {
        if (item.variant_id) {
          currentStats.set(item.variant_id, {
            qty: item.quantity,
            cost: Number(item.variant?.cost_price || 0)
          });
        }
      });

      // Helper to Calculate Stock Value at a specific Cutoff Date
      const calculateStockValueAt = (cutoffDateStr: string) => {
        const cutoff = new Date(cutoffDateStr).getTime();

        // Clone current stats to modify
        const historicalSnapshot = new Map(currentStats);

        // We want state AT cutoff. 
        // Current State = State @ Cutoff + (Changes > Cutoff)
        // State @ Cutoff = Current State - (Changes > Cutoff)

        // Filter transactions that happened AFTER the cutoff
        const relevantTxns = inventoryTransactions?.filter(t => new Date(t.created_at).getTime() > cutoff) || [];

        relevantTxns.forEach(txn => {
          const stat = historicalSnapshot.get(txn.variant_id);
          if (stat) {
            // REVERSE the transaction. If qty increased (+5), we subtract 5 to go back.
            stat.qty -= txn.quantity_change;
            historicalSnapshot.set(txn.variant_id, stat);
          }
        });

        // Calculate Value
        let totalValue = 0;
        for (const stat of historicalSnapshot.values()) {
          totalValue += (stat.qty * stat.cost);
        }

        // Add Raw Materials (Assuming they are constant for now or need their own transaction table)
        // For now, we take current raw material value as proxy if no history available
        const rawMatValue = rawMaterials?.reduce((sum, m) => sum + (m.quantity_in_stock * m.unit_cost), 0) || 0;

        return totalValue + rawMatValue;
      };

      const openingStock = calculateStockValueAt(fromDate);
      const closingStock = calculateStockValueAt(toDate);

      // --- Purchases ---
      // Purchases during the period
      const allExpenses = expenses || [];
      const inventoryPurchases = allExpenses.filter(e =>
        e.category === 'Inventory Purchase' ||
        e.category === 'Stock Purchase' ||
        e.category === 'Raw Materials' ||
        e.category === 'Inventory'
      ).reduce((sum, e) => sum + Number(e.amount), 0);

      // --- COGS ---
      // Formula: Opening Stock + Purchases - Closing Stock
      const totalCOGS = (openingStock + inventoryPurchases) - closingStock;

      // --- Operating Expenses (OPEX) ---
      // Exclude inventory purchases
      const manufacturingExpenses = allExpenses.filter(e =>
        e.category === 'Equipment' ||
        (e.is_manufacturing_cost &&
          e.category !== 'Inventory Purchase' &&
          e.category !== 'Stock Purchase' &&
          e.category !== 'Raw Materials' &&
          e.category !== 'Inventory')
      );

      const operatingExpenses = allExpenses.filter(e =>
        !manufacturingExpenses.includes(e) &&
        e.category !== 'Inventory Purchase' &&
        e.category !== 'Stock Purchase' &&
        e.category !== 'Raw Materials' &&
        e.category !== 'Inventory'
      );

      const totalOpex = operatingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Payroll (Paid within range)
      const periodPayroll = payroll?.filter(p => {
        const pDate = p.paid_at ? new Date(p.paid_at) : null;
        return p.status === 'paid' && pDate && pDate >= new Date(fromDate) && pDate <= new Date(toDate);
      }).reduce((sum, p) => sum + Number(p.net_salary), 0) || 0;

      const totalExpenses = totalOpex + periodPayroll;

      // --- Owner's Equity (Assets - Liabilities) ---
      // Note: This is usually a "Current State" metric, not historical.
      // We will return the CURRENT Equity.

      // Assets
      const cashBalance = accounts?.reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;
      const totalReceivables = receivables?.reduce((sum, c) => sum + Number(c.credit_balance), 0) || 0;
      const currentStockValue = calculateStockValueAt(new Date().toISOString()); // Current
      const fixedAssets = machines?.reduce((sum, m) => sum + Number(m.purchase_cost), 0) || 0;

      const totalAssets = cashBalance + totalReceivables + currentStockValue + fixedAssets;

      // Liabilities
      const totalPayables = payables?.reduce((sum, c) => sum + Number(c.outstanding_balance), 0) || 0;
      const pendingPayroll = payroll?.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.net_salary), 0) || 0;

      const totalLiabilities = totalPayables + pendingPayroll;

      return {
        revenue,
        expenses: totalExpenses,
        grossProfit: revenue - totalCOGS,
        netProfit: revenue - totalCOGS - totalExpenses, // Net Profit = GP - Opex

        breakdown: {
          general: totalOpex,
          payroll: periodPayroll,
          cogs: totalCOGS,

          // Inventory accounting breakdown
          opening_stock: openingStock,
          purchases: inventoryPurchases,
          closing_stock: closingStock,
        },

        // Balance Sheet Data (Snapshot)
        assets: {
          cash: cashBalance,
          receivables: totalReceivables,
          stock: currentStockValue,
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

export function useExpensesByCategory(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['expenses_by_category', dateRange],
    queryFn: async () => {
      const fromDate = dateRange?.from ? new Date(dateRange.from).toISOString() : '2000-01-01';
      const toDate = dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString();

      const [{ data: expenses, error }, { data: bankTx, error: bankError }] = await Promise.all([
        supabase
          .from('expenses')
          .select('category, amount')
          .gte('expense_date', fromDate)
          .lte('expense_date', toDate),
        supabase
          .from('bank_transactions')
          .select('transaction_type, amount')
          .gte('transaction_date', fromDate)
          .lte('transaction_date', toDate),
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
