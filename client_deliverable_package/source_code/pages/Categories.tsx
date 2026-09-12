
import { useEffect, useState } from 'react';
import { useCategories, useProducts } from '@/hooks/useProducts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Edit, Trash2, Folder, Save } from 'lucide-react';
import { toast } from 'sonner';
import { CategoryDetailsModal } from '@/components/categories/CategoryDetailsModal';
import { CardGridSkeleton, PageHeaderSkeleton } from '@/components/loading/PageSkeletons';
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Category {
    id: string;
    name: string;
    description: string | null;
    parent_id?: string | null;
}

export default function Categories() {
    const { data: categories = [], isLoading } = useCategories();
    const { data: products = [] } = useProducts();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
    const queryClient = useQueryClient();

    const deleteCategory = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('product_categories').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category deleted');
        },
        onError: (err: any) => {
            toast.error('Failed to delete: ' + err.message);
        }
    });

    const bulkCreate = useMutation({
        mutationFn: async (names: string[]) => {
            const payload = names.map(name => ({ name: name.trim(), description: null }));
            const { error } = await supabase.from('product_categories').insert(payload);
            if (error) throw error;
        },
        onSuccess: (_, names) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success(`Added ${names.length} categor${names.length === 1 ? 'y' : 'ies'}`);
            setBulkText('');
            setIsBulkModalOpen(false);
        },
        onError: (err: any) => {
            toast.error('Failed to add categories: ' + err.message);
        }
    });

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="space-y-6 animate-fade-in">
                <PageHeaderSkeleton actions={1} />
                <CardGridSkeleton cards={6} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Categories</h1>
                    <p className="text-muted-foreground mt-1">Manage product categories and organization</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="btn-secondary"
                    >
                        <Plus className="w-5 h-5" />
                        Bulk Add
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary"
                    >
                        <Plus className="w-5 h-5" />
                        Add Category
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map((category, idx) => {
                    const productCount = products.filter(p => p.category_id === category.id).length;
                    return (
                        <div
                            key={category.id}
                            onClick={() => setViewingCategory(category)}
                            className="group bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-slide-up cursor-pointer"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform">
                                        <Folder className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-foreground">{category.name}</h3>
                                        <p className="text-sm text-muted-foreground">{category.description || 'No description'}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {category.parent_id && categories.find(c => c.id === category.parent_id)?.name && (
                                                <span className="text-primary/70 font-medium">Under {categories.find(c => c.id === category.parent_id)?.name} • </span>
                                            )}
                                            {productCount} products
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCategory(category);
                                            setIsAddModalOpen(true);
                                        }}
                                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const productCount = products.filter(p => p.category_id === category.id).length;
                                            if (productCount > 0) {
                                                toast.error(`Cannot delete category "${category.name}" because it contains ${productCount} products. Please reassign or delete the products first.`);
                                                return;
                                            }
                                            if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
                                                deleteCategory.mutate(category.id);
                                            }
                                        }}
                                        className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredCategories.length === 0 && !isLoading && (
                    <div className="col-span-full py-12 text-center bg-card rounded-xl border border-border border-dashed">
                        <Folder className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No categories found</p>
                    </div>
                )}
            </div>

            <AddCategoryModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingCategory(null);
                }}
                categoryToEdit={editingCategory}
            />
            <CategoryDetailsModal
                isOpen={!!viewingCategory}
                onClose={() => setViewingCategory(null)}
                category={viewingCategory}
                products={products.filter(p => p.category_id === viewingCategory?.id)}
            />

            <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Bulk Add Categories</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Paste category names (one per line). We'll ignore duplicates and blanks.
                        </p>
                        <Textarea
                            rows={8}
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder={`Manufacturing\nMosquito Net\nCooking Pots\nWardrobes\nCarpets`}
                        />
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setIsBulkModalOpen(false)}
                                disabled={bulkCreate.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                disabled={bulkCreate.isPending}
                                onClick={() => {
                                    const existing = new Set(categories.map(c => c.name.trim().toLowerCase()));
                                    const names = bulkText
                                        .split('\n')
                                        .map(n => n.trim())
                                        .filter(Boolean)
                                        .filter((name, idx, arr) => arr.indexOf(name) === idx)
                                        .filter(name => !existing.has(name.toLowerCase()));

                                    if (names.length === 0) {
                                        toast.error('No new categories to add');
                                        return;
                                    }
                                    bulkCreate.mutate(names);
                                }}
                            >
                                {bulkCreate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Categories'}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}

function AddCategoryModal({ isOpen, onClose, categoryToEdit }: { isOpen: boolean; onClose: () => void; categoryToEdit: Category | null }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [parentId, setParentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { data: categories = [] } = useCategories();

    // Populate form when modal opens or selected category changes
    useEffect(() => {
        if (!isOpen) return;
        if (categoryToEdit) {
            setName(categoryToEdit.name);
            setDescription(categoryToEdit.description || '');
            setParentId(categoryToEdit.parent_id || null);
        } else {
            setName('');
            setDescription('');
            setParentId(null);
        }
    }, [categoryToEdit, isOpen]);

    const mutation = useMutation({
        mutationFn: async (vars: { id?: string, name: string, description: string, parent_id: string | null }) => {
            const payload = {
                name: vars.name,
                description: vars.description,
                parent_id: vars.parent_id
            };

            if (vars.id) {
                const { error } = await supabase.from('product_categories').update(payload).eq('id', vars.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('product_categories').insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success(categoryToEdit ? 'Category updated' : 'Category created');
            onClose();
            setName('');
            setDescription('');
            setParentId(null);
        },
        onError: (err: any) => {
            toast.error('Failed: ' + err.message);
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await mutation.mutateAsync({ id: categoryToEdit?.id, name, description, parent_id: parentId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{categoryToEdit ? 'Edit Category' : 'Add Category'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <input
                            required
                            className="input-field"
                            placeholder="e.g. Beverages"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            className="input-field min-h-[80px]"
                            placeholder="Optional description..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Parent Category</label>
                        <select
                            className="input-field"
                            value={parentId || ''}
                            onChange={e => setParentId(e.target.value || null)}
                        >
                            <option value="">None (Root Category)</option>
                            {categories
                                .filter(c => c.id !== categoryToEdit?.id)
                                .map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {categoryToEdit ? 'Update' : 'Save'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
