import { useState, useMemo } from 'react';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Wallet,
  Receipt,
  User,
  X,
  Check,
} from 'lucide-react';
import { mockProducts, categories } from '@/data/mockProducts';
import { mockCustomers } from '@/data/mockCustomers';
import { CartItem, PaymentMethod, Customer, Product } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const paymentMethods: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'credit', label: 'Credit', icon: CreditCard },
  { value: 'till', label: 'M-Pesa Till', icon: Smartphone },
  { value: 'nat', label: 'NAT Bank', icon: Building2 },
  { value: 'equity', label: 'Equity', icon: Building2 },
  { value: 'coop', label: 'Coop Bank', icon: Building2 },
  { value: 'kcb_kt', label: 'KCB/KT', icon: Building2 },
  { value: 'capital', label: 'Capital', icon: Wallet },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function POS() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  const filteredProducts = useMemo(() => {
    return mockProducts.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.includes(searchQuery);
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const discount = cart.reduce((sum, item) => sum + item.discount, 0);
    const tax = (subtotal - discount) * 0.16; // 16% VAT
    const total = subtotal - discount + tax;
    return { subtotal, discount, tax, total };
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
    toast.success(`Added ${product.name}`, { duration: 1500 });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = mockProducts.find(p => p.barcode === barcodeInput);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
    } else {
      toast.error('Product not found');
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (selectedPayment === 'credit' && !selectedCustomer) {
      toast.error('Please select a customer for credit sales');
      setShowCustomerModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  const processPayment = () => {
    toast.success('Sale completed successfully!', {
      description: `Invoice #INV-${Date.now().toString().slice(-6)}`,
    });
    clearCart();
    setShowPaymentModal(false);
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-6 animate-fade-in">
      {/* Products Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search & Categories */}
        <div className="space-y-4 mb-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products by name, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-11"
              />
            </div>
            <form onSubmit={handleBarcodeSubmit} className="relative w-48">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Scan barcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="input-field pl-11 font-mono"
              />
            </form>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="pos-product-card text-left"
              >
                <div className="aspect-square rounded-lg bg-muted mb-3 flex items-center justify-center">
                  <span className="text-3xl">📦</span>
                </div>
                <h3 className="font-medium text-foreground text-sm truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {product.sku}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-foreground">
                    {formatCurrency(product.price)}
                  </span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    product.stock > 50 ? "badge-success" : product.stock > 10 ? "badge-warning" : "badge-destructive"
                  )}>
                    {product.stock} in stock
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-card rounded-2xl border border-border flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Current Sale</h2>
            <span className="text-sm text-muted-foreground">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedCustomer ? (
            <div className="mt-3 p-3 bg-accent rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {selectedCustomer.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomerModal(true)}
              className="mt-3 w-full p-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            >
              + Add Customer
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Receipt className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No items in cart</p>
              <p className="text-xs mt-1">Click products to add them</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="bg-secondary/50 rounded-xl p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatCurrency(item.product.price)} each
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-semibold text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="font-bold text-foreground">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Methods */}
        <div className="p-4 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">Payment Method</p>
          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.slice(0, 4).map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.value}
                  onClick={() => setSelectedPayment(method.value)}
                  className={cn(
                    "payment-method-btn",
                    selectedPayment === method.value && "payment-method-btn-active"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart Totals */}
        <div className="p-4 border-t border-border space-y-2 bg-muted/30">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">{formatCurrency(cartTotals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT (16%)</span>
            <span className="font-medium text-foreground">{formatCurrency(cartTotals.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
            <span className="text-foreground">Total</span>
            <span className="text-primary">{formatCurrency(cartTotals.total)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-3">
            <button
              onClick={clearCart}
              className="btn-secondary flex-1"
              disabled={cart.length === 0}
            >
              Clear
            </button>
            <button
              onClick={handleCheckout}
              className="btn-primary flex-[2]"
              disabled={cart.length === 0}
            >
              Checkout
            </button>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[80vh] overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Select Customer</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              <div className="space-y-2">
                {mockCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(false);
                    }}
                    className="w-full p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-accent transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          customer.type === 'consignment' ? 'badge-warning' : 
                          customer.type === 'marketplace' ? 'badge-success' : 'bg-muted text-muted-foreground'
                        )}>
                          {customer.type}
                        </span>
                        <p className="text-sm font-medium text-foreground mt-1">
                          Credit: {formatCurrency(customer.creditBalance)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md animate-scale-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Confirm Payment</h3>
              <p className="text-muted-foreground">
                Total: <span className="text-2xl font-bold text-primary">{formatCurrency(cartTotals.total)}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Payment Method: {paymentMethods.find(m => m.value === selectedPayment)?.label}
              </p>
              {selectedCustomer && (
                <p className="text-sm text-muted-foreground">
                  Customer: {selectedCustomer.name}
                </p>
              )}
            </div>
            <div className="p-4 border-t border-border flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                className="btn-primary flex-1"
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
