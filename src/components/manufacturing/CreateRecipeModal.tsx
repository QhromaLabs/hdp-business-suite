import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, Wrench, Ban } from 'lucide-react';
import { useCreateRecipe, useUpdateRecipe, Recipe, useRawMaterials } from '@/hooks/useManufacturing';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IngredientRow } from './IngredientRow';

interface CreateRecipeModalProps {
    onClose: () => void;
    recipeToEdit?: Recipe;
}

export default function CreateRecipeModal({ onClose, recipeToEdit }: CreateRecipeModalProps) {
    const createRecipe = useCreateRecipe();
    const updateRecipe = useUpdateRecipe();
    const { data: rawMaterials } = useRawMaterials();
    const isEditing = !!recipeToEdit;

    // Form State
    const [name, setName] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [yieldQty, setYieldQty] = useState(1);

    // New Cost Fields
    const [laborCost, setLaborCost] = useState('');
    const [machineCost, setMachineCost] = useState('');

    // Ingredients (Now linked to Raw Materials)
    const [ingredients, setIngredients] = useState<{ raw_material_id: string | null; raw_material_name: string; quantity: number }[]>([]);

    useEffect(() => {
        if (recipeToEdit) {
            setName(recipeToEdit.name);
            setSelectedProduct(recipeToEdit.product_variant_id);
            setYieldQty(recipeToEdit.yield_quantity);
            setLaborCost(recipeToEdit.labor_cost?.toString() || '');
            setMachineCost(recipeToEdit.machine_cost?.toString() || '');

            if (recipeToEdit.items) {
                setIngredients(recipeToEdit.items.map(item => ({
                    raw_material_id: item.raw_material_id || item.material_variant_id || null, // Fallback to variant for old data
                    raw_material_name: item.raw_material?.name || item.material_variant?.product?.name || 'Unknown',
                    quantity: item.quantity
                })));
            }
        }
    }, [recipeToEdit]);

    // Fetch Product VARIANTS for selection (Output Product)
    const { data: productVariants } = useQuery({
        queryKey: ['product_variants_for_recipe_selection'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_variants')
                .select('id, sku, variant_name, product:products(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data.map(v => ({
                id: v.id,
                name: `${v.product?.name} (${v.variant_name})`,
                sku: v.sku
            }));
        }
    });

    // Map RAW MATERIALS for selection options
    const ingredientOptions = rawMaterials?.map(rm => ({
        id: rm.id,
        name: rm.name,
        unit: rm.unit
    })) || [];

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
            toast.error('Please fill in Name, Product, and at least one ingredient');
            return;
        }

        if (ingredients.some(i => !i.raw_material_id)) {
            // We encourage selecting from existing raw materials
            // In a strict mode, we might block this. For now, warn or block?
            // Let's block "Unselected" items to force using the proper raw material from DB
            toast.error('Please select valid Raw Materials from the list.');
            return;
        }

        try {
            const processedIngredients = ingredients.map(ing => ({
                raw_material_id: ing.raw_material_id!, // Send as raw_material_id
                quantity: ing.quantity
            }));

            const payload = {
                name,
                product_variant_id: selectedProduct,
                yield_quantity: Number(yieldQty),
                labor_cost: parseFloat(laborCost) || 0,
                machine_cost: parseFloat(machineCost) || 0,
                items: processedIngredients
            };

            if (isEditing && recipeToEdit) {
                await updateRecipe.mutateAsync({
                    id: recipeToEdit.id,
                    ...payload
                });
            } else {
                await createRecipe.mutateAsync(payload);
            }

            onClose();
        } catch (error: any) {
            console.error(error);
        }
    };

    const isPending = createRecipe.isPending || updateRecipe.isPending;

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Recipe' : 'Create New Production Recipe (BOM)'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Modify the existing recipe details and Bill of Materials.' : 'Define the Bill of Materials using Raw Materials.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Recipe Name</label>
                            <input
                                type="text"
                                className="input-field w-full px-3 py-2 border rounded-md"
                                placeholder="e.g. Standard Pillow Batch"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Yields Product (Output)</label>
                            <select
                                className="input-field w-full px-3 py-2 border rounded-md"
                                value={selectedProduct || ''}
                                onChange={(e) => setSelectedProduct(e.target.value)}
                            >
                                <option value="">Select Finished Item...</option>
                                {productVariants?.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Yield Quantity</label>
                            <input
                                type="number"
                                min="1"
                                className="input-field w-full px-3 py-2 border rounded-md"
                                value={yieldQty}
                                onChange={(e) => setYieldQty(Number(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">Units produced per batch</p>
                        </div>
                    </div>

                    {/* Costing Section */}
                    <div className="bg-muted/10 p-4 rounded-xl border border-border space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="w-4 h-4" />
                            Production Costs (Per Batch)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium flex items-center gap-1">
                                    Labor Cost
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">KES</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={laborCost}
                                        onChange={e => setLaborCost(e.target.value)}
                                        className="w-full pl-8 px-2 py-2 rounded-lg border border-input text-sm"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground">Wages / Piece Rate</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium flex items-center gap-1">
                                    <Wrench className="w-3 h-3" /> Machine Cost
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">KES</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={machineCost}
                                        onChange={e => setMachineCost(e.target.value)}
                                        className="w-full pl-8 px-2 py-2 rounded-lg border border-input text-sm"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground">Wear / Depreciation</p>
                            </div>
                        </div>
                    </div>

                    {/* Ingredients Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-semibold text-sm">Ingredients / BOM</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddIngredient}
                                className="h-8"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Add Ingredient
                            </Button>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-800 flex items-center gap-2 mb-2">
                            <Ban className="w-3 h-3" />
                            <span>Select ingredients from your <b>Raw Materials</b> list. Add new ones in "Manage Stock" if missing.</span>
                        </div>

                        {ingredients.length === 0 ? (
                            <div className="text-center py-6 bg-muted/30 rounded-lg text-muted-foreground text-sm border border-dashed">
                                No ingredients added. Click "Add Ingredient" to start.
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
                                        options={ingredientOptions}
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
                        disabled={isPending}
                    >
                        {isPending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Recipe' : 'Create Recipe')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
