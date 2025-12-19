import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Barcode,
  Edit,
  Eye,
  Download,
  Upload,
  Loader2,
} from 'lucide-react';
import { useInventory, useCategories } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const { data: inventory = [], isLoading } = useInventory();
  const { data: categories = [] } = useCategories();

  const categoryNames = ['All', ...categories.map(c => c.name)];

  const filteredProducts = inventory.filter(item => {
    const variant = item.variant;
    const product = variant?.product;
    const categoryName = product?.category?.name;
    
    const matchesSearch = 
      product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variant?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variant?.barcode?.includes(searchQuery);
    const matchesCategory = selectedCategory === 'All' || categoryName === selectedCategory;
    const matchesStock = 
      stockFilter === 'all' ||
      (stockFilter === 'low' && item.quantity <= 50 && item.quantity > 0) ||
      (stockFilter === 'out' && item.quantity === 0);
    return matchesSearch && matchesCategory && matchesStock;
  });

  const totalValue = inventory.reduce((sum, i) => sum + (Number(i.variant?.cost_price || 0) * i.quantity), 0);
  const lowStockCount = inventory.filter(i => i.quantity <= 50 && i.quantity > 0).length;
  const outOfStockCount = inventory.filter(i => i.quantity === 0).length;

  const stats = [
    {
      title: 'Total Products',
      value: inventory.length,
      icon: Package,
      color: 'primary',
    },
    {
      title: 'Stock Value',
      value: formatCurrency(totalValue),
      icon: TrendingUp,
      color: 'success',
    },
    {
      title: 'Low Stock',
      value: lowStockCount,
      icon: AlertTriangle,
      color: 'warning',
    },
    {
      title: 'Out of Stock',
      value: outOfStockCount,
      icon: TrendingDown,
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

      {/* Actions Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-1 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products, SKU, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field max-w-[160px]"
          >
            {categoryNames.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setStockFilter(filter.value as 'all' | 'low' | 'out')}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  stockFilter === filter.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download className="w-5 h-5" />
            Export
          </button>
          <button className="btn-secondary">
            <Upload className="w-5 h-5" />
            Import
          </button>
          <button className="btn-primary">
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Product</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">SKU / Barcode</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Category</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Cost</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Price</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Stock</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Value</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item, index) => {
                const variant = item.variant;
                const product = variant?.product;
                const stock = item.quantity;
                const cost = Number(variant?.cost_price || 0);
                const price = Number(variant?.price || 0);
                
                return (
                  <tr
                    key={item.id}
                    className="table-row animate-slide-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <span className="text-2xl">📦</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{product?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {variant?.variant_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <p className="font-mono text-sm text-foreground">{variant?.sku}</p>
                        {variant?.barcode && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Barcode className="w-3 h-3" />
                            {variant.barcode}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                        {product?.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-muted-foreground">
                        {formatCurrency(cost)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-medium text-foreground">
                        {formatCurrency(price)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className={cn(
                        'font-semibold',
                        stock === 0 && 'text-destructive',
                        stock > 0 && stock <= 50 && 'text-warning',
                        stock > 50 && 'text-success'
                      )}>
                        {stock}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-medium text-foreground">
                        {formatCurrency(cost * stock)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">Add inventory to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
