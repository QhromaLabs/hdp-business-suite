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
  Receipt,
  User,
  UserPlus,
  X,
  Check,
  Loader2,
  ShoppingCart,
  Package,
  ChevronDown,
  GripHorizontal,
  Pencil
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useInventory, useCategories } from '@/hooks/useProducts';
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers';
import { useCreateSalesOrder } from '@/hooks/useSalesOrders';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { POSSkeleton } from '@/components/loading/PageSkeletons';
import { useSettings } from '@/contexts/SettingsContext';
import { calculateTotals } from '@/lib/tax';

type PaymentMethod = Database['public']['Enums']['payment_method'];

interface CartItem {
  variantId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
}

interface CustomerData {
  id: string;
  name: string;
  phone: string | null;
  customer_type: string;
  credit_balance: number;
}

const paymentMethods: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'credit', label: 'Credit', icon: CreditCard },
  { value: 'mpesa', label: 'M-Pesa', icon: Smartphone },
  { value: 'nat', label: 'Bank', icon: Building2 },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function POS() {
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory();
  const { data: categories = [] } = useCategories();
  const { data: customers = [] } = useCustomers();
  const createCustomer = useCreateCustomer();
  const { taxEnabled, taxRate } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [variantPopover, setVariantPopover] = useState<{
    productId: string;
    productName: string;
    variants: any[];
  } | null>(null);
  const [variantModal, setVariantModal] = useState<{
    productId: string;
    productName: string;
    variants: any[];
  } | null>(null);
  const [showNoCustomerAlert, setShowNoCustomerAlert] = useState(false);
  const createOrder = useCreateSalesOrder();

  const categoryNames = ['All', ...categories.map(c => c.name)];

  const filteredProducts = useMemo(() => {
    return inventory.filter(item => {
      const variant = item.variant;
      const product = variant?.product;
      const categoryName = product?.category?.name;

      const matchesSearch =
        product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant?.barcode?.includes(searchQuery);
      const matchesCategory = selectedCategory === 'All' || categoryName === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = cart.reduce((sum, item) => sum + item.discount, 0);
    const { tax, total } = calculateTotals(subtotal, discount, taxEnabled);
    return { subtotal, discount, tax, total };
  }, [cart, taxEnabled]);

  const addToCart = (item: any, quantity = 1) => {
    const variant = item.variant;
    const product = variant?.product;
    if (!variant || !product) return;

    if (item.quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.variantId === variant.id);
      if (existing) {
        return prev.map(i =>
          i.variantId === variant.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, {
        variantId: variant.id,
        name: `${product.name} - ${variant.variant_name}`,
        sku: variant.sku,
        price: Number(variant.price),
        quantity,
        discount: 0,
      }];
    });
    setIsCartExpanded(true); // Auto expand when adding items
    toast.success(`Added ${product.name}`, { duration: 1500 });
  };


  const updateQuantity = (variantId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.variantId === variantId) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const setItemQuantity = (variantId: string, quantity: number) => {
    setCart(prev =>
      prev.map(item =>
        item.variantId === variantId
          ? { ...item, quantity: Math.max(0, quantity) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const updatePrice = (variantId: string, newPrice: number) => {
    setCart(prev =>
      prev.map(item =>
        item.variantId === variantId
          ? { ...item, price: newPrice }
          : item
      )
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variantId !== variantId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const openVariantChooser = (item: any) => {
    const productId = item.variant?.product?.id;
    if (!productId) return addToCart(item);

    const variantsForProduct = inventory.filter(i => i.variant?.product?.id === productId);
    if (variantsForProduct.length <= 1) {
      addToCart(item);
      return;
    }

    setVariantPopover({
      productId,
      productName: item.variant?.product?.name || 'Product',
      variants: variantsForProduct,
    });
    setVariantSelection({
      variantId: item.variant?.id || variantsForProduct[0]?.variant?.id || '',
      quantity: 1,
    });
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.variant?.barcode === barcodeInput);
    if (item) {
      addToCart(item);
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
    if (!selectedCustomer && selectedPayment !== 'credit') {
      setShowNoCustomerAlert(true);
      return;
    }
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    try {
      await createOrder.mutateAsync({
        customer_id: selectedCustomer?.id,
        items: cart.map(item => ({
          variant_id: item.variantId,
          quantity: item.quantity,
          unit_price: item.price,
          discount: item.discount,
        })),
        payment_method: selectedPayment,
        is_credit_sale: selectedPayment === 'credit',
      });
      clearCart();
      setShowPaymentModal(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const confirmVariantSelection = () => {
    const activeData = variantPopover || variantModal;
    if (!activeData) return;

    const chosen = activeData.variants.find(v => v.variant?.id === variantSelection.variantId);
    if (!chosen) {
      toast.error('Select a variant');
      return;
    }
    if ((chosen.quantity || 0) <= 0) {
      toast.error('Selected variant is out of stock');
      return;
    }
    addToCart(chosen, Math.max(1, variantSelection.quantity || 1));
    setVariantPopover(null);
    setVariantModal(null);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;
    try {
      const result = await createCustomer.mutateAsync({
        name: newCustomer.name,
        phone: newCustomer.phone,
        customer_type: 'normal'
      });
      setSelectedCustomer({
        id: result.id,
        name: result.name,
        phone: result.phone,
        customer_type: result.customer_type,
        credit_balance: Number(result.credit_balance || 0),
      });
      setShowQuickAdd(false);
      setShowCustomerModal(false);
      setNewCustomer({ name: '', phone: '' });
    } catch (err) {
      console.error(err);
    }
  };

  if (inventoryLoading) {
    return <POSSkeleton />;
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-6 animate-fade-in">
      {/* Products Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search & Categories */}
        <div className="space-y-5 mb-6">
          <div className="flex gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search products by name, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-12 bg-card/50 backdrop-blur-sm border-border/50 h-12"
              />
            </div>
            <form onSubmit={handleBarcodeSubmit} className="relative w-56 group">
              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Scan barcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="input-field pl-12 h-12 font-mono bg-card/50 backdrop-blur-sm border-border/50"
              />
            </form>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mask-gradient-to-r">
            {categoryNames.map((category, idx) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 animate-slide-up border",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-primary border-border/50"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Receipt className="w-10 h-10 opacity-30" />
              </div>
              <p className="font-medium">No products found</p>
              <p className="text-sm mt-1 opacity-70">Adjust your search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-5 pb-6">
              {filteredProducts.map((item, idx) => {
                const variant = item.variant;
                const product = variant?.product;
                if (!variant || !product) return null;

                return (
                  <button
                    key={item.id}
                    onClick={() => openVariantChooser(item)}
                    className="pos-product-card animate-slide-up group"
                    style={{ animationDelay: `${(idx % 12) * 40}ms` }}
                  >
                    <div className="relative aspect-[4/3] rounded-xl bg-muted/40 mb-4 overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500">
                          <Package className="w-10 h-10 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 z-10">
                        <span className={cn(
                          "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest backdrop-blur-md border shadow-sm",
                          item.quantity > 50
                            ? "bg-success/80 text-white border-success/20"
                            : item.quantity > 0
                              ? "bg-warning/80 text-white border-warning/20"
                              : "bg-destructive/80 text-white border-destructive/20"
                        )}>
                          {item.quantity <= 0 ? 'SOLD OUT' : `${item.quantity} IN STOCK`}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-foreground text-sm line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-70">
                        {variant.sku}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                      <span className="text-lg font-extrabold text-primary">
                        {formatCurrency(Number(variant.price))}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-[400px] pos-cart-container">
        {/* Cart Header */}
        <div className="p-4 border-b border-border/50 bg-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground leading-none">Current Sale</h2>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                {new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>

            {selectedCustomer ? (
              <div className="flex items-center gap-2 bg-primary/10 pl-3 pr-1 py-1 rounded-full border border-primary/20 animate-scale-in">
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-primary truncate max-w-[100px]">
                  {selectedCustomer.name}
                </span>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomerModal(true)}
                className="h-10 w-10 border-2 border-dashed border-primary/30 rounded-full flex items-center justify-center text-primary hover:bg-primary/5 hover:border-primary/50 transition-all group"
                title="Assign Customer"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </div>


        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide bg-card/30">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-muted/20 flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold">Your cart is empty</p>
              <p className="text-xs mt-1">Add items to start the checkout</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.variantId}
                className="bg-card rounded-xl border border-border/50 p-2.5 shadow-sm hover:shadow-md transition-shadow group animate-slide-up"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground text-[13px] leading-tight truncate">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-primary font-bold">
                        {formatCurrency(item.price)}
                      </p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="p-0.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-primary">
                            <Pencil className="w-3 h-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-3" align="start">
                          <div className="space-y-2">
                            <Label htmlFor={`price-${item.variantId}`} className="text-xs font-bold">Edit Price</Label>
                            <Input
                              id={`price-${item.variantId}`}
                              type="number"
                              min="0"
                              defaultValue={item.price}
                              onChange={(e) => updatePrice(item.variantId, Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground">Changes apply to this sale only.</p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.variantId)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center bg-secondary/80 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.variantId, -1)}
                      className="w-6 h-6 rounded-md bg-card shadow-sm flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          setItemQuantity(item.variantId, val);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-10 text-center text-xs font-bold text-foreground bg-transparent border-none p-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => updateQuantity(item.variantId, 1)}
                      className="w-6 h-6 rounded-md bg-card shadow-sm flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-bold text-foreground text-sm">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Collapsible Details Handle */}
        <button
          onClick={() => setIsCartExpanded(!isCartExpanded)}
          className="w-full flex flex-col items-center py-1 bg-accent/5 hover:bg-accent/10 transition-colors border-y border-border/30 group"
        >
          <div className="w-8 h-1 bg-muted rounded-full group-hover:bg-primary/30 transition-colors" />
        </button>

        <div className={cn(
          "transition-all duration-500 ease-in-out overflow-hidden",
          isCartExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}>

          {/* Detailed Totals */}
          <div className="p-5 space-y-2 bg-accent/5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">{formatCurrency(cartTotals.subtotal)}</span>
            </div>
            {taxEnabled && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">VAT ({Math.round(taxRate * 100)}%)</span>
                <span className="font-semibold text-foreground">{formatCurrency(cartTotals.tax)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-4 border-t border-border/30 bg-card">
          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.value}
                  onClick={() => setSelectedPayment(method.value)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl border border-border transition-all",
                    selectedPayment === method.value ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20" : "hover:border-primary/30 hover:bg-accent"
                  )}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-bold uppercase">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fixed Totals & Pay */}
        <div className="p-5 border-t border-border/50 bg-card shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Total Payable</p>
              <p className="text-2xl font-black text-primary tracking-tight leading-none">
                {formatCurrency(cartTotals.total)}
              </p>
            </div>
            <button
              onClick={clearCart}
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all"
              disabled={cart.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCheckout}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black text-lg shadow-lg premium-glow hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:grayscale"
            disabled={cart.length === 0 || createOrder.isPending}
          >
            {createOrder.isPending ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : (
              'PAY NOW'
            )}
          </button>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {variantModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-start justify-center pt-16">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-150 ease-out origin-top animate-slide-down">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Select variant</p>
                <h3 className="text-lg font-semibold text-foreground">{variantModal.productName}</h3>
              </div>
              <button
                onClick={() => setVariantModal(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
                {variantModal.variants.map(v => {
                  const isOutOfStock = v.quantity <= 0;
                  const isSelected = variantSelection.variantId === v.variant?.id;

                  return (
                    <button
                      key={v.variant?.id}
                      disabled={isOutOfStock}
                      onClick={() => setVariantSelection(prev => ({ ...prev, variantId: v.variant?.id }))}
                      className={cn(
                        "flex flex-col p-4 rounded-2xl border transition-all text-left group relative",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border/50 bg-card hover:border-primary/30 hover:bg-accent/5",
                        isOutOfStock && "opacity-50 grayscale cursor-not-allowed"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                          v.quantity > 50 ? "bg-success/10 text-success" : v.quantity > 0 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                        )}>
                          {v.quantity <= 0 ? 'Out of Stock' : `${v.quantity} Left`}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>

                      <p className="font-bold text-foreground text-sm leading-tight mb-1">{v.variant?.variant_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mb-3 uppercase tracking-tighter opacity-70">{v.variant?.sku}</p>

                      <p className="mt-auto text-lg font-black text-primary">
                        {formatCurrency(Number(v.variant?.price))}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Quantity Selector */}
              <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Quantity</p>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-all active:scale-90"
                      onClick={() => setVariantSelection(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="text-xl font-black min-w-[30px] text-center">{variantSelection.quantity}</span>
                    <button
                      type="button"
                      className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-all active:scale-90"
                      onClick={() => setVariantSelection(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={confirmVariantSelection}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all premium-glow"
                >
                  ADD TO CART
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[80vh] overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Select Customer</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-2 text-xs font-bold"
                >
                  <UserPlus className="w-4 h-4" />
                  {showQuickAdd ? 'Back to List' : 'Quick Add'}
                </button>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showQuickAdd ? (
              <form onSubmit={handleQuickAdd} className="p-6 space-y-4 animate-slide-up">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      placeholder="Enter customer name"
                      className="input-field"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder="e.g. 0712345678"
                      className="input-field font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={createCustomer.isPending || !newCustomer.name}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-black shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50"
                >
                  {createCustomer.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'CREATE & SELECT'}
                </button>
              </form>
            ) : (
              <div className="p-4 overflow-y-auto max-h-96">
                {customers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No customers found</p>
                ) : (
                  <div className="space-y-1">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer({
                            id: customer.id,
                            name: customer.name,
                            phone: customer.phone,
                            customer_type: customer.customer_type,
                            credit_balance: Number(customer.credit_balance),
                          });
                          setShowCustomerModal(false);
                        }}
                        className="w-full p-3.5 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all text-left flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{customer.name}</p>
                            <p className="text-[11px] text-muted-foreground">{customer.phone || 'No phone'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                            customer.customer_type === 'consignment' ? 'bg-warning/10 text-warning' :
                              customer.customer_type === 'marketplace' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                          )}>
                            {customer.customer_type}
                          </span>
                          <p className="text-[11px] font-bold text-primary mt-1">
                            {formatCurrency(Number(customer.credit_balance))}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                <p className="text-sm text-muted-foreground mt-1">
                  Customer: {selectedCustomer.name}
                </p>
              )}
            </div>
            <div className="p-4 border-t border-border flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn-secondary flex-1"
                disabled={createOrder.isPending}
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                className="btn-primary flex-1"
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Customer Alert */}
      {showNoCustomerAlert && (
        <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm p-6 shadow-2xl animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No Customer Assigned</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Would you like to assign a customer to this sale for better record keeping, or proceed as a walk-in guest?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowNoCustomerAlert(false);
                  setShowCustomerModal(true);
                }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Select Customer
              </button>
              <button
                onClick={() => {
                  setShowNoCustomerAlert(false);
                  setShowPaymentModal(true);
                }}
                className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:bg-secondary/80 transition-all"
              >
                Proceed as Walk-in
              </button>
              <button
                onClick={() => setShowNoCustomerAlert(false)}
                className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Go back to cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
