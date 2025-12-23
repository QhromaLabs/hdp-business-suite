import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from "@/lib/utils"
import { useCreateRecipe } from '@/hooks/useManufacturing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IngredientRow } from './IngredientRow';

interface CreateRecipeModalProps {
    onClose: () => void;
}

export default function CreateRecipeModal({ onClose }: CreateRecipeModalProps) {
    const createRecipe = useCreateRecipe();

    // Form State
    const [name, setName] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [yieldQty, setYieldQty] = useState(1);
    const [ingredients, setIngredients] = useState<{ raw_material_id: string | null; raw_material_name: string; quantity: number }[]>([]);

    // Fetch Product VARIANTS for selection (Recipes produce a specific Variant)
    const { data: productVariants } = useQuery({
        queryKey: ['product_variants_for_recipe_selection'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_variants')
                .select('id, sku, product:products(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(v => ({
                id: v.id,
                name: v.product?.name || 'Unknown Product',
                sku: v.sku
            }));
        }
    });

    // Fetch Raw Materials for ingredients
    const { data: rawMaterials } = useQuery({
        queryKey: ['raw_materials_for_recipe'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('raw_materials')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        }
    });

    const handleAddIngredient = () => {
        setIngredients([...ingredients, { raw_material_id: null, raw_material_name: '', quantity: 1 }]);
    };

    const handleUpdateIngredient = (index: number, updates: any) => {
        const newIngredients = [...ingredients];
        newIngredients[index] = { ...newIngredients[index], ...updates };
        setIngredients(newIngredients);
    };

    const handleRemoveIngredient = (index: number) => {
        const newIngredients = [...ingredients];
        newIngredients.splice(index, 1);
        setIngredients(newIngredients);
    };

    const handleSubmit = async () => {
        if (!name || !selectedProduct || ingredients.length === 0) {
            toast.error('Please fill in all fields and add at least one ingredient');
            return;
        }

        // Validate ingredients have names
        if (ingredients.some(i => !i.raw_material_name.trim())) {
            toast.error('All ingredients must have a name');
            return;
        }

        try {
            // Process ingredients: Create new raw materials if needed
            const processedIngredients = await Promise.all(ingredients.map(async (ing) => {
                if (ing.raw_material_id) {
                    return { raw_material_id: ing.raw_material_id, quantity: ing.quantity };
                } else {
                    // Create new raw material
                    const { data: newMaterial, error: createError } = await supabase
                        .from('raw_materials')
                        .insert({
                            name: ing.raw_material_name,
                            unit: 'units', // Default unit, user can edit later
                            unit_cost: 0,
                            quantity_in_stock: 0
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    return { raw_material_id: newMaterial.id, quantity: ing.quantity };
                }
            }));

            await createRecipe.mutateAsync({
                name,
                product_variant_id: selectedProduct,
                yield_quantity: Number(yieldQty),
                items: processedIngredients
            });

            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to create recipe: ' + error.message);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Recipe</DialogTitle>
                    <DialogDescription>
                        Define a new recipe by linking a finished product to its raw material ingredients.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Recipe Name</label>
                            <input
                                type="text"
                                className="input-field w-full"
                                placeholder="e.g. Standard Pillow Batch"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Produces Product</label>
                            <select
                                className="input-field w-full"
                                value={selectedProduct || ''}
                                onChange={(e) => setSelectedProduct(e.target.value)}
                            >
                                <option value="">Select Finished Good...</option>
                                {productVariants?.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.sku})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Yield Quantity</label>
                            <input
                                type="number"
                                min="1"
                                className="input-field w-full"
                                value={yieldQty}
                                onChange={(e) => setYieldQty(Number(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">How many units does this recipe make?</p>
                        </div>
                    </div>

                    {/* Ingredients Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-semibold text-sm">Ingredients (Raw Materials)</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddIngredient}
                                className="h-8"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Add Material
                            </Button>
                        </div>

                        {ingredients.length === 0 ? (
                            <div className="text-center py-6 bg-muted/30 rounded-lg text-muted-foreground text-sm border border-dashed">
                                No ingredients added. Click "Add Material" to start.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {ingredients.map((ingredient, idx) => (
                                    <IngredientRow
                                        key={idx}
                                        index={idx}
                                        rawMaterialId={ingredient.raw_material_id}
                                        rawMaterialName={ingredient.raw_material_name}
                                        quantity={ingredient.quantity}
                                        options={rawMaterials || []}
                                        onUpdate={handleUpdateIngredient}
                                        onRemove={handleRemoveIngredient}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-primary text-primary-foreground font-semibold"
                        disabled={createRecipe.isPending}
                    >
                        {createRecipe.isPending ? 'Creating...' : 'Create Recipe'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
