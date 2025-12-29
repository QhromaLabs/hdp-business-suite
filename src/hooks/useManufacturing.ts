import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  unit_cost: number;
  quantity_in_stock: number;
  reorder_level?: number;
  description?: string;
}

export interface Machine {
  id: string;
  name: string;
  status: 'operational' | 'maintenance' | 'broken';
  last_maintenance?: string;
  current_value: number;
  purchase_cost: number;
  depreciation_rate: number;
}

interface RecipeItem {
  id: string;
  material_variant_id: string | null;  // Old link to product_variants
  raw_material_id: string | null;      // New link to raw_materials
  quantity: number;
  material_variant?: { // Joined data
    id: string;
    product: { name: string };
    cost_price: number;
  };
  raw_material?: { // Joined data
    id: string;
    name: string;
    unit_cost: number;
  };
}

export interface Recipe {
  id: string;
  product_variant_id: string;
  name: string;
  yield_quantity: number;
  labor_cost?: number;
  machine_cost?: number;
  items?: RecipeItem[];
  // Joined
  product_variant?: {
    product?: { name: string };
    variant_name?: string;
  };
}

export interface ProductionBatch {
  id: string;
  recipe_id: string;
  quantity: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'paused';
  start_date: string;
  end_date?: string;
  notes?: string;
  production_cost?: number;
  recipe?: Recipe;
}

export function useProductionBatches() {
  return useQuery({
    queryKey: ['production_batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_batches')
        .select(`
          *,
          recipe:recipes(
            *,
            product_variant:product_variants(
              product:products(name),
              variant_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProductionBatch[];
    },
  });
}

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          product_variant:product_variants(
            product:products(name),
            variant_name
          ),
          items:recipe_items(
            *,
            material_variant:product_variants(
              cost_price,
              product:products(name)
            ),
            raw_material:raw_materials(
               name,
               unit_cost
            )
          )
        `);

      if (error) throw error;
      return data as Recipe[];
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
      labor_cost?: number;
      machine_cost?: number;
      items: { material_variant_id?: string; raw_material_id?: string; quantity: number }[]
    }) => {
      // 1. Create Recipe Header
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: recipe.name,
          product_variant_id: recipe.product_variant_id,
          yield_quantity: recipe.yield_quantity,
          labor_cost: recipe.labor_cost || 0,
          machine_cost: recipe.machine_cost || 0
        })
        .select()
        .single();

      if (recipeError) throw recipeError;
      const recipeId = recipeData.id;

      // 2. Insert Items with RAW MATERIAL ID support
      if (recipe.items.length > 0) {
        const itemsData = recipe.items.map(item => ({
          recipe_id: recipeId,
          material_variant_id: item.material_variant_id || null, // Optional now
          raw_material_id: item.raw_material_id || null,         // New field
          quantity: item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('recipe_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      return recipeId;
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

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipe: {
      id: string;
      name: string;
      product_variant_id: string;
      yield_quantity: number;
      labor_cost?: number;
      machine_cost?: number;
      items: { material_variant_id?: string; raw_material_id?: string; quantity: number }[]
    }) => {
      // 1. Update Recipe Details
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name: recipe.name,
          product_variant_id: recipe.product_variant_id,
          yield_quantity: recipe.yield_quantity,
          labor_cost: recipe.labor_cost || 0,
          machine_cost: recipe.machine_cost || 0
        })
        .eq('id', recipe.id);

      if (recipeError) throw recipeError;

      // 2. Update Items (Delete all and re-insert)
      const { error: deleteError } = await supabase
        .from('recipe_items')
        .delete()
        .eq('recipe_id', recipe.id);

      if (deleteError) throw deleteError;

      if (recipe.items.length > 0) {
        const itemsData = recipe.items.map(item => ({
          recipe_id: recipe.id,
          material_variant_id: item.material_variant_id || null,
          raw_material_id: item.raw_material_id || null,
          quantity: item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('recipe_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      return recipe.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Recipe updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update recipe: ' + error.message);
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

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: { id: string; quantity: number; notes?: string }) => {
      const { data, error } = await supabase
        .from('production_batches')
        .update({
          quantity: batch.quantity,
          notes: batch.notes
        })
        .eq('id', batch.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      toast.success('Batch updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update batch: ' + error.message);
    }
  });
}

export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'planned' | 'in_progress' | 'paused' | 'completed' | 'cancelled' }) => {
      const { error } = await supabase
        .from('production_batches')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      toast.success('Batch status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    }
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('production_batches')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      toast.success('Batch deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete batch: ' + error.message);
    }
  });
}

export function useCompleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      // 1. Get Batch Info
      const { data: batch, error: batchError } = await supabase
        .from('production_batches')
        .select('*')
        .eq('id', batchId)
        .single();
      if (batchError) throw batchError;

      // 2. Get Recipe & Items
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('*, recipe_items(*)') // We need items to calculate cost
        .eq('id', batch.recipe_id)
        .single();
      if (recipeError) throw recipeError;

      // 3. Deduct Ingredients & Calculate Costs
      let totalMaterialCost = 0;

      if (recipe.recipe_items && recipe.recipe_items.length > 0) {
        for (const item of recipe.recipe_items) {
          const qtyToDeduct = item.quantity * batch.quantity;
          let unitCost = 0;
          let stockUpdated = false;

          // CASE A: Raw Material (Prioritize this)
          if (item.raw_material_id) {
            const { data: rawMat, error: rawError } = await supabase
              .from('raw_materials')
              .select('id, unit_cost, quantity_in_stock')
              .eq('id', item.raw_material_id)
              .single();

            if (!rawError && rawMat) {
              unitCost = rawMat.unit_cost || 0;
              const newQty = (rawMat.quantity_in_stock || 0) - qtyToDeduct;

              await supabase.from('raw_materials')
                .update({ quantity_in_stock: newQty, updated_at: new Date().toISOString() })
                .eq('id', rawMat.id);

              stockUpdated = true;
            }
          }
          // CASE B: Product Variant (Fallback/Legacy)
          else if (item.material_variant_id) {
            const { data: inv, error: invError } = await supabase
              .from('inventory')
              .select('id, quantity, warehouse_location, variant:product_variants(cost_price)')
              .eq('variant_id', item.material_variant_id)
              .maybeSingle();

            if (!invError) {
              // @ts-ignore
              unitCost = inv?.variant?.cost_price || 0;

              if (inv) {
                const newQty = inv.quantity - qtyToDeduct;
                await supabase.from('inventory').update({ quantity: newQty }).eq('id', inv.id);
                await supabase.from('inventory_transactions').insert({
                  variant_id: item.material_variant_id,
                  transaction_type: 'production_usage',
                  quantity_change: -qtyToDeduct,
                  new_quantity: newQty,
                  reference_id: batchId,
                  reference_type: 'production_batch'
                });
              } else {
                // Handle negative stock creation if needed, or skip
                // For simplicity, we assume inventory exists for variants if used
              }
              stockUpdated = true;
            }
          }

          totalMaterialCost += (unitCost * qtyToDeduct);
        }
      }

      // 4. Calculate Total Production Cost
      const laborCost = (recipe.labor_cost || 0) * batch.quantity;
      const machineCost = (recipe.machine_cost || 0) * batch.quantity;
      const totalProductionCost = totalMaterialCost + laborCost + machineCost;

      // 5. Add Finished Product (Same as before)
      const qtyToAdd = batch.quantity * recipe.yield_quantity;
      const { data: prodInv, error: prodInvError } = await supabase
        .from('inventory')
        .select('id, quantity, warehouse_location')
        .eq('variant_id', recipe.product_variant_id)
        .maybeSingle();

      if (prodInvError) throw prodInvError;

      if (prodInv) {
        const newQty = prodInv.quantity + qtyToAdd;
        await supabase.from('inventory')
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq('id', prodInv.id);

        await supabase.from('inventory_transactions').insert({
          variant_id: recipe.product_variant_id,
          transaction_type: 'production_output',
          quantity_change: qtyToAdd,
          new_quantity: newQty,
          reference_id: batchId,
          reference_type: 'production_batch'
        });
      } else {
        await supabase.from('inventory').insert({
          variant_id: recipe.product_variant_id,
          quantity: qtyToAdd,
          warehouse_location: 'Main Warehouse'
        });

        await supabase.from('inventory_transactions').insert({
          variant_id: recipe.product_variant_id,
          transaction_type: 'production_output',
          quantity_change: qtyToAdd,
          new_quantity: qtyToAdd,
          reference_id: batchId,
          reference_type: 'production_batch'
        });
      }

      // 6. Complete Batch & Save Cost
      const { error: completeError } = await supabase
        .from('production_batches')
        .update({
          status: 'completed',
          end_date: new Date().toISOString(),
          production_cost: totalProductionCost
        })
        .eq('id', batchId);

      if (completeError) throw completeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] }); // Invalidate raw materials too
      toast.success('Batch completed! Cost calculated and inventory updated.');
    },
    onError: (error) => {
      toast.error('Failed to complete batch: ' + error.message);
    }
  });
}

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
    }
  });
}

export function useRegisterMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (machine: { name: string; description?: string; purchase_date?: string; purchase_cost?: number; current_value?: number; depreciation_rate?: number }) => {
      // 1. Insert Machine
      const { data, error } = await supabase
        .from('machines')
        .insert(machine)
        .select()
        .single();

      if (error) throw error;

      // 2. Log Expense (Purchase Cost)
      if (machine.purchase_cost && machine.purchase_cost > 0) {
        await supabase.from('expenses').insert({
          category: 'Equipment',
          description: `Machine Purchase: ${machine.name}`,
          amount: machine.purchase_cost,
          expense_date: machine.purchase_date || new Date().toISOString(),
          is_manufacturing_cost: true
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] }); // Update financials
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Machine registered and expense logged');
    },
    onError: (error) => {
      toast.error('Failed to register machine: ' + error.message);
    }
  });
}

export function useUpdateMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (machine: any) => {
      const { error } = await supabase
        .from('machines')
        .update(machine)
        .eq('id', machine.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine updated');
    }
  });
}

export function useDeleteMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete machine: ' + error.message);
    }
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

export function useCreateRawMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (material: { name: string; unit: string; unit_cost: number; quantity_in_stock: number; reorder_level?: number; description?: string }) => {
      // 1. Create the Raw Material
      const { data, error } = await supabase
        .from('raw_materials')
        .insert(material)
        .select()
        .single();

      if (error) throw error;

      // 2. Log Expense if Initial Stock provided with cost
      if (material.quantity_in_stock > 0 && material.unit_cost > 0) {
        const totalCost = material.quantity_in_stock * material.unit_cost;
        await supabase.from('expenses').insert({
          category: 'Raw Materials',
          description: `Initial Stock: ${material.name} (Qty: ${material.quantity_in_stock})`,
          amount: totalCost,
          expense_date: new Date().toISOString(),
          is_manufacturing_cost: true
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
      toast.success('Raw material added');
    }
  });
}

export function useUpdateRawMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (material: { id: string; name: string; unit: string; unit_cost: number; quantity_in_stock: number; reorder_level?: number; description?: string }) => {
      const { error } = await supabase
        .from('raw_materials')
        .update(material)
        .eq('id', material.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
      toast.success('Raw material updated');
    },
    onError: (error) => {
      toast.error('Failed to update material: ' + error.message);
    }
  });
}

export function useDeleteRawMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
      toast.success('Raw material deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete material: ' + error.message);
    }
  });
}

// --- RESTOCK RAW MATERIAL ---
export function useRestockRawMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity, cost }: { id: string; quantity: number; cost?: number }) => {
      // 1. Fetch current details
      const { data: current, error: fetchError } = await supabase.from('raw_materials').select('name, quantity_in_stock, unit_cost').eq('id', id).single();
      if (fetchError) throw fetchError;

      // 2. Calculate New Unit Cost (Weighted Average)
      let newCost = current.unit_cost;
      const totalPurchaseValue = quantity * (cost || current.unit_cost);

      if (cost) {
        const currentTotalValue = (current.quantity_in_stock * current.unit_cost);
        const newTotalQty = current.quantity_in_stock + quantity;
        newCost = newTotalQty > 0 ? (currentTotalValue + totalPurchaseValue) / newTotalQty : cost;
      }

      // 3. Update Raw Material Stock
      const { error } = await supabase
        .from('raw_materials')
        .update({
          quantity_in_stock: current.quantity_in_stock + quantity,
          unit_cost: newCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // 4. Log Expense (If cost provided)
      // This ensures Manufacturing Spend tracks the cash outflow for materials
      if (cost && cost > 0) {
        await supabase.from('expenses').insert({
          category: 'Raw Materials',
          description: `Restock: ${current.name} (Qty: ${quantity} @ ${cost})`,
          amount: totalPurchaseValue,
          expense_date: new Date().toISOString(),
          is_manufacturing_cost: true // Flag to filter from Operating Expenses if needed
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      queryClient.invalidateQueries({ queryKey: ['financial_summary'] }); // Update financials
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Stock updated and expense recorded');
    },
    onError: (error) => {
      toast.error('Failed to update stock: ' + error.message);
    }
  });
}

// --- PRODUCTION VALUE ANALYTICS ---
export function useMonthlyProductionValue() {
  return useQuery({
    queryKey: ['monthly_production_value'],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('production_batches')
        .select(`
          id,
          quantity,
          status,
          end_date,
          recipe:recipes(
            yield_quantity,
            product_variant:product_variants(
              cost_price
            )
          )
        `)
        .eq('status', 'completed')
        .gte('end_date', startOfMonth)
        .lte('end_date', endOfMonth);

      if (error) throw error;

      // Calculate total value
      const totalValue = (data || []).reduce((sum, batch) => {
        const yieldQty = batch.recipe?.yield_quantity || 1;
        const costPrice = batch.recipe?.product_variant?.cost_price || 0;
        const producedQty = batch.quantity * yieldQty;
        return sum + (producedQty * costPrice);
      }, 0);

      return totalValue;
    },
  });
}

export function useYearlyProductionValue() {
  return useQuery({
    queryKey: ['yearly_production_value'],
    queryFn: async () => {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('production_batches')
        .select(`
          id,
          quantity,
          status,
          end_date,
          recipe:recipes(
            yield_quantity,
            product_variant:product_variants(
              cost_price
            )
          )
        `)
        .eq('status', 'completed')
        .gte('end_date', startOfYear)
        .lte('end_date', endOfYear);

      if (error) throw error;

      // Calculate total value
      const totalValue = (data || []).reduce((sum, batch) => {
        const yieldQty = batch.recipe?.yield_quantity || 1;
        const costPrice = batch.recipe?.product_variant?.cost_price || 0;
        const producedQty = batch.quantity * yieldQty;
        return sum + (producedQty * costPrice);
      }, 0);

      return totalValue;
    },
  });
}
