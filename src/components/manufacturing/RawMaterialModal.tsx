import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Factory, Loader2, Package, Plus, RotateCcw } from 'lucide-react';
import { RawMaterial, useCreateRawMaterial, useRestockRawMaterial } from '@/hooks/useManufacturing';

interface RawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: RawMaterial[];
}

type Mode = 'restock' | 'create';

export function RawMaterialModal({ isOpen, onClose, materials }: RawMaterialModalProps) {
  const [mode, setMode] = useState<Mode>('restock');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [restockQuantity, setRestockQuantity] = useState('0');
  const [restockCost, setRestockCost] = useState('');
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: 'kg',
    unit_cost: '',
    quantity_in_stock: '0',
    reorder_level: '10',
    description: '',
  });

  const createMaterial = useCreateRawMaterial();
  const restockMaterial = useRestockRawMaterial();

  useEffect(() => {
    if (materials.length && !selectedMaterial) {
      setSelectedMaterial(materials[0].id);
    }
  }, [materials, selectedMaterial]);

  const resetState = () => {
    setMode('restock');
    setRestockQuantity('0');
    setRestockCost('');
    setNewMaterial({
      name: '',
      unit: 'kg',
      unit_cost: '',
      quantity_in_stock: '0',
      reorder_level: '10',
      description: '',
    });
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    await restockMaterial.mutateAsync({
      materialId: selectedMaterial,
      quantity: Number(restockQuantity || 0),
      unit_cost: restockCost ? Number(restockCost) : undefined,
    });
    resetState();
    onClose();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMaterial.mutateAsync({
      name: newMaterial.name,
      unit: newMaterial.unit,
      unit_cost: newMaterial.unit_cost ? Number(newMaterial.unit_cost) : undefined,
      quantity_in_stock: Number(newMaterial.quantity_in_stock || 0),
      reorder_level: Number(newMaterial.reorder_level || 0),
      description: newMaterial.description || undefined,
    });
    resetState();
    onClose();
  };

  const currentMaterial = materials.find(m => m.id === selectedMaterial);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Raw Materials
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('restock')}
            className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${mode === 'restock' ? 'border-primary text-primary bg-primary/10' : 'border-border text-foreground hover:bg-muted'}`}
          >
            Restock
          </button>
          <button
            onClick={() => setMode('create')}
            className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${mode === 'create' ? 'border-primary text-primary bg-primary/10' : 'border-border text-foreground hover:bg-muted'}`}
          >
            Add Material
          </button>
        </div>

        {mode === 'restock' ? (
          <form onSubmit={handleRestock} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Material</label>
              <select
                required
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="input-field"
              >
                <option value="">Select material</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>{material.name}</option>
                ))}
              </select>
              {currentMaterial && (
                <p className="text-xs text-muted-foreground">
                  Current stock: {currentMaterial.quantity_in_stock} {currentMaterial.unit} • Reorder at {currentMaterial.reorder_level}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity to add</label>
                <input
                  required
                  type="number"
                  min={0}
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit cost (optional)</label>
                <input
                  type="number"
                  min={0}
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={restockMaterial.isPending}>
                {restockMaterial.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Update Stock
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  required
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. Sugar"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <input
                  required
                  value={newMaterial.unit}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, unit: e.target.value }))}
                  className="input-field"
                  placeholder="kg, L, pcs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit cost</label>
                <input
                  type="number"
                  min={0}
                  value={newMaterial.unit_cost}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, unit_cost: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Initial stock</label>
                <input
                  type="number"
                  min={0}
                  value={newMaterial.quantity_in_stock}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, quantity_in_stock: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reorder level</label>
                <input
                  type="number"
                  min={0}
                  value={newMaterial.reorder_level}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, reorder_level: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={newMaterial.description}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
                className="input-field min-h-[80px]"
                placeholder="Supplier, quality, notes..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={createMaterial.isPending}>
                {createMaterial.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Material
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 rounded-lg bg-muted/50 border border-border px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
          <Factory className="w-3 h-3" />
          Keep materials updated to unlock accurate production costing and alerts.
        </div>
      </DialogContent>
    </Dialog>
  );
}
