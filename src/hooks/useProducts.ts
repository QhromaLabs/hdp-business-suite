import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  variant_name: string;
  barcode: string | null;
  size: string | null;
  color: string | null;
  price: number;
  cost_price: number;
  reorder_level: number;
  weight: number | null;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  base_price: number;
  cost_price: number;
  image_url: string | null;
  attributes: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  category?: ProductCategory;
  variants?: ProductVariant[];
}

export interface InventoryItem {
  id: string;
  variant_id: string;
  quantity: number;
  reserved_quantity: number;
  warehouse_location: string | null;
  variant?: ProductVariant & { product?: Product };
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
  *,
  category: product_categories(id, name, description),
    variants: product_variants(*)
      `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProductVariants() {
  return useQuery({
    queryKey: ['product_variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
      *,
      product: products(id, name, description, category_id, attributes, image_url)
        `)
        .eq('is_active', true)
        .order('variant_name');

      if (error) throw error;
      return data;
    },
  });
}

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
        *,
        variant: product_variants!inner(
            *,
          product: products!inner(id, name, description, category_id, is_active, attributes, image_url, category: product_categories(name)),
          is_active
        )
          `)
        .eq('variant.is_active', true)
        .eq('variant.product.is_active', true)
        .order('quantity', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as ProductCategory[];
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: {
      name: string;
      description?: string;
      category_id?: string;
      base_price: number;
      cost_price: number;
      image_url?: string;
      attributes?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create product: ' + error.message);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update product: ' + error.message);
    },
  });
}

export function useProductHistory(productId?: string) {
  return useQuery({
    queryKey: ['product_history', productId],
    enabled: !!productId,
    queryFn: async () => {
      if (!productId) return null;

      // Fetch variant ids first
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', productId);

      const variantIds = variants?.map(v => v.id) || [];

      // Fetch stock movements
      const { data: stockHistory } = await supabase
        .from('inventory_transactions')
        .select('*')
        .in('variant_id', variantIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch sales history
      const { data: salesHistory } = await supabase
        .from('sales_order_items')
        .select(`
          *,
          order: sales_orders(created_at, status, customer: customers(name))
            `)
        .in('variant_id', variantIds)
        .order('created_at', { ascending: false })
        .limit(20);

      return {
        stock: stockHistory || [],
        sales: salesHistory || []
      };
    }
  });
}

export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variant: Omit<ProductVariant, 'id' | 'is_active'>) => {
      const { data, error } = await supabase
        .from('product_variants')
        .insert(variant)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product_variants'] });
      toast.success('Variant created');
    },
    onError: (error) => {
      toast.error('Failed to create variant: ' + error.message);
    },
  });
}

export function useAddStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      variant_id,
      quantity,
      warehouse_location,
      silent,
    }: { variant_id: string; quantity: number; warehouse_location?: string; silent?: boolean }) => {
      // First check if inventory entry exists
      const { data: existing, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .eq('variant_id', variant_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const previousQuantity = existing?.quantity || 0;
      const newQuantity = previousQuantity + quantity;

      if (existing) {
        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
            warehouse_location: warehouse_location || existing.warehouse_location
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('inventory')
          .insert({
            variant_id,
            quantity: newQuantity,
            warehouse_location: warehouse_location || 'Main Warehouse'
          });
        if (insertError) throw insertError;
      }

      // Log transaction only when quantity changes
      if (quantity !== 0) {
        await supabase.from('inventory_transactions').insert({
          variant_id,
          transaction_type: quantity > 0 ? 'restock' : 'adjustment',
          quantity_change: quantity,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
        });
      }

      return { success: true, silent: !!silent, quantity };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      if (variables?.silent) return;

      if (variables?.quantity === 0) {
        toast.success('Inventory item created');
      } else if ((variables?.quantity || 0) > 0) {
        toast.success('Stock added successfully');
      } else {
        toast.success('Inventory adjusted');
      }
    },
    onError: (error) => {
      toast.error('Failed to add stock: ' + error.message);
    },
  });
}

// Convenience re-export so inventory screens can import from a single module.
export { useDeleteProducts } from './useDeleteProducts';
