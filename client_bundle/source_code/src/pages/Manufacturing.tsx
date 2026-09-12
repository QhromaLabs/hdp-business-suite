import { useState } from 'react';
import {
  Factory,
  Package,
  Cog,
  TrendingUp,
  Plus,
  Play,
  Pause,
  Check,
  ChefHat,
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
  PackagePlus
} from 'lucide-react';
import {
  useProductionBatches,
  useRecipes,
  useMachines,
  useCompleteBatch,
  useUpdateMachine,
  useRawMaterials,
  useDeleteRawMaterial,
  useMonthlyProductionValue,
  useYearlyProductionValue,
  Recipe,
  ProductionBatch
} from '@/hooks/useManufacturing';
import { cn } from '@/lib/utils';
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';
import CreateBatchModal from '@/components/manufacturing/CreateBatchModal';
import CreateRecipeModal from '@/components/manufacturing/CreateRecipeModal';
import { RegisterMachineModal } from '@/components/manufacturing/RegisterMachineModal';
import { RawMaterialModal } from '@/components/manufacturing/RawMaterialModal';
import { ManufacturingLedger } from '@/components/manufacturing/ManufacturingLedger';
import { AddProductModal } from '@/components/inventory/AddProductModal';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function Manufacturing() {
  const { data: productionBatches = [], isLoading: batchesLoading } = useProductionBatches();
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const { data: machines = [], isLoading: machinesLoading } = useMachines();
  const { data: rawMaterials = [] } = useRawMaterials();
  const { data: monthlyProductionValue = 0 } = useMonthlyProductionValue();
  const { data: yearlyProductionValue = 0 } = useYearlyProductionValue();
  const completeBatch = useCompleteBatch();
  const deleteRawMaterial = useDeleteRawMaterial();

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [rawMaterialModal, setRawMaterialModal] = useState<{ open: boolean; type: 'create' | 'restock' | 'edit'; data?: any }>({ open: false, type: 'create' });
  const [view, setView] = useState<'operations' | 'ledger'>('operations');
  const [batchTab, setBatchTab] = useState<'active' | 'history'>('active');

  const [machineToEdit, setMachineToEdit] = useState<any>(null);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | undefined>();
  const [batchToEdit, setBatchToEdit] = useState<ProductionBatch | undefined>();

  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  const isLoading = batchesLoading || machinesLoading || recipesLoading;

  const activeBatches = productionBatches.filter(b => b.status === 'in_progress' || b.status === 'planned');
  const completedBatches = productionBatches.filter(b => b.status === 'completed');
  const totalOutput = productionBatches
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (Number(b.quantity) * (b.recipe?.yield_quantity || 1)), 0);

  const totalRawMaterialsValue = rawMaterials.reduce((sum, m) => sum + ((m.quantity_in_stock || 0) * (m.unit_cost || 0)), 0);

  const stats = [
    {
      title: 'Active Batches',
      value: `${activeBatches.length} / ${productionBatches.length}`,
      icon: Factory,
      color: 'success',
    },
    {
      title: 'Recipes',
      value: recipes.length,
      icon: ChefHat,
      color: 'warning',
    },
    {
      title: 'Raw Materials Value',
      value: formatCurrency(totalRawMaterialsValue),
      icon: Package,
      color: 'warning',
    },
  ];

  const handleCompleteBatch = (id: string) => {
    if (window.confirm('Mark batch as complete? This will update inventory.')) {
      completeBatch.mutate(id);
    }
  };

  const handleEditRecipe = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    setRecipeToEdit(recipe);
    setIsRecipeModalOpen(true);
  };

  const handleEditBatch = (batch: ProductionBatch) => {
    setBatchToEdit(batch);
    setIsBatchModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton actions={3} />
        <StatsSkeleton />
        <CardGridSkeleton cards={6} />
        <TableSkeleton rows={5} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex bg-muted/30 p-1 rounded-xl gap-1">
          <button
            onClick={() => setView('operations')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              view === 'operations' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Operations
          </button>
          <button
            onClick={() => setView('ledger')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              view === 'ledger' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Financial Ledger
          </button>
        </div>
      </div>

      {view === 'ledger' ? (
        <ManufacturingLedger />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* First Card - Production Output with Layered Values */}
            <div className="group bg-card rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl transition-transform group-hover:scale-110 duration-500 bg-primary/10 text-primary">
                  <Package className="w-6 h-6" />
                </div>
                <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-primary" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-semibold text-foreground tracking-tight">{totalOutput} units</p>
                <p className="text-sm text-muted-foreground mt-1">Today's Output</p>

                {/* Layered Production Values */}
                <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Monthly Value</span>
                    <span className="text-sm font-semibold text-success">{formatCurrency(monthlyProductionValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Yearly Value</span>
                    <span className="text-sm font-semibold text-primary">{formatCurrency(yearlyProductionValue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Stats */}
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.title}
                  className="group bg-card rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                  style={{ animationDelay: `${(index + 1) * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                      'p-3 rounded-2xl transition-transform group-hover:scale-110 duration-500',
                      stat.color === 'primary' && 'bg-primary/10 text-primary',
                      stat.color === 'success' && 'bg-success/10 text-success',
                      stat.color === 'warning' && 'bg-warning/10 text-warning',
                      stat.color === 'destructive' && 'bg-destructive/10 text-destructive',
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full w-2/3 rounded-full',
                        stat.color === 'primary' && 'bg-primary',
                        stat.color === 'success' && 'bg-success',
                        stat.color === 'warning' && 'bg-warning',
                        stat.color === 'destructive' && 'bg-destructive'
                      )} />
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-foreground tracking-tight">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN: Production Batches */}
            <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Active Production</h3>
                  <p className="text-sm text-muted-foreground">
                    {batchTab === 'active' ? `${activeBatches.length} runs currently on the floor` : `${completedBatches.length} completed batches`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setBatchToEdit(undefined);
                    setIsBatchModalOpen(true);
                  }}
                  className="btn-primary rounded-2xl shadow-lg premium-glow h-12 px-6 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Start Batch
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 bg-muted/30 p-1 rounded-xl">
                <button
                  onClick={() => setBatchTab('active')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all",
                    batchTab === 'active'
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Active ({activeBatches.length})
                </button>
                <button
                  onClick={() => setBatchTab('history')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all",
                    batchTab === 'history'
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  History ({completedBatches.length})
                </button>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                {(batchTab === 'active' ? activeBatches : completedBatches).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                    <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                      <Factory className="w-10 h-10 opacity-30" />
                    </div>
                    <p className="font-bold">{batchTab === 'active' ? 'Factory floor is quiet' : 'No completed batches yet'}</p>
                    <p className="text-sm opacity-60">{batchTab === 'active' ? 'Start a run to see live progress' : 'Complete batches to see history'}</p>
                  </div>
                ) : (
                  (batchTab === 'active' ? activeBatches : completedBatches).map((batch) => {
                    const isCompleted = batch.status === 'completed';
                    return (
                      <div key={batch.id} className="group bg-card rounded-2xl border border-border/50 p-5 hover:border-primary/30 transition-all duration-300 relative">
                        {!isCompleted && null}

                        <div className="flex items-start justify-between mb-4 pr-12">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              'w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner',
                              !isCompleted ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                            )}>
                              {(batch.recipe?.product_variant?.product?.name?.[0] || 'R').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{batch.recipe?.name || 'Unknown Recipe'}</p>
                              <p className="text-xs font-medium text-primary">
                                {batch.recipe?.product_variant?.product?.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-lg uppercase",
                              !isCompleted ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            )}>
                              {batch.status.replace('_', ' ')}
                            </span>
                            <button
                              onClick={() => handleEditBatch(batch)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 h-8 px-3 rounded-lg flex items-center gap-1 text-xs font-semibold shadow-sm mr-2"
                              title="Edit Batch Details"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            {!isCompleted && (
                              <button
                                onClick={() => handleCompleteBatch(batch.id)}
                                disabled={completeBatch.isPending}
                                className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-all"
                                title="Mark Complete"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div className="bg-secondary/30 p-3 rounded-xl">
                            <p className="text-xs font-medium text-muted-foreground opacity-90">Planned Qty</p>
                            <p className="text-lg font-semibold text-foreground">{batch.quantity}</p>
                          </div>
                          <div className="bg-secondary/30 p-3 rounded-xl">
                            <p className="text-xs font-medium text-muted-foreground opacity-90">Est Yield</p>
                            <p className="text-lg font-semibold text-foreground">
                              {Number(batch.quantity) * (batch.recipe?.yield_quantity || 1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Raw Materials & Recipes */}
            <div className="flex flex-col gap-6">

              {/* Raw Materials Card */}
              <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-6 shadow-inner">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Raw Materials</h3>
                    <p className="text-xs text-muted-foreground">
                      {rawMaterials.length} items in inventory
                    </p>
                  </div>
                  <button
                    onClick={() => setRawMaterialModal({ open: true, type: 'create' })}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-4 text-xs font-semibold shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Raw Material
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin">
                  {rawMaterials.map(mat => (
                    <div key={mat.id} className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow group relative flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{mat.name}</div>
                        <div className={cn("mt-1 text-xs", (mat.quantity_in_stock || 0) <= (mat.reorder_level || 0) ? "text-red-500 font-medium" : "text-muted-foreground")}>
                          {mat.quantity_in_stock} {mat.unit}
                        </div>
                      </div>
                      {/* Edit Buttons - Visible Outline */}
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => setRawMaterialModal({ open: true, type: 'restock', data: mat })}
                          className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 hover:bg-green-50 hover:border-green-200 text-muted-foreground hover:text-green-600 transition-colors"
                          title="Restock Material"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRawMaterialModal({ open: true, type: 'edit', data: mat })}
                          className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-muted-foreground hover:text-blue-600 transition-colors"
                          title="Edit Material"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${mat.name}? This cannot be undone.`)) {
                              deleteRawMaterial.mutate(mat.id);
                            }
                          }}
                          className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 hover:bg-red-50 hover:border-red-200 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete Material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recipes Card */}
              <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner flex flex-col flex-1">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Recipes</h3>
                    <p className="text-sm text-muted-foreground">Manage product compositions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setRecipeToEdit(undefined);
                        setIsRecipeModalOpen(true);
                      }}
                      className="btn-secondary rounded-2xl h-12 px-6 border-border group overflow-hidden relative flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                      <span className="relative z-10 font-medium">New Recipe</span>
                    </button>
                    <button
                      onClick={() => setIsProductModalOpen(true)}
                      className="btn-secondary rounded-2xl h-12 px-6 border-border group overflow-hidden relative flex items-center gap-2"
                      title='Create semi-finished goods (e.g. Dough, Sauce)'
                    >
                      <PackagePlus className="w-5 h-5" />
                      <span className="hidden xl:inline relative z-10 font-medium">New Intermediate</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin max-h-[500px]">
                  {recipes.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                      <ChefHat className="w-12 h-12 opacity-30 mb-3" />
                      <p className="font-bold">No recipes defined</p>
                    </div>
                  ) : (
                    recipes.map((recipe) => {
                      // Check if any raw materials in this recipe are low on stock
                      const lowStockCount = recipe.items?.filter(item => {
                        if (item.raw_material_id) {
                          const rawMat = rawMaterials.find(rm => rm.id === item.raw_material_id);
                          return rawMat && rawMat.quantity_in_stock <= (rawMat.reorder_level || 0);
                        }
                        return false;
                      }).length || 0;

                      return (
                        <div
                          key={recipe.id}
                          className="group bg-card rounded-2xl border border-border/50 p-4 transition-all duration-300 hover:shadow-md cursor-pointer relative"
                          onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                        >
                          <div className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleEditRecipe(e, recipe)}
                              className="p-1.5 hover:bg-muted rounded-full"
                            >
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <ChefHat className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-foreground text-sm">{recipe.name}</p>
                                  {lowStockCount > 0 && (
                                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                      ⚠ {lowStockCount} low
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                  Yields: {recipe.yield_quantity} units
                                </p>
                              </div>
                            </div>
                            <div className="text-right pl-6">
                              <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", expandedRecipe === recipe.id ? "rotate-180" : "")} />
                            </div>
                          </div>

                          {expandedRecipe === recipe.id && (
                            <div className="mt-4 pt-3 border-t border-border/50 animate-in slide-in-from-top-2">
                              {/* Cost Calculation */}
                              {(() => {
                                const materials = recipe.items?.filter(i => i.item_type === 'raw_material' || !i.item_type) || [];
                                const services = recipe.items?.filter(i => i.item_type === 'service') || [];
                                const overheads = recipe.items?.filter(i => i.item_type === 'overhead') || [];

                                const materialCost = materials.reduce((sum, item) => {
                                  // Use actual cost if available, fallback to estimated
                                  const cost = item.raw_material?.unit_cost || item.material_variant?.cost_price || 0;
                                  return sum + (cost * item.quantity);
                                }, 0);

                                const serviceCost = services.reduce((sum, item) => sum + (item.unit_cost || 0), 0) + (recipe.labor_cost || 0);
                                const overheadCost = overheads.reduce((sum, item) => sum + (item.unit_cost || 0), 0) + (recipe.machine_cost || 0);
                                const totalCost = materialCost + serviceCost + overheadCost;

                                return (
                                  <>
                                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                                      <div className="bg-secondary/30 p-2 rounded-lg">
                                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Materials</span>
                                        <span className="font-semibold">{formatCurrency(materialCost)}</span>
                                      </div>
                                      <div className="bg-blue-50/50 p-2 rounded-lg text-blue-700">
                                        <span className="text-blue-600/70 block text-[10px] uppercase tracking-wider">Labor/Svc</span>
                                        <span className="font-semibold">{formatCurrency(serviceCost)}</span>
                                      </div>
                                      <div className="bg-purple-50/50 p-2 rounded-lg text-purple-700">
                                        <span className="text-purple-600/70 block text-[10px] uppercase tracking-wider">Total Batch</span>
                                        <span className="font-bold">{formatCurrency(totalCost)}</span>
                                      </div>
                                    </div>

                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Detailed BOM:</p>
                                    <div className="space-y-1">
                                      {recipe.items?.map(item => (
                                        <div key={item.id} className="flex justify-between text-xs bg-muted/20 p-2 rounded-lg">
                                          <span className="flex items-center gap-2">
                                            <span className={cn("w-1.5 h-1.5 rounded-full",
                                              item.item_type === 'service' ? "bg-blue-400" :
                                                item.item_type === 'overhead' ? "bg-purple-400" : "bg-slate-400"
                                            )} />
                                            {item.raw_material?.name || item.material_variant?.product?.name || item.description || 'Unknown'}
                                          </span>
                                          <span className="font-mono text-muted-foreground">
                                            {item.item_type === 'raw_material' || !item.item_type
                                              ? `${item.quantity} units`
                                              : formatCurrency(item.unit_cost || 0)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Machine Health Tracker (Restored) */}
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-2xl">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                  <h3 className="text-2xl font-semibold text-foreground">Machine Health Tracker</h3>
                </div>
                <p className="text-sm text-muted-foreground">Live telemetry and maintenance scheduling</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMachineModalOpen(true)}
                  className="btn-secondary h-10 flex items-center gap-2 px-4 rounded-xl border border-border"
                >
                  <Plus className="w-4 h-4" />
                  Register Machine
                </button>
                <div className="text-right ml-4">
                  <p className="text-[10px] font-semibold text-muted-foreground opacity-70 mb-1">Total Assets Valuation</p>
                  <p className="text-2xl font-semibold text-primary">
                    {formatCurrency(machines.reduce((sum, m) => sum + Number(m.current_value), 0))}
                  </p>
                </div>
              </div>
            </div>

            {machines.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Cog className="w-16 h-16 mx-auto mb-4 opacity-10 animate-spin-slow" />
                <p className="font-bold">No assets registered in the facility</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {machines.map((machine) => (
                  <button
                    key={machine.id}
                    onClick={() => {
                      setMachineToEdit(machine);
                      setIsMachineModalOpen(true);
                    }}
                    className="relative group bg-card rounded-2xl border border-border/50 p-6 overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:border-primary/40 text-left"
                  >
                    <div className="absolute top-0 right-0 p-4">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        machine.status === 'operational' ? "bg-success" : "bg-warning animate-pulse"
                      )} />
                    </div>

                    <div className="flex flex-col h-full">
                      <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner">
                        <Cog className="w-6 h-6 animate-spin-slow" />
                      </div>

                      <h4 className="font-semibold text-foreground text-lg leading-tight mb-1">{machine.name}</h4>
                      <p className="text-[10px] font-medium text-muted-foreground mb-4">
                        Status: <span className={machine.status === 'operational' ? 'text-success' : 'text-warning'}>{machine.status}</span>
                      </p>

                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-semibold text-muted-foreground/60">Maintenance</span>
                          <span className="text-[10px] font-bold text-foreground">
                            {machine.last_maintenance ? new Date(machine.last_maintenance).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) : 'Never'}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full w-4/5 bg-primary/20 rounded-full" />
                        </div>

                        <div className="pt-4 mt-4 border-t border-border/50 flex justify-between items-baseline">
                          <span className="text-[10px] font-semibold text-muted-foreground/60">Valuation</span>
                          <span className="text-base font-semibold text-foreground">
                            {formatCurrency(Number(machine.current_value))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isBatchModalOpen && (
        <CreateBatchModal
          onClose={() => setIsBatchModalOpen(false)}
          recipes={recipes || []}
          batchToEdit={batchToEdit}
        />
      )}

      {isRecipeModalOpen && (
        <CreateRecipeModal
          onClose={() => setIsRecipeModalOpen(false)}
          recipeToEdit={recipeToEdit}
        />
      )}

      <AddProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        defaultType="semi_finished_good"
      />

      <RegisterMachineModal
        isOpen={isMachineModalOpen}
        machineToEdit={machineToEdit}
        onClose={() => {
          setIsMachineModalOpen(false);
          setMachineToEdit(null);
        }}
      />

      <RawMaterialModal
        isOpen={rawMaterialModal.open}
        onClose={() => setRawMaterialModal({ open: false, type: 'create' })}
        mode={rawMaterialModal.type}
        initialData={rawMaterialModal.data}
      />
    </div>
  );
}
