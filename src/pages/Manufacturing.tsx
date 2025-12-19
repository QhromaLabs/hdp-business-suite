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
  Save,
  Pencil,
} from 'lucide-react';
import {
  useProductionRuns,
  useMachines,
  useRawMaterials,
  useUpdateProductionRun,
} from '@/hooks/useManufacturing';
import { cn } from '@/lib/utils';
import { CreateProductionRunModal } from '@/components/manufacturing/CreateProductionRunModal';
import { RawMaterialModal } from '@/components/manufacturing/RawMaterialModal';
import { RegisterMachineModal } from '@/components/manufacturing/RegisterMachineModal';
import { CardGridSkeleton, PageHeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/loading/PageSkeletons';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function Manufacturing() {
  const { data: productionRuns = [], isLoading: runsLoading } = useProductionRuns();
  const { data: machines = [], isLoading: machinesLoading } = useMachines();
  const { data: rawMaterials = [], isLoading: materialsLoading } = useRawMaterials();
  const updateRun = useUpdateProductionRun();

  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [machineToEdit, setMachineToEdit] = useState<any>(null);
  const [runEdits, setRunEdits] = useState<Record<string, { actual?: string; wastage?: string }>>({});

  const isLoading = runsLoading || machinesLoading || materialsLoading;

  const activeRuns = productionRuns.filter(r => r.status === 'in_progress');
  const totalOutput = productionRuns.reduce((sum, r) => sum + (r.actual_quantity || 0), 0);
  const totalDepreciation = machines.reduce((sum, m) => sum + (Number(m.purchase_cost) * (Number(m.depreciation_rate) / 100)), 0);

  const stats = [
    {
      title: "Today's Output",
      value: `${totalOutput} units`,
      icon: Package,
      color: 'primary',
    },
    {
      title: 'Active Runs',
      value: `${activeRuns.length} / ${productionRuns.length}`,
      icon: Factory,
      color: 'success',
    },
    {
      title: 'Raw Materials',
      value: rawMaterials.length,
      icon: TrendingUp,
      color: 'warning',
    },
    {
      title: 'Machine Depreciation',
      value: formatCurrency(totalDepreciation),
      icon: Cog,
      color: 'destructive',
    },
  ];

  const handleToggleRunStatus = (runId: string, status: string | null) => {
    const nextStatus = status === 'in_progress' ? 'paused' : 'in_progress';
    updateRun.mutate({ id: runId, status: nextStatus as any });
  };

  const handleSaveRunOutput = (runId: string, actualFallback: number, wastageFallback: number) => {
    const edit = runEdits[runId] || {};
    const actualValue = edit.actual ?? String(actualFallback ?? 0);
    const wastageValue = edit.wastage ?? String(wastageFallback ?? 0);

    updateRun.mutate({
      id: runId,
      actual_quantity: Number(actualValue || 0),
      wastage_quantity: Number(wastageValue || 0),
    });
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
        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Active Production</h3>
              <p className="text-sm text-muted-foreground">{activeRuns.length} runs currently on the floor</p>
            </div>
            <button
              onClick={() => setIsRunModalOpen(true)}
              className="btn-primary rounded-2xl shadow-lg premium-glow h-12 px-6"
            >
              <Plus className="w-5 h-5" />
              Start New Batch
            </button>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-thin">
            {productionRuns.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                  <Factory className="w-10 h-10 opacity-30" />
                </div>
                <p className="font-bold">Factory floor is quiet</p>
                <p className="text-sm opacity-60">Start a run to see live progress</p>
              </div>
            ) : (
              productionRuns.map((run) => {
                const progress = run.planned_quantity > 0
                  ? Math.round((run.actual_quantity / run.planned_quantity) * 100)
                  : 0;
                const edit = runEdits[run.id] || {};
                const actualValue = edit.actual ?? String(run.actual_quantity || 0);
                const wastageValue = edit.wastage ?? String(run.wastage_quantity || 0);

                return (
                  <div key={run.id} className="group bg-card rounded-2xl border border-border/50 p-5 hover:border-primary/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner',
                          run.status === 'in_progress' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        )}>
                          {(run.product?.name?.[0] || run.batch_number?.[0] || 'R').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{run.batch_number}</p>
                          <p className="text-xs font-medium text-primary">{run.product?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-lg",
                          run.status === 'in_progress' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        )}>
                          {run.status?.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => handleToggleRunStatus(run.id, run.status)}
                          className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-60"
                          disabled={updateRun.isPending}
                        >
                          {run.status === 'in_progress' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-secondary/30 p-3 rounded-xl">
                        <p className="text-xs font-medium text-muted-foreground opacity-90">Current Output</p>
                        <p className="text-lg font-semibold text-foreground">{run.actual_quantity} / {run.planned_quantity}</p>
                      </div>
                      <div className="bg-secondary/30 p-3 rounded-xl">
                        <p className="text-xs font-medium text-muted-foreground opacity-90">Completion</p>
                        <p className="text-lg font-semibold text-foreground">{progress}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground">Actual output</p>
                        <input
                          type="number"
                          min={0}
                          value={actualValue}
                          onChange={(e) => setRunEdits(prev => ({ ...prev, [run.id]: { ...prev[run.id], actual: e.target.value } }))}
                          className="input-field text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground">Wastage</p>
                        <input
                          type="number"
                          min={0}
                          value={wastageValue}
                          onChange={(e) => setRunEdits(prev => ({ ...prev, [run.id]: { ...prev[run.id], wastage: e.target.value } }))}
                          className="input-field text-sm"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          onClick={() => handleSaveRunOutput(run.id, run.actual_quantity || 0, run.wastage_quantity || 0)}
                          className="flex-1 h-12 rounded-xl border border-border/60 bg-card hover:bg-primary/5 transition-all flex items-center justify-center gap-2 shadow-sm"
                          disabled={updateRun.isPending}
                        >
                          <Save className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">Save Output</span>
                        </button>
                        {run.status !== 'completed' && (
                          <button
                            onClick={() => updateRun.mutate({ id: run.id, status: 'completed' })}
                            className="h-12 w-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center shadow-sm"
                            disabled={updateRun.isPending}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner mt-3">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-1000 ease-out relative',
                          progress >= 80 ? 'bg-success' : progress >= 50 ? 'bg-warning' : 'bg-primary'
                        )}
                        style={{ width: `${progress}%` }}
                      >
                        {run.status === 'in_progress' && (
                          <div className="absolute inset-0 bg-white/15 animate-[barShimmer_2s_linear_infinite]" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border/50 p-8 shadow-inner flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Raw Material Wealth</h3>
              <p className="text-sm text-muted-foreground">Inventory levels and requisitions</p>
            </div>
            <button
              onClick={() => setIsMaterialModalOpen(true)}
              className="btn-secondary rounded-2xl h-12 px-6 border-border group overflow-hidden relative"
            >
              <span className="relative z-10 flex items-center gap-2 font-medium">
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                Restock
              </span>
              <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
            {rawMaterials.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                <Package className="w-12 h-12 opacity-30 mb-3" />
                <p className="font-bold">Silo is empty</p>
              </div>
            ) : (
              rawMaterials.map((material) => {
                const isLow = Number(material.quantity_in_stock) <= Number(material.reorder_level);
                const isCritical = Number(material.quantity_in_stock) <= Number(material.reorder_level) * 0.5;
                const status = isCritical ? 'critical' : isLow ? 'low' : 'good';

                return (
                  <div key={material.id} className="group bg-card rounded-2xl border border-border/50 p-4 transition-all duration-300 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-2 h-10 rounded-full transition-all duration-500',
                          status === 'good' ? 'bg-success' : status === 'low' ? 'bg-warning scale-y-110' : 'bg-destructive scale-y-125'
                        )} />
                        <div>
                          <p className="font-semibold text-foreground text-sm">{material.name}</p>
                          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                            Target Min: {material.reorder_level} {material.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          'text-lg font-semibold',
                          status === 'good' ? 'text-foreground' : status === 'low' ? 'text-warning' : 'text-destructive'
                        )}>
                          {material.quantity_in_stock} <span className="text-[10px] text-muted-foreground">{material.unit}</span>
                        </p>
                        <div className="flex justify-end gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={cn(
                              "w-4 h-1 rounded-full",
                              i <= (status === 'good' ? 4 : status === 'low' ? 2 : 1)
                                ? (status === 'good' ? 'bg-success' : status === 'low' ? 'bg-warning' : 'bg-destructive')
                                : 'bg-muted'
                            )} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <button className="w-full mt-6 py-4 bg-muted/30 rounded-2xl text-xs font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all">
            View Stock History
          </button>
        </div>
      </div>

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
              className="btn-secondary h-10"
            >
              <Plus className="w-4 h-4" />
              Register Machine
            </button>
            <div className="text-right">
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

      <CreateProductionRunModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        machines={machines}
      />
      <RawMaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        materials={rawMaterials}
      />
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
