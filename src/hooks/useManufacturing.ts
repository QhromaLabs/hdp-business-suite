import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

// --- Types ---

export interface Recipe {
  id: string;
  product_variant_id: string;
  name: string;
  description: string | null;
  yield_quantity: number;
  product_variant?: {
    id: string;
    product: { name: string };
    sku: string;
  };
  items?: RecipeItem[];
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  material_variant_id: string;
  quantity: number;
  material_variant?: {
    id: string;
    product: { name: string };
    sku: string;
    sku: string;
    unit_cost: number;
    cost_price?: number; // DB column name
  };
}

export interface ProductionBatch {
  id: string;
  recipe_id: string;
  quantity: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  recipe?: Recipe;
  // For backward compatibility / UI display if needed
  batch_number?: string;
  actual_quantity?: number;
  wastage_quantity?: number;
}

export interface Machine {
  id: string;
  name: string;
  description: string | null;
  status: string;
  purchase_date: string | null;
  purchase_cost: number;
  current_value: number;
  depreciation_rate: number;
  last_maintenance: string | null;
}

export interface RawMaterial {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_cost: number;
  quantity_in_stock: number;
  reorder_level: number;
}

// --- Hooks ---

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      // Fetch all necessary data in parallel
      const [recipesResult, itemsResult, variantsResult, productsResult] = await Promise.all([
        supabase.from('recipes').select('*').order('name'),
        supabase.from('recipe_items').select('*'),
        supabase.from('product_variants').select('*'), // This has cost_price
        supabase.from('products').select('id, name')
      ]);

      if (recipesResult.error) throw recipesResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (variantsResult.error) throw variantsResult.error;
      if (productsResult.error) throw productsResult.error;

      const productsMap = new Map(productsResult.data.map(p => [p.id, p]));
      const variantsMap = new Map(variantsResult.data.map(v => [v.id, { ...v, product: productsMap.get(v.product_id) }]));

      // Group items by recipe_id
      const itemsByRecipe = new Map<string, RecipeItem[]>();
      itemsResult.data.forEach((item: any) => {
        const variant = variantsMap.get(item.material_variant_id);
        const recipeItem: RecipeItem = {
          ...item,
          material_variant: variant ? {
            id: variant.id,
            sku: variant.sku,
            unit_cost: variant.cost_price || 0, // Map cost_price to unit_cost
            product: variant.product || { name: 'Unknown' }
          } : undefined
        };

        const existing = itemsByRecipe.get(item.recipe_id) || [];
        existing.push(recipeItem);
        itemsByRecipe.set(item.recipe_id, existing);
      });

      // Join everything
      return recipesResult.data.map(recipe => {
        const productVariant = variantsMap.get(recipe.product_variant_id);
        return {
          ...recipe,
          product_variant: productVariant ? {
            id: productVariant.id,
            sku: productVariant.sku,
            product: productVariant.product || { name: 'Unknown' }
          } : undefined,
          items: itemsByRecipe.get(recipe.id) || []
        };
      }) as Recipe[];
    },
  });
}

export function useProductionBatches() {
  return useQuery({
    queryKey: ['production_batches'],
    queryFn: async () => {
      const [batchesResult, recipesResult, variantsResult, productsResult] = await Promise.all([
        supabase.from('production_batches').select('*').order('created_at', { ascending: false }),
        supabase.from('recipes').select('*'),
        supabase.from('product_variants').select('*'),
        supabase.from('products').select('id, name')
      ]);

      if (batchesResult.error) throw batchesResult.error;
      if (recipesResult.error) throw recipesResult.error;
      if (variantsResult.error) throw variantsResult.error;
      if (productsResult.error) throw productsResult.error;

      const productsMap = new Map(productsResult.data.map(p => [p.id, p]));
      const variantsMap = new Map(variantsResult.data.map(v => [v.id, { ...v, product: productsMap.get(v.product_id) }]));

      const recipesMap = new Map(recipesResult.data.map(r => {
        const variant = variantsMap.get(r.product_variant_id);
        return [r.id, {
          ...r,
          product_variant: variant ? {
            product: variant.product || { name: 'Unknown' }
          } : undefined
        }];
      }));

      return batchesResult.data.map(batch => ({
        ...batch,
        recipe: recipesMap.get(batch.recipe_id)
      })) as ProductionBatch[];
    },
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipe: {
      name: string;
      product_variant_id: string;
      yield_quantity: number;
      items: { material_variant_id: string; quantity: number }[]
    }) => {
      // 1. Create Recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: recipe.name,
          product_variant_id: recipe.product_variant_id,
          yield_quantity: recipe.yield_quantity
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // 2. Create Items
      const itemsData = recipe.items.map(item => ({
        recipe_id: recipeData.id,
        material_variant_id: item.material_variant_id,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('recipe_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      return recipeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Recipe created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create recipe: ' + error.message);
    }
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: { recipe_id: string; quantity: number; notes?: string }) => {
      const { data, error } = await supabase
        .from('production_batches')
        .insert({
          recipe_id: batch.recipe_id,
          quantity: batch.quantity,
          status: 'planned',
          notes: batch.notes,
          start_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      toast.success('Production batch created');
    },
    onError: (error) => {
      toast.error('Failed to create batch: ' + error.message);
    }
  });
}

export function useCompleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase.rpc('complete_production_batch', { batch_id: batchId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Batch completed! Inventory updated.');
    },
    onError: (error) => {
      toast.error('Failed to complete batch: ' + error.message);
    }
  });
}

// --- Restored Machine & Legacy Hooks ---

export function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Machine[];
    },
  });
}

export function useRawMaterials() {
  return useQuery({
    queryKey: ['raw_materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as RawMaterial[];
    },
  });
}

export function useRegisterMachine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (machine: Partial<Machine>) => {
      const { data, error } = await supabase
        .from('machines')
        .insert(machine)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine saved');
    },
    onError: (error) => {
      toast.error('Failed to save machine: ' + error.message);
    },
  });
}

export function useUpdateMachine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...machine }: Partial<Machine> & { id: string }) => {
      const { error } = await supabase
        .from('machines')
        .update(machine)
        .eq('id', id);

      if (error) throw error;
      return { id, ...machine };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine updated');
    },
    onError: (error) => {
      toast.error('Failed to update machine: ' + error.message);
    },
  });
}

export function useDeleteMachine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete machine: ' + error.message);
    },
  });
}

export function useUpdateProductionRun() {
  // Legacy hook - might not be needed if we fully switch to batches, 
  // but kept for compatibility if needed or reused.
  // We can adapt this to update 'production_batches' if the user wants inline edits.
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: any) => {
      // Placeholder or adapted implementation
      return null;
    }
  });
}
