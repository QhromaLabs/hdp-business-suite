import { useState } from 'react';
import { useProductionBatches, useRecipes, useMachines, useRawMaterials, useDeleteRawMaterial, useUpdateBatchStatus, useDeleteBatch } from '@/hooks/useManufacturing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Pause, Trash2, Edit, Wrench, MoreHorizontal, ChefHat, Box, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { CreateRecipeModal } from '@/components/manufacturing/CreateRecipeModal';
import { CreateBatchModal } from '@/components/manufacturing/CreateBatchModal';
import { RegisterMachineModal } from '@/components/manufacturing/RegisterMachineModal';
import { RawMaterialModal } from '@/components/manufacturing/RawMaterialModal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Manufacturing() {
    // Queries
    const { data: batches } = useProductionBatches();
    const { data: recipes } = useRecipes();
    const { data: machines } = useMachines();
    const { data: rawMaterials } = useRawMaterials();

    // Mutations
    const deleteRawMaterial = useDeleteRawMaterial();
    const updateBatchStatus = useUpdateBatchStatus();
    const deleteBatch = useDeleteBatch();

    // Modals State
    const [showCreateRecipe, setShowCreateRecipe] = useState(false);
    const [showCreateBatch, setShowCreateBatch] = useState(false);
    const [showRegisterMachine, setShowRegisterMachine] = useState(false);

    // Edit/Context State
    const [recipeToEdit, setRecipeToEdit] = useState<any>(null);
    const [batchToEdit, setBatchToEdit] = useState<any>(null);
    const [rawMaterialModal, setRawMaterialModal] = useState<{ open: boolean; type: 'create' | 'restock' | 'edit'; data?: any }>({ open: false, type: 'create' });
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'batch' | 'raw_material'; name: string } | null>(null);

    // Handlers
    const handleEditRecipe = (recipe: any) => {
        setRecipeToEdit(recipe);
        setShowCreateRecipe(true);
    };

    const handleBatchAction = async (id: string, action: 'start' | 'pause' | 'resume' | 'cancel') => {
        let status: 'planned' | 'in_progress' | 'paused' | 'completed' | 'cancelled' = 'planned';
        switch (action) {
            case 'start': status = 'in_progress'; break;
            case 'pause': status = 'paused'; break;
            case 'resume': status = 'in_progress'; break;
            case 'cancel': status = 'cancelled'; break;
        }
        try {
            await updateBatchStatus.mutateAsync({ id, status });
        } catch (e) {
            // Toast handled in hook
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            if (deleteConfirm.type === 'batch') {
                await deleteBatch.mutateAsync(deleteConfirm.id);
            } else {
                await deleteRawMaterial.mutateAsync(deleteConfirm.id);
            }
            setDeleteConfirm(null);
        } catch (e) {
            // Toast handled in hook
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse';
            case 'paused': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'planned': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Output</CardTitle>
                        <Box className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1000 units</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{batches?.filter(b => b.status === 'in_progress').length || 0} / {batches?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recipes</CardTitle>
                        <ChefHat className="h-4 w-4 text-orange-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recipes?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card onClick={() => setShowRegisterMachine(true)} className="cursor-pointer hover:bg-slate-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Machine Depreciation</CardTitle>
                        <Wrench className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Ksh {machines?.reduce((acc, m) => acc + (m.initial_cost - (m.current_value || 0)), 0).toLocaleString() || '0'}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Active Production (Batches) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Active Production</h2>
                            <p className="text-sm text-muted-foreground">{batches?.filter(b => b.status === 'in_progress').length || 0} runs currently on the floor</p>
                        </div>
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setBatchToEdit(null); setShowCreateBatch(true); }}>
                            <Plus className="w-4 h-4 mr-2" /> Start Batch
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {batches?.slice(0, 5).map(batch => (
                            <Card key={batch.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
                                                {batch.recipe?.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">{batch.recipe?.name}</h3>
                                                <p className="text-orange-500 text-sm font-medium">{batch.recipe?.product_variant?.product?.name}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={getStatusColor(batch.status)}>
                                            {batch.status.toUpperCase()}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 mb-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Planned Qty</p>
                                            <p className="text-xl font-bold">{batch.quantity}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Est Yield</p>
                                            <p className="text-xl font-bold">{batch.quantity * (batch.recipe?.yield_quantity || 1)}</p>
                                        </div>
                                    </div>

                                    {/* Batch Actions & Edit Button */}
                                    <div className="flex justify-end items-center gap-2 pt-2 border-t mt-2">
                                        {/* Status Toggles */}
                                        {batch.status === 'planned' && (
                                            <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleBatchAction(batch.id, 'start')}>
                                                <Play className="w-4 h-4 mr-1" /> Start
                                            </Button>
                                        )}
                                        {batch.status === 'in_progress' && (
                                            <Button size="sm" variant="ghost" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleBatchAction(batch.id, 'pause')}>
                                                <Pause className="w-4 h-4 mr-1" /> Pause
                                            </Button>
                                        )}
                                        {batch.status === 'paused' && (
                                            <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleBatchAction(batch.id, 'resume')}>
                                                <Play className="w-4 h-4 mr-1" /> Resume
                                            </Button>
                                        )}

                                        {/* Edit Button - Explicitly Requested */}
                                        {batch.status !== 'completed' && batch.status !== 'cancelled' && (
                                            <Button size="sm" variant="outline" className="h-8 gap-1 ml-2 border-slate-300" onClick={() => { setBatchToEdit(batch); setShowCreateBatch(true); }}>
                                                <Edit className="w-3.5 h-3.5" /> Edit
                                            </Button>
                                        )}

                                        {/* Delete Button */}
                                        {batch.status !== 'completed' && batch.status !== 'in_progress' && (
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => setDeleteConfirm({ id: batch.id, type: 'batch', name: `Batch for ${batch.recipe?.name}` })}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {(!batches || batches.length === 0) && (
                            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">No active production runs.</p>
                                <Button variant="link" onClick={() => setShowCreateBatch(true)}>Start one now</Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Raw Materials & Recipes */}
                <div className="space-y-8">
                    {/* Raw Materials - Card View as requested */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Raw Materials</h2>
                                <p className="text-sm text-muted-foreground">{rawMaterials?.length || 0} items in inventory</p>
                            </div>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setRawMaterialModal({ open: true, type: 'create' })}>
                                <Plus className="w-4 h-4 mr-2" /> Add Raw Material
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {rawMaterials?.map(rm => (
                                <div key={rm.id} className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow group relative">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-sm text-gray-900">{rm.name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{rm.quantity_in_stock} {rm.unit}</p>
                                        </div>
                                        {/* Edit Buttons - Visible Outline */}
                                        <div className="flex gap-1 ml-2">
                                            <Button size="icon" variant="outline" className="h-7 w-7 border-slate-200" onClick={() => setRawMaterialModal({ open: true, type: 'edit', data: rm })} title="Edit Material">
                                                <Edit className="w-3.5 h-3.5 text-blue-600" />
                                            </Button>
                                            <Button size="icon" variant="outline" className="h-7 w-7 border-slate-200 hover:bg-red-50 hover:border-red-200" onClick={() => setDeleteConfirm({ id: rm.id, type: 'raw_material', name: rm.name })} title="Delete Material">
                                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recipes List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Recipes</h2>
                                <p className="text-sm text-muted-foreground">Manage product compositions</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setRecipeToEdit(null); setShowCreateRecipe(true); }}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {recipes?.map(recipe => (
                                <div key={recipe.id} className="bg-white border rounded-lg p-4 flex items-center justify-between hover:bg-slate-50 group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                            <ChefHat className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{recipe.name}</p>
                                            <p className="text-xs text-muted-foreground">Yields: {recipe.yield_quantity} units</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8" onClick={() => handleEditRecipe(recipe)}>
                                        <Edit className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Modals */}
            {showCreateRecipe && (
                <CreateRecipeModal onClose={() => setShowCreateRecipe(false)} recipeToEdit={recipeToEdit} />
            )}

            {showCreateBatch && (
                <CreateBatchModal onClose={() => setShowCreateBatch(false)} batchToEdit={batchToEdit} />
            )}

            {showRegisterMachine && (
                <RegisterMachineModal onClose={() => setShowRegisterMachine(false)} />
            )}

            {rawMaterialModal.open && (
                <RawMaterialModal
                    isOpen={rawMaterialModal.open}
                    mode={rawMaterialModal.type}
                    initialData={rawMaterialModal.data}
                    onClose={() => setRawMaterialModal({ open: false, type: 'create' })}
                />
            )}

            <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <b>{deleteConfirm?.name}</b>?
                            {deleteConfirm?.type === 'raw_material' && " This cannot be undone."}
                            {deleteConfirm?.type === 'batch' && " Only Delete if necessary."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
