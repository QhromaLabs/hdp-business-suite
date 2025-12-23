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
  Trash2
} from 'lucide-react';
import {
  useProductionBatches,
  useRecipes,
  useMachines,
  useCompleteBatch,
  useUpdateMachine
} from '@/hooks/useManufacturing';
import { cn } from '@/lib/utils';
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';
import CreateBatchModal from '@/components/manufacturing/CreateBatchModal';
import CreateRecipeModal from '@/components/manufacturing/CreateRecipeModal';
import { RegisterMachineModal } from '@/components/manufacturing/RegisterMachineModal';

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
  const completeBatch = useCompleteBatch();

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [machineToEdit, setMachineToEdit] = useState<any>(null);

  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  const isLoading = batchesLoading || machinesLoading || recipesLoading;

  const activeBatches = productionBatches.filter(b => b.status === 'in_progress' || b.status === 'planned');
  const totalOutput = productionBatches
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (Number(b.quantity) * (b.recipe?.yield_quantity || 1)), 0);

  const totalDepreciation = machines.reduce((sum, m) => sum + (Number(m.purchase_cost) * (Number(m.depreciation_rate) / 100)), 0);

  const stats = [
    {
      title: "Today's Output",
      value: `${totalOutput} units`,
      icon: Package,
      color: 'primary',
    },
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
      title: 'Machine Depreciation',
      value: formatCurrency(totalDepreciation),
      icon: Cog,
      color: 'destructive',
    },
  ];

  const handleCompleteBatch = (id: string) => {
    if (window.confirm('Mark batch as complete? This will update inventory.')) {
      completeBatch.mutate(id);
    }
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="group bg-card rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
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
        {/* LEFT COLUMN: Production Batches (Replaces "Active Production") */}
        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Active Production</h3>
              <p className="text-sm text-muted-foreground">{activeBatches.length} runs currently on the floor</p>
            </div>
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="btn-primary rounded-2xl shadow-lg premium-glow h-12 px-6 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Start Batch
            </button>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-thin">
            {productionBatches.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                  <Factory className="w-10 h-10 opacity-30" />
                </div>
                <p className="font-bold">Factory floor is quiet</p>
                <p className="text-sm opacity-60">Start a run to see live progress</p>
              </div>
            ) : (
              productionBatches.map((batch) => {
                const isCompleted = batch.status === 'completed';
                return (
                  <div key={batch.id} className="group bg-card rounded-2xl border border-border/50 p-5 hover:border-primary/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
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

        {/* RIGHT COLUMN: Recipes (Replaces "Raw Material Wealth") */}
        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Recipes</h3>
              <p className="text-sm text-muted-foreground">Manage product compositions</p>
            </div>
            <button
              onClick={() => setIsRecipeModalOpen(true)}
              className="btn-secondary rounded-2xl h-12 px-6 border-border group overflow-hidden relative flex items-center gap-2"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              <span className="relative z-10 font-medium">New Recipe</span>
            </button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
            {recipes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                <ChefHat className="w-12 h-12 opacity-30 mb-3" />
                <p className="font-bold">No recipes defined</p>
              </div>
            ) : (
              recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="group bg-card rounded-2xl border border-border/50 p-4 transition-all duration-300 hover:shadow-md cursor-pointer relative"
                  onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <ChefHat className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{recipe.name}</p>
                        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                          Yields: {recipe.yield_quantity} units
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", expandedRecipe === recipe.id ? "rotate-180" : "")} />
                    </div>
                  </div>

                  {expandedRecipe === recipe.id && (
                    <div className="mt-4 pt-3 border-t border-border/50 animate-in slide-in-from-top-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Ingredients:</p>
                      <div className="space-y-2">
                        {recipe.items?.map(item => (
                          <div key={item.id} className="flex justify-between text-sm bg-muted/20 p-2 rounded-lg">
                            <span>{item.material_variant?.product?.name}</span>
                            <span className="font-mono">{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
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



      {isBatchModalOpen && (
        <CreateBatchModal
          onClose={() => setIsBatchModalOpen(false)}
          recipes={recipes || []}
        />
      )}

      {isRecipeModalOpen && (
        <CreateRecipeModal
          onClose={() => setIsRecipeModalOpen(false)}
        />
      )}

      <RegisterMachineModal
        isOpen={isMachineModalOpen}
        machineToEdit={machineToEdit}
        onClose={() => {
          setIsMachineModalOpen(false);
          setMachineToEdit(null);
        }}
      />
    </div>
  );
}
