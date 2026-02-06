import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { calculateTotals } from '@/lib/tax';
import { useSettings } from '@/contexts/SettingsContext';

type OrderStatus = Database['public']['Enums']['order_status'];
type PaymentMethod = Database['public']['Enums']['payment_method'];

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  created_by?: string | null;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod | null;
  is_credit_sale: boolean;
  notes: string | null;
  created_at: string;
  customer?: { name: string; phone: string; address_name?: string; latitude?: number; longitude?: number };
  address_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  delivery_agent_id?: string | null;
  dispatched_at?: string | null;
  delivery_accepted_at?: string | null;
  delivery_completed_at?: string | null;
}


export interface SalesOrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

export interface SalesFeedback {
  id: string;
  content: string;
  feedback_type: string;
  status: string | null;
  follow_up_date: string | null;
  customer_id: string | null;
  sales_rep_id: string;
  created_at: string;
  customer?: { name?: string | null };
  sales_rep?: { full_name?: string | null };
}

export function useSalesOrders(
  status?: OrderStatus,
  options?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 25;

  return useQuery({
    queryKey: ['sales_orders', status, options?.startDate, options?.endDate, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(name, phone, address_name, latitude, longitude, address)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options?.endDate) {
        // Add one day to endDate to include the entire end date
        const endDatePlusOne = new Date(options.endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        query = query.lt('created_at', endDatePlusOne.toISOString());
      }

      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      return {
        orders: data as SalesOrder[],
        totalCount: count || 0
      };
    },
  });
}

export function useTodaysSales() {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['todays_sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(name, phone)
        `)
        .gte('created_at', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SalesOrder[];
    },
  });
}

export function useDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      // 1. Fetch sales for the last 7 days
      const { data: salesData } = await supabase
        .from('sales_orders')
        .select('id, total_amount, created_at, subtotal')
        .gte('created_at', last7Days)
        .order('created_at', { ascending: true });

      // 2. Process today's sales
      const todaySalesOrders = salesData?.filter(s => s.created_at.startsWith(today)) || [];
      const todayTotal = todaySalesOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const todayOrders = todaySalesOrders.length;
      const todayOrderIds = todaySalesOrders.map(o => o.id);

      // 3. Calculate COGS for today
      let todayCOGS = 0;
      if (todayOrderIds.length > 0) {
        const { data: items } = await supabase
          .from('sales_order_items')
          .select('quantity, variant:product_variants(cost_price)')
          .in('order_id', todayOrderIds);

        todayCOGS = items?.reduce((sum: number, item: any) => {
          const cost = item.variant?.cost_price || 0;
          return sum + (cost * item.quantity);
        }, 0) || 0;
      }

      // 4. Fetch Today's Expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('expense_date', today);

      const todayExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // 5. Calculate Net Profit (Gross Revenue - COGS - Expenses)
      // Note: Using total_amount (Revenue) might include tax. Ideally we use subtotal for Gross Profit.
      // Let's use Subtotal if available, else Total. 
      // Profit = (Sum of Subtotals) - COGS - Expenses
      const todayRevenue = todaySalesOrders.reduce((sum, o) => sum + Number(o.subtotal || o.total_amount), 0);
      const todayProfit = todayRevenue - todayCOGS - todayExpenses;

      // 6. Process historical chart data
      const dailyTotals: { [key: string]: number } = {};
      salesData?.forEach(s => {
        const date = s.created_at.split('T')[0];
        dailyTotals[date] = (dailyTotals[date] || 0) + Number(s.total_amount);
      });

      const chartData = Object.entries(dailyTotals).map(([date, revenue]) => ({
        date,
        revenue
      })).slice(-7);

      // 7. Pending orders
      const { count: pendingOrders } = await supabase
        .from('sales_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 8. Low stock items
      const { count: lowStock } = await supabase
        .from('inventory')
        .select('id', { count: 'exact', head: true })
        .lt('quantity', 50);

      return {
        todaySales: todayTotal,
        todayOrders,
        todayProfit, // New field
        pendingOrders: pendingOrders || 0,
        lowStockItems: lowStock || 0,
        chartData
      };
    },
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  const { taxEnabled } = useSettings();

  return useMutation({
    mutationFn: async (order: {
      customer_id?: string;
      items: { variant_id: string; quantity: number; unit_price: number; discount?: number }[];
      payment_method: PaymentMethod;
      is_credit_sale?: boolean;
      notes?: string;
      globalDiscount?: number;
    }) => {
      const subtotal = order.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const itemDiscounts = order.items.reduce((sum, item) => sum + (item.discount || 0), 0);
      const totalDiscount = itemDiscounts + (order.globalDiscount || 0);
      const { tax, total } = calculateTotals(subtotal, totalDiscount, taxEnabled);

      // 1. Validate Credit Limit (if credit sale)
      if (order.is_credit_sale && order.customer_id) {
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('credit_limit, credit_balance, name')
          .eq('id', order.customer_id)
          .single();

        if (customerError) throw customerError;

        if (customer) {
          const currentBalance = customer.credit_balance || 0;
          const limit = customer.credit_limit || 0;
          const newBalance = currentBalance + total;

          if (limit > 0 && newBalance > limit) {
            const availableCredit = limit - currentBalance;
            throw new Error(`Credit limit exceeded! Available credit: ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(availableCredit)}`);
          }
        }
      }

      // Create order
      const { data: salesOrder, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          order_number: '', // Auto-generated
          customer_id: order.customer_id,
          status: 'pending',
          subtotal,
          discount_amount: totalDiscount,
          tax_amount: tax,
          total_amount: total,
          payment_method: order.payment_method,
          is_credit_sale: order.is_credit_sale || false,
          notes: order.notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const items = order.items.map(item => ({
        order_id: salesOrder.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        total_price: (item.unit_price * item.quantity) - (item.discount || 0),
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // 3. Deduct stock from inventory
      for (const item of items) {
        const { data: invData } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('variant_id', item.variant_id)
          .single();

        if (invData) {
          await supabase
            .from('inventory')
            .update({ quantity: (invData.quantity || 0) - item.quantity })
            .eq('variant_id', item.variant_id);
        }
      }

      // 4. Update Customer Credit Balance (if credit sale)
      if (order.is_credit_sale && order.customer_id) {
        // Re-fetch strictly to be safe, or just use atomic increment logic if possible.
        // For now, simpler read-modify-write as we did in validation, but purely incremental is safer.
        // Supabase doesn't have atomic increment in simple update easily without RPC.
        // We will just do a fresh fetch-update or assume the previous check is "close enough" but concurrency exists.
        // Let's re-fetch current to be slightly safer.
        const { data: freshCustomer } = await supabase
          .from('customers')
          .select('credit_balance')
          .eq('id', order.customer_id)
          .single();

        const currentBalance = freshCustomer?.credit_balance || 0;
        const newBalance = currentBalance + total;

        const { error: balanceError } = await supabase
          .from('customers')
          .update({ credit_balance: newBalance })
          .eq('id', order.customer_id);

        if (balanceError) {
          console.error('Failed to update credit balance:', balanceError);
          toast.error('Order created but failed to update credit balance. Please check manually.');
        }
      }

      // 5. Create payment record for non-credit sales (POS cash/mpesa orders)
      // This ensures the sale appears in the ledger immediately
      if (!order.is_credit_sale) {
        const now = new Date().toISOString();
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: salesOrder.id,
            customer_id: order.customer_id,
            amount: total,
            payment_method: order.payment_method,
            created_at: now
          });

        if (paymentError) {
          console.error('Failed to create payment record:', paymentError);
          // Don't throw - allow order creation to succeed even if payment logging fails
        }
      }

      return salesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['todays_sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] }); // Invalidate payments to refresh ledger
      queryClient.invalidateQueries({ queryKey: ['customers'] }); // Refresh customer list for balances
      toast.success('Sale completed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create order: ' + error.message);
    },
  });
}

export function useUpdateSalesOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      delivery_agent_id,
      latitude,
      longitude,
      address_name
    }: {
      id: string;
      status: OrderStatus;
      delivery_agent_id?: string;
      latitude?: number;
      longitude?: number;
      address_name?: string;
    }) => {
      const updates: Record<string, any> = { status };
      if (delivery_agent_id) updates.delivery_agent_id = delivery_agent_id;
      if (latitude !== undefined) updates.latitude = latitude;
      if (longitude !== undefined) updates.longitude = longitude;
      if (address_name) updates.address_name = address_name;

      const now = new Date().toISOString();
      if (status === 'approved') {
        updates.approved_at = now;
      }
      if (status === 'dispatched') {
        updates.dispatched_at = now;

        // Get order details to create payment record
        const { data: order, error: fetchError } = await supabase
          .from('sales_orders')
          .select('total_amount, payment_method, customer_id')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        // Create payment record for the order (so it appears in ledger)
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: id,
            customer_id: order.customer_id,
            amount: order.total_amount,
            payment_method: order.payment_method || 'cash',
            created_at: now
          });

        if (paymentError) {
          console.error('Failed to create payment record:', paymentError);
          // Don't throw - allow dispatch to succeed even if payment logging fails
        }
      }

      const { error } = await supabase
        .from('sales_orders')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['todays_sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] }); // Invalidate payments to refresh ledger
      toast.success('Order status updated');
    },
    onError: (error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });
}

export function useDeleteSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, items }: { orderId: string; items: any[] }) => {
      // 1. Restock items
      for (const item of items) {
        const { data: invData } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('variant_id', item.variant_id)
          .single();

        if (invData) {
          await supabase
            .from('inventory')
            .update({ quantity: (invData.quantity || 0) + item.quantity })
            .eq('variant_id', item.variant_id);
        }
      }

      // 2. Delete related payments first (Foreign Key constraint blocker)
      console.log('Deleting payments for order:', orderId);
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('order_id', orderId);

      if (paymentsError) {
        console.error('Error deleting payments:', paymentsError);
        throw paymentsError;
      }

      // 3. Delete order items
      console.log('Deleting labels/items for order:', orderId);
      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error deleting items:', itemsError);
        throw itemsError;
      }

      // 4. Delete order row
      console.log('Deleting order row:', orderId);
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        console.error('Error deleting order:', error);
        throw error;
      }

      console.log('Deletion successful');
      return { orderId };
    },
    onSuccess: (_data, variables) => {
      const orderId = variables?.orderId;

      // Optimistically remove from cached lists so UI updates immediately
      queryClient.setQueriesData({ queryKey: ['sales_orders'] }, (existing: any) => {
        if (!Array.isArray(existing)) return existing;
        return existing.filter(order => order.id !== orderId);
      });

      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['todays_sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['order_items', orderId] });
      toast.success('Order deleted and stock returned');
    },
    onError: (error) => {
      toast.error('Failed to delete order: ' + error.message);
    },
  });
}

export function useCreateSalesFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      content: string,
      feedback_type: string,
      customer_id?: string,
      follow_up_date?: string,
      sales_rep_id: string
    }) => {
      const { data, error } = await supabase
        .from('sales_feedback')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_feedback'] });
      toast.success('Feedback logged');
    },
    onError: (error) => {
      toast.error('Failed to log feedback: ' + error.message);
    },
  });
}

export function useSalesFeedback() {
  return useQuery({
    queryKey: ['sales_feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_feedback')
        .select('*, customer:customers(name), sales_rep:employees(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      // Handle missing table gracefully
      if (error) {
        console.warn('Sales feedback table not available:', error.message);
        return [];
      }
      return data as SalesFeedback[];
    },
    // Don't retry on error to avoid spamming console
    retry: false,
    // Return empty array as fallback
    placeholderData: [],
  });
}

export function useOrderItems(orderId: string) {
  return useQuery({
    queryKey: ['order_items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_order_items')
        .select(`
          *,
          variant:product_variants (
            sku,
            variant_name,
            weight,
            product:products (
              name
            )
          )
        `)
        .eq('order_id', orderId);

      if (error) throw error;
      return data;
    },
  });
}
