import { 
  Factory,
  Package,
  Cog,
  TrendingUp,
  Plus,
  Play,
  Pause,
  Loader2,
} from 'lucide-react';
import { useProductionRuns, useMachines, useRawMaterials } from '@/hooks/useManufacturing';
import { cn } from '@/lib/utils';

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'p-3 rounded-xl',
                  stat.color === 'primary' && 'bg-primary/10 text-primary',
                  stat.color === 'success' && 'bg-success/10 text-success',
                  stat.color === 'warning' && 'bg-warning/10 text-warning',
                  stat.color === 'destructive' && 'bg-destructive/10 text-destructive',
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Runs */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Production Runs</h3>
            <button className="btn-primary text-sm py-2">
              <Plus className="w-4 h-4" />
              New Batch
            </button>
          </div>
          <div className="space-y-4">
            {productionRuns.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Factory className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No production runs yet</p>
              </div>
            ) : (
              productionRuns.map((run) => {
                const progress = run.planned_quantity > 0 
                  ? Math.round((run.actual_quantity / run.planned_quantity) * 100) 
                  : 0;
                
                return (
                  <div key={run.id} className="p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-3 h-3 rounded-full',
                          run.status === 'in_progress' && 'bg-success animate-pulse',
                          run.status === 'completed' && 'bg-primary',
                          run.status === 'cancelled' && 'bg-destructive',
                        )} />
                        <div>
                          <p className="font-medium text-foreground">{run.batch_number}</p>
                          <p className="text-sm text-muted-foreground">{run.product?.name}</p>
                        </div>
                      </div>
                      <button className={cn(
                        'p-2 rounded-lg transition-colors',
                        run.status === 'in_progress' 
                          ? 'bg-warning/10 text-warning hover:bg-warning/20' 
                          : 'bg-success/10 text-success hover:bg-success/20'
                      )}>
                        {run.status === 'in_progress' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Output: <span className="font-medium text-foreground">{run.actual_quantity}</span> / {run.planned_quantity}
                      </span>
                      <span className={cn(
                        'font-semibold',
                        progress >= 80 ? 'text-success' : progress >= 50 ? 'text-warning' : 'text-destructive'
                      )}>
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          progress >= 80 ? 'bg-success' : progress >= 50 ? 'bg-warning' : 'bg-destructive'
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Raw Materials */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Raw Materials</h3>
            <button className="btn-secondary text-sm py-2">
              <Plus className="w-4 h-4" />
              Add Stock
            </button>
          </div>
          <div className="space-y-3">
            {rawMaterials.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No raw materials added</p>
              </div>
            ) : (
              rawMaterials.map((material) => {
                const isLow = Number(material.quantity_in_stock) <= Number(material.reorder_level);
                const isCritical = Number(material.quantity_in_stock) <= Number(material.reorder_level) * 0.5;
                const status = isCritical ? 'critical' : isLow ? 'low' : 'good';
                
                return (
                  <div key={material.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-2 h-8 rounded-full',
                        status === 'good' && 'bg-success',
                        status === 'low' && 'bg-warning',
                        status === 'critical' && 'bg-destructive',
                      )} />
                      <div>
                        <p className="font-medium text-foreground">{material.name}</p>
                        <p className="text-xs text-muted-foreground">Reorder at: {material.reorder_level} {material.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'font-bold',
                        status === 'good' && 'text-foreground',
                        status === 'low' && 'text-warning',
                        status === 'critical' && 'text-destructive',
                      )}>
                        {material.quantity_in_stock} {material.unit}
                      </p>
                      {status !== 'good' && (
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          status === 'low' ? 'badge-warning' : 'badge-destructive'
                        )}>
                          {status === 'low' ? 'Low Stock' : 'Critical'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Machines */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Machines & Equipment</h3>
          <p className="text-sm text-muted-foreground">
            Annual Depreciation: <span className="font-semibold text-foreground">{formatCurrency(totalDepreciation)}</span>
          </p>
        </div>
        {machines.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Cog className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No machines added yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {machines.map((machine) => (
              <div key={machine.id} className="p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Cog className={cn(
                    'w-5 h-5',
                    machine.status === 'operational' ? 'text-success' : 'text-warning'
                  )} />
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    machine.status === 'operational' ? 'badge-success' : 'badge-warning'
                  )}>
                    {machine.status}
                  </span>
                </div>
                <p className="font-medium text-foreground">{machine.name}</p>
                {machine.last_maintenance && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last maintenance: {new Date(machine.last_maintenance).toLocaleDateString('en-KE')}
                  </p>
                )}
                <p className="text-sm font-medium text-foreground mt-2">
                  Value: {formatCurrency(Number(machine.current_value))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
