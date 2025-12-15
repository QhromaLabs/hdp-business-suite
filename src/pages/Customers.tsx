import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  CreditCard,
  Users,
  Building,
  ShoppingBag,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { mockCustomers } from '@/data/mockCustomers';
import { Customer } from '@/types';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const customerTypes = [
  { value: 'all', label: 'All Customers' },
  { value: 'normal', label: 'Normal' },
  { value: 'consignment', label: 'Consignment' },
  { value: 'marketplace', label: 'Marketplace' },
];

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  const filteredCustomers = mockCustomers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || customer.type === selectedType;
    return matchesSearch && matchesType;
  });

  const stats = [
    {
      title: 'Total Customers',
      value: mockCustomers.length,
      icon: Users,
      color: 'primary',
    },
    {
      title: 'Credit Outstanding',
      value: formatCurrency(mockCustomers.reduce((sum, c) => sum + c.creditBalance, 0)),
      icon: CreditCard,
      color: 'warning',
    },
    {
      title: 'Consignment Partners',
      value: mockCustomers.filter(c => c.type === 'consignment').length,
      icon: Building,
      color: 'success',
    },
    {
      title: 'Marketplace Sellers',
      value: mockCustomers.filter(c => c.type === 'marketplace').length,
      icon: ShoppingBag,
      color: 'accent',
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'consignment': return 'badge-warning';
      case 'marketplace': return 'badge-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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
                  stat.color === 'warning' && 'bg-warning/10 text-warning',
                  stat.color === 'success' && 'bg-success/10 text-success',
                  stat.color === 'accent' && 'bg-accent text-accent-foreground',
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <div className="flex gap-2">
            {customerTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  selectedType === type.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowNewCustomerModal(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Customer</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Contact</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Credit Limit</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Balance</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <tr
                  key={customer.id}
                  className="table-row animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {customer.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Since {new Date(customer.createdAt).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full capitalize', getTypeColor(customer.type))}>
                      {customer.type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-foreground">
                      {formatCurrency(customer.creditLimit)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      'font-semibold',
                      customer.creditBalance > 0 ? 'text-warning' : 'text-success'
                    )}>
                      {formatCurrency(customer.creditBalance)}
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
                      <button className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredCustomers.length === 0 && (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
