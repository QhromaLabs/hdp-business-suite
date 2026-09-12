import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateBatch, useUpdateBatch, useDeleteBatch, Recipe, ProductionBatch } from '@/hooks/useManufacturing';
import { toast } from 'sonner';

interface CreateBatchModalProps {
    onClose: () => void;
    recipes: Recipe[];
    batchToEdit?: ProductionBatch;
}

export default function CreateBatchModal({ onClose, recipes, batchToEdit }: CreateBatchModalProps) {
    const createBatch = useCreateBatch();
    const updateBatch = useUpdateBatch();
    const deleteBatch = useDeleteBatch();
    const isEditing = !!batchToEdit;

    const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (batchToEdit) {
            setSelectedRecipeId(batchToEdit.recipe_id);
            setQuantity(batchToEdit.quantity);
            setNotes(batchToEdit.notes || '');
        }
    }, [batchToEdit]);

    const selectedRecipe = useMemo(() =>
        recipes.find(r => r.id === selectedRecipeId),
        [recipes, selectedRecipeId]);

    const requiredMaterials = useMemo(() => {
        if (!selectedRecipe || !selectedRecipe.items) return [];
        return selectedRecipe.items.map(item => {
            // Support both new raw_materials and old product_variants systems
            const name = item.raw_material?.name || item.material_variant?.product?.name || 'Unknown';
            const unit_cost = item.raw_material?.unit_cost || item.material_variant?.cost_price || 0;

            return {
                name,
                required: item.quantity * quantity,
                unit_cost
            };
        });
    }, [selectedRecipe, quantity]);

    const costBreakdown = useMemo(() => {
        if (!selectedRecipe) return { materials: 0, labor: 0, machine: 0, total: 0 };

        const materials = requiredMaterials.reduce((sum, item) => sum + (item.required * item.unit_cost), 0);
        // quantity is "Number of Batches" (Multiples of Yield)
        const labor = (selectedRecipe.labor_cost || 0) * quantity;
        const machine = (selectedRecipe.machine_cost || 0) * quantity;

        return {
            materials,
            labor,
            machine,
            total: materials + labor + machine
        };
    }, [requiredMaterials, selectedRecipe, quantity]);

    const handleSubmit = async () => {
        if (!selectedRecipeId || quantity <= 0) {
            toast.error('Please select a recipe and valid quantity');
            return;
        }

        try {
            if (isEditing && batchToEdit) {
                await updateBatch.mutateAsync({
                    id: batchToEdit.id,
                    quantity: Number(quantity),
                    notes
                });
            } else {
                await createBatch.mutateAsync({
                    recipe_id: selectedRecipeId,
                    quantity: Number(quantity),
                    notes
                });
            }
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async () => {
        if (!batchToEdit) return;

        if (!confirm('Are you sure you want to delete this production batch? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteBatch.mutateAsync(batchToEdit.id);
            toast.success('Batch deleted successfully');
            onClose();
        } catch (e) {
            console.error(e);
            toast.error('Failed to delete batch');
        }
    };

    const isPending = createBatch.isPending || updateBatch.isPending || deleteBatch.isPending;

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Production Batch' : 'Start Production Batch'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Update the quantity or notes for this planned batch.' : 'Schedule a new production run by selecting a recipe and specifying the quantity.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Left Column: Inputs */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Recipe</label>
                            <select
                                className="input-field w-full disabled:opacity-50"
                                value={selectedRecipeId}
                                onChange={(e) => setSelectedRecipeId(e.target.value)}
                                disabled={isEditing}
                            >
                                <option value="">Choose a recipe...</option>
                                {recipes.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.name} (Yields {r.yield_quantity})
                                    </option>
                                ))}
                            </select>
                            {isEditing && <p className="text-xs text-muted-foreground">Recipe cannot be changed for existing batch.</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Batch Quantity (Multiples of Yield)</label>
                            <input
                                type="number"
                                min="1"
                                className="input-field w-full"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                            />
                            {selectedRecipe && (
                                <p className="text-primary text-sm font-medium">
                                    Total Output: {quantity * selectedRecipe.yield_quantity} units
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Production Notes</label>
                            <textarea
                                className="input-field w-full min-h-[120px]"
                                placeholder="Optional notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Right Column: Estimates & Costs */}
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50 h-full">
                        <h4 className="text-sm font-semibold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            Production Preview
                        </h4>

                        {selectedRecipe ? (
                            <>
                                <div className="space-y-3 mb-6">
                                    <h5 className="text-xs font-semibold text-foreground">Required Materials</h5>
                                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-thin">
                                        {requiredMaterials.map((mat, idx) => (
                                            <div key={idx} className="flex justify-between text-sm py-1 border-b border-border/10 last:border-0">
                                                <span className="text-muted-foreground">{mat.name}</span>
                                                <span className="font-mono font-medium">{mat.required.toLocaleString()} units</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-border/50 pt-4 space-y-2 text-sm mt-auto">
                                    <h5 className="text-xs font-semibold text-foreground mb-2">Cost Analysis</h5>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Materials</span>
                                        <span>KES {costBreakdown.materials.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Labor</span>
                                        <span>KES {costBreakdown.labor.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Machine/Utilities</span>
                                        <span>KES {costBreakdown.machine.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border/30 mt-2 text-base">
                                        <span>Est. Total Cost</span>
                                        <span>KES {costBreakdown.total.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                                        <span>Cost per Unit</span>
                                        <span>KES {(quantity > 0 ? costBreakdown.total / (quantity * selectedRecipe.yield_quantity) : 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-50">
                                <p className="text-sm font-medium">Select a recipe to view requirements and cost estimates.</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex justify-between">
                    <div>
                        {isEditing && batchToEdit && (
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isPending}
                            >
                                Delete Batch
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={isPending || !selectedRecipeId}
                        >
                            {isPending ? 'Saving...' : (isEditing ? 'Update Batch' : 'Start Production')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
