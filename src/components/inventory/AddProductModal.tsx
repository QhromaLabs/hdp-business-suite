import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCategories, useCreateProduct, useUpdateProduct, useCreateVariant, useAddStock } from '@/hooks/useProducts';
import { Loader2, Plus, Package, Barcode, Wallet, Tag, Upload, X, Image as ImageIcon, PlusCircle, MinusCircle, Wand2, ChevronDown, Folder } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit?: any;
}

export function AddProductModal({ isOpen, onClose, productToEdit }: AddProductModalProps) {
    const { data: categories = [] } = useCategories();
    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();
    const createVariant = useCreateVariant();
    const addStock = useAddStock();

    const [isLoading, setIsLoading] = useState(false);
    const [isCategoryTreeOpen, setIsCategoryTreeOpen] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category_id: '',
        variant_id: '',
        variant_name: 'Standard',
        sku: '',
        barcode: '',
        cost_price: '',
        price: '',
        initial_stock: '0',
        warehouse_location: 'Main Warehouse',
        weight: ''
    });

    useEffect(() => {
        if (productToEdit && isOpen) {
            const variant = productToEdit.variant || (productToEdit.variants ? productToEdit.variants[0] : productToEdit);
            const product = variant?.product || productToEdit.product || productToEdit;

            setFormData({
                name: product?.name || '',
                description: product?.description || '',
                category_id: product?.category_id || '',
                variant_id: variant?.id || '',
                variant_name: variant?.variant_name || 'Standard',
                sku: variant?.sku || '',
                barcode: variant?.barcode || '',
                cost_price: String(variant?.cost_price || product?.cost_price || ''),
                price: String(variant?.price || product?.base_price || ''),
                initial_stock: String(productToEdit.quantity || '0'),
                warehouse_location: productToEdit.warehouse_location || 'Main Warehouse',
                weight: String(variant?.weight || '0')
            });

            if (product?.image_url) {
                setImagePreview(product.image_url);
            } else {
                setImagePreview(null);
            }

            if (product?.attributes) {
                const attrArray = Object.entries(product.attributes).map(([key, value]) => ({
                    key,
                    value: String(value)
                }));
                setAttributes(attrArray);
            } else {
                setAttributes([]);
            }
        } else if (!isOpen) {
            resetForm();
        }
    }, [productToEdit, isOpen]);

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            category_id: '',
            variant_id: '',
            variant_name: 'Standard',
            sku: '',
            barcode: '',
            cost_price: '',
            price: '',
            initial_stock: '0',
            warehouse_location: 'Main Warehouse',
            weight: ''
        });
        setImageFile(null);
        setImagePreview(null);
        setAttributes([]);
        setIsCategoryTreeOpen(false);
    };

    const handleAddAttribute = () => {
        setAttributes([...attributes, { key: '', value: '' }]);
    };

    const handleRemoveAttribute = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

    const handleAttributeChange = (index: number, field: 'key' | 'value', value: string) => {
        const newAttrs = [...attributes];
        newAttrs[index][field] = value;
        setAttributes(newAttrs);
    };

    const handleGenerateSku = () => {
        if (!formData.name) {
            toast.error('Please enter a product name first');
            return;
        }

        const cleaned = formData.name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
        const parts = cleaned.split(/\s+/).filter(Boolean);
        const abbreviation = parts.length > 1
            ? parts.slice(0, 3).map(p => p[0]).join('')
            : cleaned.slice(0, 3);
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const sku = `${abbreviation || 'SKU'}-${randomDigits}`;

        setFormData({ ...formData, sku });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const attrObject = attributes.reduce((acc, curr) => {
                if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
                return acc;
            }, {} as Record<string, any>);

            let uploadedImageUrl = imagePreview;

            // 1. Upload image first if a new file is selected
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `products/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, imageFile);

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw new Error('Failed to upload image');
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(filePath);

                uploadedImageUrl = publicUrl;
            }

            let product;
            if (productToEdit) {
                const productData = productToEdit.variant?.product || productToEdit;
                product = await updateProduct.mutateAsync({
                    id: productData.id,
                    name: formData.name,
                    description: formData.description,
                    category_id: formData.category_id || null,
                    base_price: Number(formData.price),
                    cost_price: Number(formData.cost_price),
                    image_url: uploadedImageUrl,
                    attributes: attrObject
                });
            } else {
                product = await createProduct.mutateAsync({
                    name: formData.name,
                    description: formData.description,
                    category_id: formData.category_id || undefined,
                    base_price: Number(formData.price),
                    cost_price: Number(formData.cost_price),
                    image_url: uploadedImageUrl,
                    attributes: attrObject
                });
            }

            if (productToEdit) {
                const variantId = formData.variant_id;
                if (variantId) {
                    await supabase
                        .from('product_variants')
                        .update({
                            variant_name: formData.variant_name,
                            sku: formData.sku,
                            barcode: formData.barcode || null,
                            price: Number(formData.price),
                            cost_price: Number(formData.cost_price),
                            weight: Number(formData.weight) || 0,
                        })
                        .eq('id', variantId);

                    if (formData.initial_stock !== String(productToEdit.quantity)) {
                        await addStock.mutateAsync({
                            variant_id: variantId,
                            quantity: Number(formData.initial_stock) - (productToEdit.quantity || 0),
                            warehouse_location: formData.warehouse_location,
                            silent: true,
                        });
                    }
                }
            } else {
                const variant = await createVariant.mutateAsync({
                    product_id: product.id,
                    variant_name: formData.variant_name,
                    sku: formData.sku,
                    barcode: formData.barcode || null,
                    price: Number(formData.price),
                    cost_price: Number(formData.cost_price),
                    size: null,
                    color: null,
                    reorder_level: 10,
                    weight: Number(formData.weight) || 0,
                });

                await addStock.mutateAsync({
                    variant_id: variant.id,
                    quantity: Number(formData.initial_stock) || 0,
                    warehouse_location: formData.warehouse_location,
                    silent: true,
                });
            }

            onClose();
            resetForm();
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Error saving product data');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
                <DialogHeader>
                    <DialogTitle>{productToEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Product Image
                        </label>
                        {imagePreview ? (
                            <div className="relative">
                                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-border" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImageFile(null);
                                        setImagePreview(null);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                <span className="text-sm text-muted-foreground">Click to upload image</span>
                                <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setImageFile(file);
                                            const reader = new FileReader();
                                            reader.onloadend = () => setImagePreview(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Product Name</label>
                            <div className="relative">
                                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Premium Soda"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 relative">
                            <label className="text-sm font-medium">Category</label>
                            <div
                                onClick={() => setIsCategoryTreeOpen(!isCategoryTreeOpen)}
                                className="input-field cursor-pointer flex items-center justify-between"
                            >
                                <span className={!formData.category_id ? 'text-muted-foreground' : ''}>
                                    {formData.category_id
                                        ? categories.find(c => c.id === formData.category_id)?.name || 'Select Category'
                                        : 'Select Category'}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryTreeOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isCategoryTreeOpen && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2">
                                    {(() => {
                                        const renderTree = (cats: any[], parentId: string | null = null, level = 0): React.ReactNode[] => {
                                            return cats
                                                .filter(c => c.parent_id === parentId)
                                                .map(cat => (
                                                    <div key={cat.id}>
                                                        <div
                                                            onClick={() => {
                                                                setFormData({ ...formData, category_id: cat.id });
                                                                setIsCategoryTreeOpen(false);
                                                            }}
                                                            className={`flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer text-sm mb-1 ${formData.category_id === cat.id ? 'bg-primary/10 text-primary font-medium' : ''}`}
                                                            style={{ marginLeft: `${level * 1.5}rem` }}
                                                        >
                                                            <Folder className={`w-4 h-4 ${formData.category_id === cat.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                                            {cat.name}
                                                        </div>
                                                        {renderTree(cats, cat.id, level + 1)}
                                                    </div>
                                                ));
                                        };
                                        const tree = renderTree(categories);
                                        return tree.length > 0 ? tree : <p className="text-xs text-muted-foreground p-2">No categories available</p>;
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            placeholder="Product description..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="input-field min-h-[80px]"
                        />
                    </div>

                    {/* Attributes Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                Product Attributes
                            </label>
                            <button
                                type="button"
                                onClick={handleAddAttribute}
                                className="text-sm text-primary flex items-center gap-1 hover:underline"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Add Attribute
                            </button>
                        </div>

                        <div className="space-y-3">
                            {attributes.map((attr, index) => (
                                <div key={index} className="flex gap-3 items-start">
                                    <div className="flex-1">
                                        <input
                                            placeholder="Label (e.g. Brand)"
                                            value={attr.key}
                                            onChange={(e) => handleAttributeChange(index, 'key', e.target.value)}
                                            className="input-field"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            placeholder="Value (e.g. Coca Cola)"
                                            value={attr.value}
                                            onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                                            className="input-field"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAttribute(index)}
                                        className="mt-2 text-destructive hover:text-destructive/80"
                                    >
                                        <MinusCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            {attributes.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">No custom attributes added yet.</p>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-border pt-6 mt-6">
                        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Default Variant & Stock
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">SKU</label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. BEV-001"
                                        value={formData.sku}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        className="input-field"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGenerateSku}
                                        className="p-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                                        title="Generate SKU from name"
                                    >
                                        <Wand2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Barcode (GTIN)</label>
                                <div className="relative">
                                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Optional"
                                        value={formData.barcode}
                                        onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Cost Price (KES)</label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        required
                                        type="number"
                                        placeholder="0"
                                        value={formData.cost_price}
                                        onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Weight (kg)</label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        step="0.01"
                                        value={formData.weight}
                                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Selling Price (KES)</label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        required
                                        type="number"
                                        placeholder="0"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Initial Stock</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={formData.initial_stock}
                                    onChange={e => setFormData({ ...formData, initial_stock: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Warehouse Location</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Warehouse A"
                                    value={formData.warehouse_location}
                                    onChange={e => setFormData({ ...formData, warehouse_location: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary min-w-[120px]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    {productToEdit ? 'Update Product' : 'Save Product'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
