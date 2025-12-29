import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRawMaterial, useUpdateRawMaterial, useRestockRawMaterial } from '@/hooks/useManufacturing';

interface RawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'restock';
  initialData?: any;
}

export function RawMaterialModal({ isOpen, onClose, mode, initialData }: RawMaterialModalProps) {
  const createMutation = useCreateRawMaterial();
  const updateMutation = useUpdateRawMaterial();
  const restockMutation = useRestockRawMaterial();

  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    unit_cost: 0,
    quantity_in_stock: 0,
    reorder_level: 10,
    description: ''
  });

  // Restock specific state
  const [restockQty, setRestockQty] = useState(0);
  const [restockCost, setRestockCost] = useState(0);

  useEffect(() => {
    if (initialData && (mode === 'edit' || mode === 'restock')) {
      setFormData({
        name: initialData.name,
        unit: initialData.unit,
        unit_cost: initialData.unit_cost,
        quantity_in_stock: initialData.quantity_in_stock,
        reorder_level: initialData.reorder_level || 0,
        description: initialData.description || ''
      });
      if (mode === 'restock') {
        setRestockCost(initialData.unit_cost); // Default to current cost
      }
    } else {
      // Reset for create
      setFormData({
        name: '',
        unit: 'kg',
        unit_cost: 0,
        quantity_in_stock: 0,
        reorder_level: 10,
        description: ''
      });
    }
  }, [initialData, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(formData);
      } else if (mode === 'edit') {
        await updateMutation.mutateAsync({ ...formData, id: initialData.id });
      } else if (mode === 'restock') {
        await restockMutation.mutateAsync({
          id: initialData.id,
          quantity: restockQty,
          cost: restockCost
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const getTitle = () => {
    if (mode === 'edit') return 'Edit Raw Material';
    if (mode === 'restock') return `Restock ${initialData?.name || 'Material'}`;
    return 'New Raw Material'; // Default for create or undefined
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {mode !== 'restock' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Material Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit (e.g. kg, m, l)</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_cost">Standard Unit Cost</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    min="0"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) }))}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qty">Initial Stock</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="0"
                    value={formData.quantity_in_stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity_in_stock: parseFloat(e.target.value) }))}
                    required
                    disabled={mode === 'edit'} // Don't edit stock directly here, use restock
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorder">Reorder Level</Label>
                  <Input
                    id="reorder"
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, reorder_level: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </>
          )}

          {mode === 'restock' && (
            <>
              <div className="p-4 bg-muted rounded-md mb-4 text-sm">
                <p>Current Stock: <b>{formData.quantity_in_stock} {formData.unit}</b></p>
                <p>Current Avg Cost: <b>KES {formData.unit_cost}</b></p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="restockQty">Quantity Adding</Label>
                <Input
                  id="restockQty"
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseFloat(e.target.value))}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restockCost">Unit Cost for this Batch</Label>
                <Input
                  id="restockCost"
                  type="number"
                  min="0"
                  value={restockCost}
                  onChange={(e) => setRestockCost(parseFloat(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">This will update the weighted average cost.</p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">
              {(mode === 'create' || !mode) && 'Create Material'}
              {mode === 'edit' && 'Save Changes'}
              {mode === 'restock' && 'Confirm Restock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
