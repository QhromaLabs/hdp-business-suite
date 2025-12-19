
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Package, ArrowRight, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { useCategories } from '@/hooks/useProducts';

interface CategoryDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: any;
    products: any[];
}

export function CategoryDetailsModal({ isOpen, onClose, category, products }: CategoryDetailsModalProps) {
    const queryClient = useQueryClient();
    const { data: categories = [] } = useCategories();
    const [movingProductId, setMovingProductId] = useState<string | null>(null);

    const moveProduct = useMutation({
        mutationFn: async ({ productId, newCategoryId }: { productId: string; newCategoryId: string }) => {
            const { error } = await supabase
                .from('products')
                .update({ category_id: newCategoryId })
                .eq('id', productId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product moved');
            setMovingProductId(null);
        },
        onError: (err: any) => {
            toast.error('Failed: ' + err.message);
        }
    });

    const removeFromCategory = useMutation({
        mutationFn: async (productId: string) => {
            const { error } = await supabase
                .from('products')
                .update({ category_id: null })
                .eq('id', productId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product removed from category');
        },
        onError: (err: any) => {
            toast.error('Failed: ' + err.message);
        }
    });

    if (!category) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        {category.name}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">{products.length} products in this category</p>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {products.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p>No products in this category yet</p>
                        </div>
                    ) : (
                        products.map(product => (
                            <div key={product.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                                <div>
                                    <p className="font-medium text-foreground">{product.name}</p>
                                    <p className="text-sm text-muted-foreground">{product.description || 'No description'}</p>
                                </div>
                                <div className="flex gap-2">
                                    {movingProductId === product.id ? (
                                        <select
                                            autoFocus
                                            className="input-field text-sm"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    moveProduct.mutate({ productId: product.id, newCategoryId: e.target.value });
                                                }
                                            }}
                                            onBlur={() => setMovingProductId(null)}
                                        >
                                            <option value="">Select category...</option>
                                            {categories.filter(c => c.id !== category.id).map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setMovingProductId(product.id)}
                                                className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                                                title="Move to another category"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Remove from category?')) {
                                                        removeFromCategory.mutate(product.id);
                                                    }
                                                }}
                                                className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
                                                title="Remove from category"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
