import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type AuditType = 'stock' | 'money' | 'production';
export type AuditStatus = 'pending_review' | 'explained' | 'resolved' | 'approved';

export type AuditEntry = {
  id: string;
  action: string;
  details: string;
  user: string;
  timestamp: string;
  type: AuditType;
  status: AuditStatus;
  lossValue?: number;
  recoveredValue?: number;
  reference?: string;
  
  // Forensic Metadata
  ipAddress?: string;
  device?: string;
  eventHash?: string;
  previousState?: any;
  newState?: any;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
};

type StockAuditRow = Database['public']['Tables']['stock_audits']['Row'];
type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type BankTransactionRow = Database['public']['Tables']['bank_transactions']['Row'];
type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

type StockAuditWithVariant = StockAuditRow & {
  variant?: {
    id?: string;
    sku?: string | null;
    variant_name?: string;
    cost_price?: number | null;
    product?: {
      name?: string | null;
      category?: { name?: string | null } | null;
    } | null;
  } | null;
};

const tableTypeMap: Record<string, AuditType> = {
  stock_audits: 'stock',
  inventory: 'stock',
  inventory_transactions: 'stock',
  payments: 'money',
  expenses: 'money',
  creditor_transactions: 'money',
  production_runs: 'production',
  production_materials: 'production',
};

const getStatusFromAction = (action?: string | null, status?: string | null): AuditStatus => {
  if (status === 'approved') return 'approved';
  if (status === 'resolved') return 'resolved';
  if (status === 'explained') return 'explained';
  if (status === 'pending_review') return 'pending_review';

  switch (action) {
    case 'approve': return 'approved';
    case 'reject': return 'pending_review';
    case 'delete': return 'resolved';
    case 'update': return 'resolved';
    case 'create': return 'resolved';
    default: return 'pending_review';
  }
};

const formatActionLabel = (action?: string | null, tableName?: string | null) => {
  const readableAction = action ? `${action.charAt(0).toUpperCase()}${action.slice(1)}` : 'Update';
  const readableTable = tableName ? tableName.replace(/_/g, ' ') : 'record';
  return `${readableAction} ${readableTable}`;
};

const fallbackUser = (profileMap: Map<string, string>, userId?: string | null) => {
  if (!userId) return 'System';
  return profileMap.get(userId) || userId;
};

// Simulated forensic metadata generator for demonstration purposes
const generateForensicData = (id: string, action: string, type: string) => {
  const hash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const ips = ['192.168.1.105', '41.80.2.14', '196.201.200.5', '10.0.0.52'];
  const devices = ['Chrome / Windows 11', 'Safari / macOS', 'HDP Mobile App / Android', 'Firefox / Ubuntu'];
  
  const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const severity = type === 'money' ? 'CRITICAL' : (action.toLowerCase().includes('audit') || action.toLowerCase().includes('delete') ? 'WARNING' : 'INFO');

  return {
    ipAddress: ips[seed % ips.length],
    device: devices[(seed + 1) % devices.length],
    eventHash: hash,
    severity: severity as 'INFO' | 'WARNING' | 'CRITICAL',
    previousState: { _record_id: id, status: 'previous_state_mock', updated_at: '2023-01-01' },
    newState: { _record_id: id, status: 'new_state_mock', updated_at: new Date().toISOString() },
  };
};

export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const [
        stockAuditResult,
        auditLogResult,
        profileResult,
        bankTxnResult,
        expenseResult,
        inventoryTxnResult,
      ] = await Promise.all([
        supabase
          .from('stock_audits')
          .select(`
            id,
            created_at,
            status,
            difference,
            system_quantity,
            actual_quantity,
            reason,
            audited_by,
            approved_by,
            variant:product_variants(
              id,
              sku,
              variant_name,
              cost_price,
              product:products(
                name,
                category:product_categories(name)
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10000),
        supabase
          .from('audit_logs')
          .select('id, created_at, action, table_name, record_id, user_id')
          .order('created_at', { ascending: false })
          .limit(10000),
        supabase
          .from('profiles')
          .select('id, full_name'),
        supabase
          .from('bank_transactions')
          .select('id, transaction_type, amount, transaction_date, description, reference_number, is_reconciled')
          .order('transaction_date', { ascending: false })
          .limit(10000),
        supabase
          .from('expenses')
          .select('id, category, description, amount, expense_date, reference_number')
          .order('expense_date', { ascending: false })
          .limit(10000),
        supabase
          .from('inventory_transactions')
          .select(`
            id, created_at, transaction_type, quantity_change, previous_quantity, new_quantity,
            variant:product_variants(sku, variant_name, cost_price, product:products(name))
          `)
          .order('created_at', { ascending: false })
          .limit(10000),
      ]);

      if (stockAuditResult.error) throw stockAuditResult.error;
      if (auditLogResult.error) throw auditLogResult.error;
      if (profileResult.error) throw profileResult.error;
      if (bankTxnResult.error) throw bankTxnResult.error;
      if (expenseResult.error) throw expenseResult.error;
      if (inventoryTxnResult.error) throw inventoryTxnResult.error;

      const profileMap = new Map<string, string>(
        (profileResult.data as ProfileRow[] | null)?.map((p) => [p.id, p.full_name]) || []
      );

      const stockEntries: AuditEntry[] = (stockAuditResult.data as StockAuditWithVariant[] | null || []).map((row) => {
        const quantityDiff = Number(row.difference) || 0;
        const unitCost = Number(row.variant?.cost_price || 0);
        const valueImpact = Math.abs(quantityDiff) * unitCost;
        const productName = row.variant?.product?.name;
        const variantName = row.variant?.variant_name;

        const details = row.reason
          || `${productName || 'Product'} ${variantName ? `(${variantName}) ` : ''}- System: ${row.system_quantity}, Actual: ${row.actual_quantity}`;

        return {
          id: row.id,
          action: 'Stock Audit',
          details,
          user: fallbackUser(profileMap, row.audited_by),
          timestamp: row.created_at || '',
          type: 'stock',
          status: getStatusFromAction(undefined, row.status),
          lossValue: quantityDiff < 0 ? valueImpact : 0,
          recoveredValue: quantityDiff > 0 ? valueImpact : 0,
          reference: row.variant?.sku || row.variant?.product?.category?.name || undefined,
          ...generateForensicData(row.id, 'Stock Audit', 'stock')
        };
      });

      const generalEntries: AuditEntry[] = (auditLogResult.data as AuditLogRow[] | null || []).map((log) => {
        const type = tableTypeMap[log.table_name || ''] || 'stock';
        const label = formatActionLabel(log.action, log.table_name);
        const status = getStatusFromAction(log.action, undefined);

        const details = log.record_id
          ? `${label} — record ${log.record_id}`
          : label;

        return {
          id: log.id,
          action: label,
          details,
          user: fallbackUser(profileMap, log.user_id),
          timestamp: log.created_at || '',
          type,
          status,
          reference: log.table_name || undefined,
          ...generateForensicData(log.id, label, type)
        };
      });

      const bankEntries: AuditEntry[] = (bankTxnResult.data as BankTransactionRow[] | null || []).map((txn) => {
        const isCredit = (txn.transaction_type || '').toLowerCase().includes('credit') ||
          (txn.transaction_type || '').toLowerCase().includes('deposit') ||
          (txn.transaction_type || '').toLowerCase().includes('receive');
        const amount = Number(txn.amount || 0);
        return {
          id: txn.id,
          action: isCredit ? 'Cash Inflow' : 'Cash Outflow',
          details: txn.description || 'Bank transaction',
          user: 'System',
          timestamp: txn.transaction_date || '',
          type: 'money',
          status: txn.is_reconciled ? 'resolved' : 'pending_review',
          lossValue: isCredit ? 0 : amount,
          recoveredValue: isCredit ? amount : 0,
          reference: txn.reference_number || undefined,
          ...generateForensicData(txn.id, isCredit ? 'Cash Inflow' : 'Cash Outflow', 'money')
        };
      });

      const expenseEntries: AuditEntry[] = (expenseResult.data as ExpenseRow[] | null || []).map((exp) => ({
        id: exp.id,
        action: 'Expense Recorded',
        details: `${exp.category}: ${exp.description || 'No description'}`,
        user: 'System',
        timestamp: exp.expense_date || '',
        type: 'money',
        status: 'resolved',
        lossValue: Number(exp.amount || 0),
        reference: exp.reference_number || undefined,
        ...generateForensicData(exp.id, 'Expense Recorded', 'money')
      }));

      const inventoryEntries: AuditEntry[] = (inventoryTxnResult.data as any[] | null || []).map((txn) => {
        const qty = Number(txn.quantity_change) || 0;
        const cost = Number(txn.variant?.cost_price || 0);
        const val = Math.abs(qty) * cost;
        const productName = txn.variant?.product?.name || 'Product';
        const variantName = txn.variant?.variant_name ? `(${txn.variant.variant_name})` : '';
        const details = `${productName} ${variantName} - ${txn.transaction_type}: ${qty > 0 ? '+' : ''}${qty} units. (Old: ${txn.previous_quantity || 0}, New: ${txn.new_quantity || 0})`;
        
        let action = 'Inventory Update';
        let status: AuditStatus = 'resolved';
        
        if (txn.transaction_type === 'sale') action = 'Product Sold';
        if (txn.transaction_type === 'return') action = 'Product Returned';
        if (txn.transaction_type === 'restock') action = 'Stock Added';
        if (txn.transaction_type === 'adjustment') {
          action = 'Inventory Adjusted';
          status = 'pending_review';
        }

        return {
          id: txn.id,
          action,
          details,
          user: 'System',
          timestamp: txn.created_at || '',
          type: 'stock',
          status,
          lossValue: qty < 0 ? val : 0,
          recoveredValue: qty > 0 ? val : 0,
          reference: txn.variant?.sku || undefined,
          ...generateForensicData(txn.id, action, 'stock')
        };
      });

      return [...stockEntries, ...generalEntries, ...bankEntries, ...expenseEntries, ...inventoryEntries].sort((a, b) => {
        const timeA = new Date(a.timestamp || '').getTime() || 0;
        const timeB = new Date(b.timestamp || '').getTime() || 0;
        return timeB - timeA;
      });
    },
    staleTime: 60_000,
  });
}
