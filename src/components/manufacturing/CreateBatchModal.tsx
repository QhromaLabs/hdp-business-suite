import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateBatch, Recipe } from '@/hooks/useManufacturing';
import { toast } from 'sonner';

interface CreateBatchModalProps {
    onClose: () => void;
    recipes: Recipe[];
}

export default function CreateBatchModal({ onClose, recipes }: CreateBatchModalProps) {
    const createBatch = useCreateBatch();

    const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState('');

    const selectedRecipe = useMemo(() =>
        recipes.find(r => r.id === selectedRecipeId),
        [recipes, selectedRecipeId]);

    const requiredMaterials = useMemo(() => {
        if (!selectedRecipe || !selectedRecipe.items) return [];
        return selectedRecipe.items.map(item => ({
            name: item.material_variant?.product?.name || 'Unknown',
            required: item.quantity * quantity,
            unit_cost: item.material_variant?.unit_cost || 0
        }));
    }, [selectedRecipe, quantity]);

    const estimatedCost = useMemo(() =>
        requiredMaterials.reduce((sum, item) => sum + (item.required * item.unit_cost), 0),
        [requiredMaterials]);

    const handleSubmit = async () => {
        if (!selectedRecipeId || quantity <= 0) {
            toast.error('Please select a recipe and valid quantity');
            return;
        }

        await createBatch.mutateAsync({
            recipe_id: selectedRecipeId,
            quantity: Number(quantity),
            notes
        });

        onClose();
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Start Production Batch</DialogTitle>
                    <DialogDescription>
                        Schedule a new production run by selecting a recipe and specifying the quantity.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Recipe</label>
                        <select
                            className="input-field w-full"
                            value={selectedRecipeId}
                            onChange={(e) => setSelectedRecipeId(e.target.value)}
                        >
                            <option value="">Choose a recipe...</option>
                            {recipes.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.name} (Yields {r.yield_quantity})
                                </option>
                            ))}
                        </select>
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
                            <p className="text-green-600 text-sm font-medium">
                                Total Output: {quantity * selectedRecipe.yield_quantity} units
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Production Notes</label>
                        <textarea
                            className="input-field w-full min-h-[80px]"
                            placeholder="Optional notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Requirements Preview */}
                    {selectedRecipe && (
                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50 mt-4">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Required Raw Materials</h4>
                            <div className="space-y-2 mb-3">
                                {requiredMaterials.map((mat, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span>{mat.name}</span>
                                        <span className="font-mono">{mat.required.toLocaleString()} units</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-border/50 pt-2 flex justify-between font-bold text-sm">
                                <span>Est. Material Cost</span>
                                <span>KES {estimatedCost.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        disabled={createBatch.isPending || !selectedRecipeId}
                    >
                        {createBatch.isPending ? 'Starting...' : 'Start Production'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
