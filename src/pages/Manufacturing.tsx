import { useState } from 'react';
import { 
  Factory,
  Package,
  Cog,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
  Play,
  Pause,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const productionLines = [
  {
    id: '1',
    name: 'Detergent Line A',
    status: 'running',
    product: 'Industrial Detergent 20L',
    output: 245,
    target: 300,
    efficiency: 82,
  },
  {
    id: '2',
    name: 'Cleaner Line B',
    status: 'running',
    product: 'Multipurpose Cleaner 5L',
    output: 180,
    target: 200,
    efficiency: 90,
  },
  {
    id: '3',
    name: 'Polish Line C',
    status: 'paused',
    product: 'Floor Polish Premium',
    output: 0,
    target: 150,
    efficiency: 0,
  },
];

const rawMaterials = [
  { name: 'Sodium Lauryl Sulfate', stock: 2500, unit: 'kg', reorderPoint: 500, status: 'good' },
  { name: 'Glycerin', stock: 800, unit: 'L', reorderPoint: 200, status: 'good' },
  { name: 'Citric Acid', stock: 150, unit: 'kg', reorderPoint: 200, status: 'low' },
  { name: 'Fragrance Oil', stock: 45, unit: 'L', reorderPoint: 50, status: 'critical' },
  { name: 'Dye Concentrate', stock: 25, unit: 'L', reorderPoint: 10, status: 'good' },
];

const machines = [
  { name: 'Mixer Tank A', status: 'operational', lastMaintenance: '2024-01-10', depreciation: 85000 },
  { name: 'Filling Machine 1', status: 'operational', lastMaintenance: '2024-01-15', depreciation: 120000 },
  { name: 'Packaging Line', status: 'maintenance', lastMaintenance: '2024-01-20', depreciation: 95000 },
  { name: 'Quality Control Unit', status: 'operational', lastMaintenance: '2024-01-18', depreciation: 45000 },
];

export default function Manufacturing() {
  const stats = [
    {
      title: "Today's Output",
      value: '425 units',
      icon: Package,
      color: 'primary',
    },
    {
      title: 'Active Lines',
      value: '2 / 3',
      icon: Factory,
      color: 'success',
    },
    {
      title: 'Avg Efficiency',
      value: '86%',
      icon: TrendingUp,
      color: 'warning',
    },
    {
      title: 'Machine Depreciation',
      value: formatCurrency(345000),
      icon: Cog,
      color: 'destructive',
    },
  ];

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
        {/* Production Lines */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Production Lines</h3>
            <button className="btn-primary text-sm py-2">
              <Plus className="w-4 h-4" />
              New Batch
            </button>
          </div>
          <div className="space-y-4">
            {productionLines.map((line) => (
              <div key={line.id} className="p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      line.status === 'running' && 'bg-success animate-pulse',
                      line.status === 'paused' && 'bg-warning',
                      line.status === 'stopped' && 'bg-destructive',
                    )} />
                    <div>
                      <p className="font-medium text-foreground">{line.name}</p>
                      <p className="text-sm text-muted-foreground">{line.product}</p>
                    </div>
                  </div>
                  <button className={cn(
                    'p-2 rounded-lg transition-colors',
                    line.status === 'running' 
                      ? 'bg-warning/10 text-warning hover:bg-warning/20' 
                      : 'bg-success/10 text-success hover:bg-success/20'
                  )}>
                    {line.status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Output: <span className="font-medium text-foreground">{line.output}</span> / {line.target}
                  </span>
                  <span className={cn(
                    'font-semibold',
                    line.efficiency >= 80 ? 'text-success' : line.efficiency >= 50 ? 'text-warning' : 'text-destructive'
                  )}>
                    {line.efficiency}% efficiency
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      line.efficiency >= 80 ? 'bg-success' : line.efficiency >= 50 ? 'bg-warning' : 'bg-destructive'
                    )}
                    style={{ width: `${(line.output / line.target) * 100}%` }}
                  />
                </div>
              </div>
            ))}
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
            {rawMaterials.map((material) => (
              <div key={material.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-2 h-8 rounded-full',
                    material.status === 'good' && 'bg-success',
                    material.status === 'low' && 'bg-warning',
                    material.status === 'critical' && 'bg-destructive',
                  )} />
                  <div>
                    <p className="font-medium text-foreground">{material.name}</p>
                    <p className="text-xs text-muted-foreground">Reorder at: {material.reorderPoint} {material.unit}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'font-bold',
                    material.status === 'good' && 'text-foreground',
                    material.status === 'low' && 'text-warning',
                    material.status === 'critical' && 'text-destructive',
                  )}>
                    {material.stock} {material.unit}
                  </p>
                  {material.status !== 'good' && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      material.status === 'low' ? 'badge-warning' : 'badge-destructive'
                    )}>
                      {material.status === 'low' ? 'Low Stock' : 'Critical'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Machines */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Machines & Equipment</h3>
          <p className="text-sm text-muted-foreground">
            Annual Depreciation (10%): <span className="font-semibold text-foreground">{formatCurrency(345000)}</span>
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {machines.map((machine) => (
            <div key={machine.name} className="p-4 bg-muted/30 rounded-xl">
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
              <p className="text-xs text-muted-foreground mt-1">
                Last maintenance: {new Date(machine.lastMaintenance).toLocaleDateString('en-KE')}
              </p>
              <p className="text-sm font-medium text-foreground mt-2">
                Depreciation: {formatCurrency(machine.depreciation)}/yr
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
