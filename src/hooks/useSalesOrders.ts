import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

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
  customer?: { name: string; phone: string };
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
}

export function useSalesOrders(status?: OrderStatus) {
  return useQuery({
    queryKey: ['sales_orders', status],
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(name, phone)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data as SalesOrder[];
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
        .select('total_amount, created_at')
        .gte('created_at', last7Days)
        .order('created_at', { ascending: true });

      // 2. Process today's sales
      const todaySales = salesData?.filter(s => s.created_at.startsWith(today)) || [];
      const todayTotal = todaySales.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const todayOrders = todaySales.length;

      // 3. Process historical chart data
      const dailyTotals: { [key: string]: number } = {};
      salesData?.forEach(s => {
        const date = s.created_at.split('T')[0];
        dailyTotals[date] = (dailyTotals[date] || 0) + Number(s.total_amount);
      });

      const chartData = Object.entries(dailyTotals).map(([date, revenue]) => ({
        date,
        revenue
      })).slice(-7);

      // 4. Pending orders
      const { count: pendingOrders } = await supabase
        .from('sales_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 5. Low stock items
      const { count: lowStock } = await supabase
        .from('inventory')
        .select('id', { count: 'exact', head: true })
        .lt('quantity', 50);

      return {
        todaySales: todayTotal,
        todayOrders,
        pendingOrders: pendingOrders || 0,
        lowStockItems: lowStock || 0,
        chartData
      };
    },
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: {
      customer_id?: string;
      items: { variant_id: string; quantity: number; unit_price: number; discount?: number }[];
      payment_method: PaymentMethod;
      is_credit_sale?: boolean;
      notes?: string;
    }) => {
      const subtotal = order.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const discount = order.items.reduce((sum, item) => sum + (item.discount || 0), 0);
      const tax = (subtotal - discount) * 0.16;
      const total = subtotal - discount + tax;

      // Create order
      const { data: salesOrder, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          order_number: '', // Auto-generated
          customer_id: order.customer_id,
          status: 'pending',
          subtotal,
          discount_amount: discount,
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

      return salesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['todays_sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
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
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const updates: Record<string, any> = { status };
      const now = new Date().toISOString();
      if (status === 'approved') {
        updates.approved_at = now;
      }
      if (status === 'dispatched') {
        updates.dispatched_at = now;
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
      toast.success('Order status updated');
    },
    onError: (error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });
}

export function useCreateSalesFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      content: string;
      feedback_type: string;
      status?: string;
      follow_up_date?: string | null;
      customer_id?: string | null;
      sales_rep_id: string;
    }) => {
      const { data, error } = await supabase
        .from('sales_feedback')
        .insert({
          content: payload.content,
          feedback_type: payload.feedback_type,
          status: payload.status || 'open',
          follow_up_date: payload.follow_up_date || null,
          customer_id: payload.customer_id || null,
          sales_rep_id: payload.sales_rep_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SalesFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_feedback'] });
      toast.success('Field note logged');
    },
    onError: (error) => {
      toast.error('Failed to log feedback: ' + error.message);
    },
  });
}

export function useOrderItems(orderId: string) {
  return useQuery({
    queryKey: ['sales_order_items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_order_items')
        .select(`
          *,
          variant:product_variants(
            variant_name,
            sku,
            product:products(name)
          )
        `)
        .eq('order_id', orderId);

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}
