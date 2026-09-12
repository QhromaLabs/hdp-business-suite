import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, Ban } from 'lucide-react';
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
    const [markup, setMarkup] = useState(0);

    // BOM State
    const [ingredients, setIngredients] = useState<{
        item_type: 'raw_material' | 'service' | 'overhead';
        raw_material_id: string | null;
        name: string;
        quantity: number;
        unit_cost: number;
    }[]>([]);

    useEffect(() => {
        if (recipeToEdit) {
            setName(recipeToEdit.name);
            setSelectedProduct(recipeToEdit.product_variant_id);
            setYieldQty(recipeToEdit.yield_quantity);
            setMarkup(recipeToEdit.manufacturing_markup || 0);

            if (recipeToEdit.items) {
                setIngredients(recipeToEdit.items.map(item => ({
                    item_type: item.item_type || 'raw_material',
                    raw_material_id: item.raw_material_id || item.material_variant_id || null,
                    name: item.raw_material?.name || item.material_variant?.product?.name || item.description || 'Unknown',
                    quantity: item.quantity,
                    unit_cost: item.unit_cost || 0
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

    // Fetch Raw Materials AND Semi-Finished Goods
    const { data: ingredientOptions } = useQuery({
        queryKey: ['recipe_ingredients'],
        queryFn: async () => {
            // 1. Get Raw Materials
            const { data: rawMats, error: rmError } = await supabase
                .from('raw_materials')
                .select('id, name, unit, current_cost')
                .order('name');

            if (rmError) throw rmError;

            // 2. Get Semi-Finished Goods (Products)
            const { data: semiFinished, error: sfError } = await supabase
                .from('product_variants')
                .select(`
                    id, 
                    variant_name, 
                    cost_price,
                    product:products!inner(name, product_type)
                `)
                .eq('product.product_type', 'semi_finished_good');

            if (sfError) throw sfError;

            // Combine them
            const materials = rawMats?.map(rm => ({
                id: rm.id,
                name: rm.name,
                unit: rm.unit,
                type: 'raw_material' as const,
                cost: rm.current_cost
            })) || [];

            const products = semiFinished?.map(p => ({
                id: p.id,
                name: `${p.product?.name} (${p.variant_name})`,
                unit: 'unit',
                type: 'semi_finished' as const,
                cost: p.cost_price
            })) || [];

            return [...materials, ...products];
        }
    });

    const handleAddIngredient = (type: 'raw_material' | 'service' | 'overhead' = 'raw_material') => {
        setIngredients([...ingredients, {
            item_type: type,
            raw_material_id: null,
            name: '',
            quantity: 1,
            unit_cost: 0
        }]);
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
            toast.error('Please fill in Name, Product, and at least one BOM item');
            return;
        }

        if (ingredients.some(i => i.item_type === 'raw_material' && !i.raw_material_id)) {
            toast.error('Please select valid Raw Materials from the list.');
            return;
        }

        try {
            const processedIngredients = ingredients.map(ing => {
                // Determine if it's a raw material or a semi-finished product based on how it was selected
                // (Currently we store ID in raw_material_id for both in state, needing cleanup)
                // In IngredientRow: raw_material_id gets the ID of the selected option

                // We need to look up the selected option to know its type
                const selectedOption = ingredientOptions?.find(opt => opt.id === ing.raw_material_id);
                const isSemiFinished = selectedOption?.type === 'semi_finished';

                return {
                    item_type: ing.item_type, // 'raw_material' (UI label for both physical inputs)

                    // IF it's a raw_material type in UI, check if it's actually a SemiFlow Product
                    raw_material_id: (!isSemiFinished && ing.item_type === 'raw_material') ? ing.raw_material_id : null,
                    material_variant_id: (isSemiFinished && ing.item_type === 'raw_material') ? ing.raw_material_id : null,

                    quantity: ing.quantity,
                    unit_cost: ing.unit_cost,
                    description: ing.item_type !== 'raw_material' ? ing.name : null
                };
            });

            const payload = {
                name,
                product_variant_id: selectedProduct,
                yield_quantity: Number(yieldQty),
                manufacturing_markup: Number(markup),
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
                    <DialogTitle>{isEditing ? 'Edit Recipe' : 'New Production Recipe'}</DialogTitle>
                    <DialogDescription>
                        Define the Bill of Materials (BOM) including Raw Materials, Labor, and Overhead.
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
                                placeholder="e.g. Standard 20 inch Pillow"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Yields Product</label>
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Profit Markup (per unit)</label>
                            <input
                                type="number"
                                min="0"
                                className="input-field w-full px-3 py-2 border rounded-md border-emerald-200 bg-emerald-50/20"
                                placeholder="e.g. 10.00"
                                value={markup}
                                onChange={(e) => setMarkup(Number(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">Internal manufacturing profit added per unit produced</p>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-4 items-center">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-blue-900">Comprehensive Costing</h4>
                            <p className="text-xs text-blue-700">
                                Add Labor, Machine Usage, and Overheads directly in the BOM below.
                                These will be tracked in the Manufacturing Ledger.
                            </p>
                        </div>
                    </div>

                    {/* Ingredients Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-semibold text-sm">Bill of Materials (BOM)</h3>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddIngredient('raw_material')}
                                    className="h-8 text-xs font-medium"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Material
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddIngredient('service')}
                                    className="h-8 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Labor/Service
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddIngredient('overhead')}
                                    className="h-8 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Overhead
                                </Button>
                            </div>
                        </div>

                        {ingredients.length === 0 ? (
                            <div className="text-center py-8 bg-muted/30 rounded-lg text-muted-foreground text-sm border border-dashed">
                                Start by adding Raw Materials or Service Costs to your BOM.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {ingredients.map((ingredient, idx) => (
                                    <IngredientRow
                                        key={idx}
                                        index={idx}
                                        itemType={ingredient.item_type}
                                        rawMaterialId={ingredient.raw_material_id}
                                        name={ingredient.name}
                                        quantity={ingredient.quantity}
                                        unitCost={ingredient.unit_cost}
                                        options={ingredientOptions || []}
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
                        {isPending ? 'Saving...' : (isEditing ? 'Update Recipe' : 'Create Recipe')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
