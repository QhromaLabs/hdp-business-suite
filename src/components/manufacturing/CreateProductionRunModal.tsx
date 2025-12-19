import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Package, Play, Settings, StickyNote } from 'lucide-react';
import { useCreateProductionRun, Machine } from '@/hooks/useManufacturing';
import { useProductVariants } from '@/hooks/useProducts';

interface CreateProductionRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
}

export function CreateProductionRunModal({ isOpen, onClose, machines }: CreateProductionRunModalProps) {
  const { data: variants = [], isLoading: variantsLoading } = useProductVariants();
  const createRun = useCreateProductionRun();

  const defaultDate = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localISOTime = new Date(now.getTime() - offset * 60000).toISOString().slice(0, 16);
    return localISOTime;
  }, []);

  const [formData, setFormData] = useState({
    product_id: '',
    variant_id: '',
    machine_id: '',
    planned_quantity: '0',
    start_date: defaultDate,
    notes: '',
  });

  useEffect(() => {
    if (variants.length && !formData.variant_id) {
      const firstVariant = variants[0] as any;
      setFormData(prev => ({
        ...prev,
        variant_id: firstVariant.id,
        product_id: firstVariant.product_id,
      }));
    }
  }, [variants, formData.variant_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedVariant = variants.find((v: any) => v.id === formData.variant_id) as any;
    const productId = formData.product_id || selectedVariant?.product_id;

    await createRun.mutateAsync({
      product_id: productId,
      variant_id: formData.variant_id || undefined,
      machine_id: formData.machine_id || undefined,
      planned_quantity: Number(formData.planned_quantity || 0),
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
      notes: formData.notes || undefined,
    });

    setFormData({
      product_id: '',
      variant_id: '',
      machine_id: '',
      planned_quantity: '0',
      start_date: defaultDate,
      notes: '',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Start Production Run
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Variant</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  required
                  value={formData.variant_id}
                  onChange={(e) => {
                    const variantId = e.target.value;
                    const variant: any = variants.find((v: any) => v.id === variantId);
                    setFormData(prev => ({
                      ...prev,
                      variant_id: variantId,
                      product_id: variant?.product_id || '',
                    }));
                  }}
                  className="input-field pl-10"
                >
                  <option value="">Select variant</option>
                  {variants.map((variant: any) => (
                    <option key={variant.id} value={variant.id}>
                      {(variant.product?.name || 'Product') + ' • ' + variant.variant_name}
                    </option>
                  ))}
                </select>
              </div>
              {variantsLoading && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading variants
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Machine</label>
              <div className="relative">
                <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  value={formData.machine_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, machine_id: e.target.value }))}
                  className="input-field pl-10"
                >
                  <option value="">Unassigned</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>{machine.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Planned Quantity</label>
              <input
                required
                type="number"
                min={1}
                value={formData.planned_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, planned_quantity: e.target.value }))}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Instructions, quality targets, etc."
              className="input-field min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary min-w-[140px]" disabled={createRun.isPending}>
              {createRun.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Start Run
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
