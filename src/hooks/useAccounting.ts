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
  notes: string | null;
  created_at: string;
  creditor?: { name?: string | null };
}

export interface Payroll {
  id: string;
  net_salary: number;
  paid_at: string | null;
  status: string;
}

export function useLandedMarkup() {
  return useQuery({
    queryKey: ['landed_markup'],
    queryFn: async () => {
      return 0; // Freight is now dynamically allocated per PO batch in the database
    }
  });
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

      const [{ data: expenses }, { data: bankTx }] = await Promise.all([
        fetchAllPages(
          supabase
            .from('expenses')
            .select('*')
            .gte('expense_date', fromDate)
            .lte('expense_date', toDate)
            .order('expense_date', { ascending: false })
        ),
        fetchAllPages(
          supabase
            .from('bank_transactions')
            .select('id, transaction_type, amount, transaction_date, description, reference_number')
            .gte('transaction_date', fromDate)
            .lte('transaction_date', toDate)
            .order('transaction_date', { ascending: false })
        ),
      ]);

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

      const { data } = await fetchAllPages(
        supabase
          .from('payments')
          .select('*, sales_orders(customer_name)')
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
          .order('created_at', { ascending: false })
      );

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
        .select('id, creditor_id, transaction_type, amount, reference_number, notes, created_at, creditor:creditors(name)')
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
const fetchAllPages = async (queryBuilder: any) => {
  let allData: any[] = [];
  let from = 0;
  const step = 999;
  while (true) {
    const { data, error } = await queryBuilder.range(from, from + step);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length <= step) break;
    from += step + 1;
  }
  return { data: allData };
};

export function useFinancialSummary(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['financial_summary_v2', dateRange],
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
        { data: inventoryTransactions },
        { data: bankTx }, // Add bank transactions for complete outflow tracking
        { data: purchaseOrders },
        { data: salesOrderItems },
        { data: allTimeFreight },
        { data: allTimePurchaseItems },
        { data: creditorTx }
      ] = await Promise.all([
        fetchAllPages(supabase.from('payments').select('amount, created_at, payment_method, order_id').gte('created_at', fromDate).lte('created_at', toDate)),
        fetchAllPages(supabase.from('sales_orders').select('id, total_amount, created_at, status, payment_method').gte('created_at', fromDate).lte('created_at', toDate)),
        fetchAllPages(supabase.from('expenses').select('id, amount, category, description, is_manufacturing_cost, expense_date, reference_number').gte('expense_date', fromDate).lte('expense_date', toDate).order('expense_date', { ascending: false })),
        fetchAllPages(supabase.from('payroll').select('net_salary, status, paid_at, created_at, employee:employees(full_name)')),
        fetchAllPages(supabase.from('bank_accounts').select('current_balance').eq('is_active', true)),
        fetchAllPages(supabase.from('customers').select('credit_balance')),
        fetchAllPages(supabase.from('creditors').select('name, outstanding_balance')),
        fetchAllPages(supabase.from('machines').select('purchase_cost')),
        fetchAllPages(supabase.from('inventory').select('id, variant_id, quantity, variant:product_variants(cost_price)')),
        fetchAllPages(supabase.from('raw_materials').select('quantity_in_stock, unit_cost')),
        fetchAllPages(supabase.from('production_runs').select('production_cost, start_date').gte('start_date', fromDate).lte('start_date', toDate)),
        // Fetch ALL transactions to reconstruct history? Ideally we filter, but for "Opening Stock" we need `txn_date > fromDate`.
        // To get Closing Stock, we need `txn_date > toDate`.
        // Optimization: Fetch transactions ONLY if we need to rollback from "Current State".
        // Strategy: 
        // 1. Current Stock (Live) is known.
        // 2. To get Stock @ EndDate: Current - (Txns > EndDate)
        // 3. To get Stock @ StartDate: Current - (Txns > StartDate)
        fetchAllPages(supabase.from('inventory_transactions').select('variant_id, quantity_change, created_at').gt('created_at', fromDate)),
        fetchAllPages(supabase.from('bank_transactions').select('id, transaction_type, amount, transaction_date, description').gte('transaction_date', fromDate).lte('transaction_date', toDate)),
        fetchAllPages(supabase.from('purchase_orders').select('total_amount, status').in('status', ['completed', 'delivered', 'received']).gte('created_at', fromDate).lte('created_at', toDate)),
        fetchAllPages(supabase.from('sales_order_items').select('order_id, quantity, landed_cost_at_sale, product_variants(cost_price)').gte('created_at', fromDate).lte('created_at', toDate)),
        Promise.resolve({ data: [] }),
        Promise.resolve({ data: [] }),
        fetchAllPages(supabase.from('creditor_transactions').select('*').gte('created_at', fromDate).lte('created_at', toDate))
      ]);

      // --- Revenue ---
      // Accrual Revenue (Completed/Delivered Orders)
      const validOrders = salesOrders?.filter(o => 
        o.status === 'delivered' || o.status === 'completed' || o.status === 'approved' || o.status === 'in_transit' || o.status === 'ready_for_pickup' || o.status === 'dispatched'
      ) || [];
      const revenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

      // --- Order Pipeline ---
      const orderPipeline = {
        pending: salesOrders?.filter(o => o.status === 'pending').length || 0,
        in_progress: salesOrders?.filter(o => ['approved', 'dispatched', 'in_transit', 'ready_for_pickup'].includes(o.status)).length || 0,
        completed: salesOrders?.filter(o => ['delivered', 'completed'].includes(o.status)).length || 0,
        total_value_pending: salesOrders?.filter(o => o.status === 'pending').reduce((sum, o) => sum + Number(o.total_amount), 0) || 0,
        total_value_completed: revenue
      };

      // --- Explicit Period Credit Issued ---
      const periodCreditIssued = validOrders
        .filter(o => o.payment_method === 'credit')
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

      // --- Calculate Landed Cost Markup ---
      const landedMarkupPerItem = 0; // Freight is now dynamically allocated per PO batch in the database

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

        // Deep clone current stats to modify, preventing shared object mutation across multiple calls
        const historicalSnapshot = new Map<string, { qty: number, cost: number }>();
        for (const [k, v] of currentStats.entries()) {
          historicalSnapshot.set(k, { qty: v.qty, cost: v.cost });
        }

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

        // Calculate Value with Landed Cost (stat.cost is already the variant's landed cost from the PO batch)
        let totalValue = 0;
        for (const stat of historicalSnapshot.values()) {
          const effectiveCostPrice = stat.cost;
          totalValue += (stat.qty * effectiveCostPrice);
        }

        // Add Raw Materials
        const rawMatValue = rawMaterials?.reduce((sum, m) => sum + (m.quantity_in_stock * m.unit_cost), 0) || 0;

        return totalValue + rawMatValue;
      };

      const openingStock = calculateStockValueAt(fromDate);
      const closingStock = calculateStockValueAt(toDate);

      // --- Purchases & Expenses ---
      // Map bank outflows as expenses if not explicitly categorised
      const bankOutflows = (bankTx || [])
        .filter(txn => {
          const t = (txn.transaction_type || '').toLowerCase();
          return !t.includes('credit') && !t.includes('deposit') && !t.includes('receive') && !t.includes('inflow') && !t.includes('payroll');
        })
        .map(txn => ({
          id: `bank-${txn.id || Math.random().toString(36).substr(2, 9)}`,
          description: txn.description || 'Bank Outflow',
          category: 'Bank Outflow',
          amount: Number(txn.amount || 0),
          expense_date: txn.transaction_date,
          is_manufacturing_cost: false
        }));

      // Combine direct expenses and bank outflows
      const allExpenses = [...(expenses || []), ...bankOutflows];
      
      const explicitInventoryExpenses = allExpenses.filter(e =>
        e.category === 'Inventory Purchase' ||
        e.category === 'Stock Purchase' ||
        e.category === 'Raw Materials' ||
        e.category === 'Inventory'
      ).reduce((sum, e) => sum + Number(e.amount), 0);
      
      const actualPurchaseOrders = purchaseOrders?.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) || 0;

      const inventoryPurchases = explicitInventoryExpenses + actualPurchaseOrders;

      // --- COGS ---
      const validOrderIds = new Set(validOrders.map(o => o.id));
      let pureSupplierCOGS = 0;
      let totalLandedMarkupCOGS = 0;

      const totalCOGS = salesOrderItems?.filter(item => validOrderIds.has(item.order_id)).reduce((sum, item) => {
        // Handle potentially array response from joined table
        const costPrice = Array.isArray(item.product_variants) 
          ? Number(item.product_variants[0]?.cost_price || 0) 
          : Number((item.product_variants as any)?.cost_price || 0);
        
        const landedCost = Number(item.landed_cost_at_sale || 0);
        const effectiveCostPrice = landedCost > 0 ? landedCost : costPrice;

        pureSupplierCOGS += item.quantity * costPrice;
        totalLandedMarkupCOGS += item.quantity * (effectiveCostPrice - costPrice);

        return sum + (item.quantity * effectiveCostPrice);
      }, 0) || 0;

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
        e.category !== 'Inventory' &&
        e.category !== 'Shipping Freight Charges' &&
        e.category !== 'Shipping Handling Costs' &&
        e.category !== 'Custom Taxes'
      );

      const totalOpex = operatingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      // Payroll (Paid within range)
      const periodPayroll = payroll?.filter(p => {
        const pDate = p.paid_at ? new Date(p.paid_at) : null;
        return p.status === 'paid' && pDate && pDate >= new Date(fromDate) && pDate <= new Date(toDate);
      }).reduce((sum, p) => sum + Number(p.net_salary), 0) || 0;

      const totalExpenses = totalOpex + periodPayroll;

      // --- Manufacturing Spend Breakdown ---
      // Materials: raw material value consumed (current stock value is a proxy for total materials)
      const rawMaterialsValue = rawMaterials?.reduce((sum, m) => sum + (m.quantity_in_stock * m.unit_cost), 0) || 0;
      // Equipment: machines purchase cost (fixed assets allocated to manufacturing)
      const equipmentCost = machines?.reduce((sum, m) => sum + Number(m.purchase_cost), 0) || 0;
      // Production: total production run costs in period
      const productionRunCost = productionBatches?.reduce((sum, b) => sum + Number(b.production_cost), 0) || 0;
      // Manufacturing expenses from expense table
      const mfgExpensesTotal = manufacturingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      // Total manufacturing spend = production runs + manufacturing expenses
      const totalManufacturingSpend = productionRunCost + mfgExpensesTotal;

      // --- Timeseries for Charts ---
      const trendMap = new Map<string, { date: string, revenue: number, expenses: number, payroll: number }>();
      
      const addToTrend = (dateStr: string, key: 'revenue' | 'expenses' | 'payroll', amount: number) => {
        if (!dateStr) return;
        const dateKey = dateStr.split('T')[0]; // Format: YYYY-MM-DD
        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, { date: dateKey, revenue: 0, expenses: 0, payroll: 0 });
        }
        const data = trendMap.get(dateKey)!;
        data[key] += amount;
      };

      // Add actual cash-in (Payments) as cash-basis revenue trend, or use accrual
      // Let's use accrual valid orders for revenue trend
      validOrders.forEach(o => addToTrend(o.created_at, 'revenue', Number(o.total_amount)));
      operatingExpenses.forEach(e => addToTrend(e.expense_date, 'expenses', Number(e.amount)));
      manufacturingExpenses.forEach(e => addToTrend(e.expense_date, 'expenses', Number(e.amount)));
      
      payroll?.forEach(p => {
        if (p.status === 'paid' && p.paid_at) {
          addToTrend(p.paid_at, 'payroll', Number(p.net_salary));
        }
      });

      const trends = Array.from(trendMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(t => ({
           ...t,
           date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }));

      // --- Owner's Equity (Assets - Liabilities) ---
      // Note: This is usually a "Current State" metric, not historical.
      // We will return the CURRENT Equity.

      // Assets
      const cashBalance = accounts?.reduce((sum, a) => sum + Number(a.current_balance), 0) || 0;
      const totalReceivables = receivables?.reduce((sum, c) => sum + Number(c.credit_balance), 0) || 0;
      const currentStockValue = calculateStockValueAt(new Date().toISOString()); // Current
      const fixedAssets = equipmentCost;

      const totalAssets = cashBalance + totalReceivables + currentStockValue + fixedAssets;

      // Liabilities (Take absolute value of payables since debt is sometimes stored as negative)
      const totalPayables = payables?.reduce((sum, c) => sum + Math.abs(Number(c.outstanding_balance)), 0) || 0;
      
      // Filter pending payroll to only include payroll generated within the selected period
      const pendingPayrollList = payroll?.filter(p => {
        if (p.status !== 'pending') return false;
        if (!p.created_at) return true;
        const cd = new Date(p.created_at);
        return cd >= new Date(fromDate) && cd <= new Date(toDate);
      }) || [];
      
      const pendingPayroll = pendingPayrollList.reduce((sum, p) => sum + Number(p.net_salary), 0);

      const totalLiabilities = totalPayables + pendingPayroll;

      const grossProfit = revenue - totalCOGS;
      const netProfit = grossProfit - totalExpenses;

      // --- True Cash Collected Calculation with Duplicate Capping ---
      const trueCashPayments = payments?.filter(p => p.payment_method?.toLowerCase() !== 'credit') || [];
      const orderMap = new Map<string, { total: number, paid: number, paidByMethod: Record<string, number> }>();
      
      salesOrders?.forEach(o => {
        orderMap.set(o.id, { total: Number(o.total_amount), paid: 0, paidByMethod: {} });
      });

      let cappedCashCollected = 0;
      const paymentBreakdown: Record<string, number> = {};
      
      const normalizeMethod = (m: string | null) => {
        const lower = (m || 'other').toLowerCase();
        if (lower.includes('mpesa') || lower.includes('m-pesa')) return 'mpesa';
        if (lower.includes('cash')) return 'cash';
        if (lower.includes('bank') || lower.includes('transfer')) return 'bank';
        return 'other';
      };

      trueCashPayments.forEach(p => {
        const amt = Number(p.amount);
        const method = normalizeMethod(p.payment_method);

        if (!p.order_id) {
          cappedCashCollected += amt; // Pre-payments or wallet top-ups
          paymentBreakdown[method] = (paymentBreakdown[method] || 0) + amt;
        } else {
          const order = orderMap.get(p.order_id);
          if (order) {
            order.paid += amt;
            order.paidByMethod[method] = (order.paidByMethod[method] || 0) + amt;
          } else {
            cappedCashCollected += amt; // Orphaned payments
            paymentBreakdown[method] = (paymentBreakdown[method] || 0) + amt;
          }
        }
      });

      for (const order of orderMap.values()) {
        const cappedTotal = Math.min(order.paid, order.total); // Cap duplicates
        cappedCashCollected += cappedTotal;

        // Distribute capped amount proportionally across methods
        if (order.paid > 0) {
          const ratio = cappedTotal / order.paid;
          for (const [method, amt] of Object.entries(order.paidByMethod)) {
            paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (amt * ratio);
          }
        }
      }

      // Add legacy sales orders (those delivered/completed with payment_method but no payments record)
      // This ensures both cappedCashCollected and paymentBreakdown stay perfectly synchronized
      const ordersWithPayments = new Set(payments?.map(p => p.order_id).filter(Boolean));
      validOrders.forEach(o => {
        if (!ordersWithPayments.has(o.id) && o.payment_method && o.payment_method !== 'credit') {
          const method = normalizeMethod(o.payment_method);
          const amt = Number(o.total_amount);
          paymentBreakdown[method] = (paymentBreakdown[method] || 0) + amt;
          cappedCashCollected += amt;
        }
      });

      return {
        revenue,
        expenses: totalExpenses,
        grossProfit,
        netProfit, // Net Profit = GP - Opex
        grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
        operatingRatio: revenue > 0 ? (totalExpenses / revenue) * 100 : 0,

        breakdown: {
          general: totalOpex,
          payroll: periodPayroll,
          cogs: totalCOGS,
          pureSupplierCOGS,
          totalLandedMarkupCOGS,

          // Manufacturing spend breakdown
          manufacturing_spend: totalManufacturingSpend,
          manufacturing_details: {
            materials: rawMaterialsValue,
            equipment: equipmentCost,
            production: productionRunCost,
          },

          // Inventory accounting breakdown
          opening_stock: openingStock,
          purchases: inventoryPurchases,
          closing_stock: closingStock,
        },

        // Dashboard specific aggregations
        orderPipeline,
        trends,
        cashCollected: cappedCashCollected,
        periodCreditIssued,
        paymentBreakdown,

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
          creditorsList: payables?.filter(c => Math.abs(Number(c.outstanding_balance)) >= 0.01) || [],
          payrollList: pendingPayrollList,
          total: totalLiabilities
        },
        equity: totalAssets - totalLiabilities,

        // Raw Lists for UI (Avoids redundant parallel queries)
        expensesList: expenses || [],
        bankTransactionsList: bankTx || [],
        bankAccountsList: accounts || [],
        paymentsList: payments || [],
        productionRunsList: productionBatches || [],
        payrollEntriesList: payroll || [],
        creditorTransactionsList: creditorTx || [],
        expenseCategories: (() => {
          const bOutflows = (bankTx || [])
            .filter(txn => {
              const t = (txn.transaction_type || '').toLowerCase();
              return !t.includes('credit') && !t.includes('deposit') && !t.includes('receive') && !t.includes('inflow') && !t.includes('payroll');
            })
            .map(txn => ({
              category: 'Bank Outflow',
              amount: Number(txn.amount || 0),
            }));

          const allExp = [...(expenses || []), ...bOutflows];
          const grouped = allExp.reduce((acc, expense) => {
            const cat = expense.category || 'Other';
            if (!acc[cat]) acc[cat] = 0;
            acc[cat] += Number(expense.amount || 0);
            return acc;
          }, {} as Record<string, number>);

          const total = Object.values(grouped).reduce((sum, v) => sum + v, 0);

          return Object.entries(grouped).map(([name, amount]) => ({
            name,
            amount,
            percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
          }));
        })()
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

      const [{ data: expenses }, { data: bankTx }] = await Promise.all([
        fetchAllPages(
          supabase
            .from('expenses')
            .select('category, amount')
            .gte('expense_date', fromDate)
            .lte('expense_date', toDate)
        ),
        fetchAllPages(
          supabase
            .from('bank_transactions')
            .select('transaction_type, amount')
            .gte('transaction_date', fromDate)
            .lte('transaction_date', toDate)
        ),
      ]);

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
