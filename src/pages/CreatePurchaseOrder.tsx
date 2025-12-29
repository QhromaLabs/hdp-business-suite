
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Plus, Trash2, Save, Loader2, Search, Truck, Scale, Gavel } from 'lucide-react';
import { toast } from 'sonner';

interface CreatePurchaseOrderProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreatePurchaseOrder({ onClose, onSuccess }: CreatePurchaseOrderProps) {
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Form State
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [paidAmount, setPaidAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Variable Costs
    const [freightCost, setFreightCost] = useState('');
    const [customsCost, setCustomsCost] = useState('');
    const [handlingCost, setHandlingCost] = useState('');

    // Cart State
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Initial Data
    useEffect(() => {
        const fetchData = async () => {
            const [supRes, prodRes] = await Promise.all([
                supabase.from('creditors').select('id, name').order('name'),
                supabase.from('product_variants').select('id, variant_name, cost_price, product:products(name)').order('created_at', { ascending: false })
            ]);

            if (supRes.data) setSuppliers(supRes.data);
            if (prodRes.data) setProducts(prodRes.data);
        };
        fetchData();
    }, []);

    const filteredProducts = products.filter(p =>
        p.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.variant_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addItem = (product: any) => {
        setItems([...items, {
            variant_id: product.id,
            name: `${product.product?.name} (${product.variant_name})`,
            quantity: 1,
            unit_cost: product.cost_price || 0
        }]);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateSubtotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    };

    const calculateTotalVariableCosts = () => {
        return (parseFloat(freightCost) || 0) + (parseFloat(customsCost) || 0) + (parseFloat(handlingCost) || 0);
    };

    // The logic: Total Amount usually means what we owe the SUPPLIER.
    // Freight/Customs might be paid to 3rd parties.
    // Assuming for now these costs are part of the PO total if the supplier bills them.
    // If they are separate bills (e.g. DHL for freight, KRA for customs), they shouldn't increase the PO Total owed to Supplier X.
    // However, usually "Landed Cost" tracks these.
    // For simplicity in this request "Cost of products ... + variable costs", we will store them on the PO.
    // But does the Supplier charge them? 
    // Let's assume these are just informational for Costing purposes, OR they are added to the Bill.
    // To be safe, we will treat 'Total Amount' as (Items Subtotal). Variable costs are stored separately.
    // If they were part of the supplier invoice, the user would likely add them as line items or we'd sum them.
    // Let's keep Total Amount = Subtotal of Items.
    // And store costs in columns.

    const calculateTotal = () => {
        return calculateSubtotal();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedSupplier) {
            toast.error('Please select a supplier');
            return;
        }
        if (items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        const subtotal = calculateSubtotal();
        const totalAmount = subtotal; // For now, assuming PO Total is just items.
        const initialPayment = parseFloat(paidAmount) || 0;

        if (initialPayment > totalAmount) {
            toast.error('Initial payment cannot exceed total amount');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Purchase Order
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .insert([{
                    creditor_id: selectedSupplier,
                    order_number: `PO-${Date.now().toString().slice(-6)}`,
                    total_amount: totalAmount,
                    paid_amount: initialPayment,
                    status: initialPayment >= totalAmount ? 'completed' : 'pending',
                    notes,
                    expected_date: expectedDate || null,
                    created_at: new Date(orderDate).toISOString(),
                    freight_cost: parseFloat(freightCost) || 0,
                    customs_cost: parseFloat(customsCost) || 0,
                    handling_cost: parseFloat(handlingCost) || 0
                }])
                .select()
                .single();

            if (poError) throw poError;

            // 2. Create PO Items
            const poItems = items.map(item => ({
                purchase_order_id: po.id,
                variant_id: item.variant_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                subtotal: item.quantity * item.unit_cost
            }));

            const { error: itemsError } = await supabase
                .from('purchase_order_items')
                .insert(poItems);

            if (itemsError) throw itemsError;

            // REMOVED: Immediate Inventory Update. 
            // Inventory should only be updated when "Received".

            // 3. Handle Financials

            // A. Creditor Ledger (Bill)
            const { error: billError } = await supabase
                .from('creditor_transactions')
                .insert([{
                    creditor_id: selectedSupplier,
                    transaction_type: 'bill',
                    amount: totalAmount,
                    reference_number: po.order_number,
                    notes: 'Purchase Order Bill',
                    created_at: new Date(orderDate).toISOString()
                }]);
            if (billError) throw billError;

            // B. Record Payment if any
            if (initialPayment > 0) {
                // i. Creditor Transaction
                const { error: payError } = await supabase
                    .from('creditor_transactions')
                    .insert([{
                        creditor_id: selectedSupplier,
                        transaction_type: 'payment',
                        amount: initialPayment,
                        reference_number: `PAY-${po.order_number}`,
                        notes: `Initial Payment via ${paymentMethod}`,
                        created_at: new Date(orderDate).toISOString()
                    }]);
                if (payError) throw payError;

                // ii. Purchase Order Payment Record
                const { error: poPayError } = await supabase
                    .from('purchase_order_payments')
                    .insert([{
                        purchase_order_id: po.id,
                        amount: initialPayment,
                        payment_date: new Date(orderDate).toISOString(),
                        payment_method: paymentMethod,
                        reference_number: `PAY-${po.order_number}`,
                        notes: 'Initial Down Payment'
                    }]);

                if (poPayError) throw poPayError;
            }

            // C. Update Creditor Outstanding Balance
            // Balance = Previous + Bill - Payment
            const { data: creditorData } = await supabase
                .from('creditors')
                .select('outstanding_balance')
                .eq('id', selectedSupplier)
                .single();

            const currentBalance = creditorData?.outstanding_balance || 0;
            const newBalance = currentBalance + totalAmount - initialPayment;

            await supabase
                .from('creditors')
                .update({ outstanding_balance: newBalance })
                .eq('id', selectedSupplier);


            toast.success('Purchase Order Created Successfully');
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Error creating PO:', error);
            toast.error('Failed to create PO: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card w-full max-w-5xl max-h-[90vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                    <div>
                        <h2 className="text-xl font-bold">New Purchase Order</h2>
                        <p className="text-sm text-muted-foreground">Restock items and manage supplier bills</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: Form & Cart */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Supplier & Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Supplier</label>
                                <select
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Order Date</label>
                                <input
                                    type="date"
                                    value={orderDate}
                                    onChange={e => setOrderDate(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        {/* Variable Costs Section */}
                        <div className="bg-muted/10 p-4 rounded-xl border border-border space-y-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                <Truck className="w-4 h-4" />
                                Variable / Landed Costs (Estimates)
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Freight</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={freightCost}
                                        onChange={e => setFreightCost(e.target.value)}
                                        className="w-full h-9 px-2 rounded-lg border border-input text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Customs/Tax</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={customsCost}
                                        onChange={e => setCustomsCost(e.target.value)}
                                        className="w-full h-9 px-2 rounded-lg border border-input text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Handling</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={handlingCost}
                                        onChange={e => setHandlingCost(e.target.value)}
                                        className="w-full h-9 px-2 rounded-lg border border-input text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Item Selection */}
                        <div className="space-y-4">
                            {/* Product Search */}
                            <div className="relative z-10">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search products to add..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                {searchTerm && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-60 overflow-auto py-1">
                                        {filteredProducts.length === 0 ? (
                                            <div className="p-3 text-sm text-muted-foreground text-center">No products found</div>
                                        ) : (
                                            filteredProducts.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => addItem(p)}
                                                    className="w-full text-left px-4 py-2 hover:bg-muted/50 text-sm flex justify-between items-center"
                                                >
                                                    <span>{p.product?.name} <span className="text-muted-foreground">({p.variant_name})</span></span>
                                                    <span className="text-xs font-mono text-muted-foreground">Cost: {p.cost_price}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Cart Items Table */}
                            <div className="border border-border rounded-2xl overflow-hidden bg-card">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/30 text-muted-foreground h-9">
                                        <tr>
                                            <th className="px-4 text-left font-medium">Item</th>
                                            <th className="px-2 text-center font-medium w-20">Qty</th>
                                            <th className="px-2 text-right font-medium w-24">Unit Cost</th>
                                            <th className="px-2 text-right font-medium w-24">Total</th>
                                            <th className="px-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {items.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                    No items added. Search products above.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-muted/10">
                                                    <td className="px-4 py-2 font-medium">{item.name}</td>
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                                            className="w-full text-center bg-transparent border-b border-transparent focus:border-primary focus:outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={item.unit_cost}
                                                            onChange={e => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                            className="w-full text-right bg-transparent border-b border-transparent focus:border-primary focus:outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-mono">
                                                        {(item.quantity * item.unit_cost).toLocaleString()}
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <button
                                                            onClick={() => removeItem(idx)}
                                                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Delivery instructions, reference numbers, etc."
                                className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[60px]"
                            />
                        </div>
                    </div>

                    {/* Right Column: Calculations & Submit */}
                    <div className="space-y-6">
                        <div className="bg-muted/10 border border-border rounded-2xl p-6 space-y-4 sticky top-0">
                            <h3 className="font-semibold text-lg border-b border-border pb-2">Order Summary</h3>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Items Subtotal</span>
                                    <span className="font-mono">{calculateSubtotal().toLocaleString()}</span>
                                </div>
                                {calculateTotalVariableCosts() > 0 && (
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Variable Costs</span>
                                        <span className="font-mono">+{calculateTotalVariableCosts().toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-border">
                                    <span className="font-bold text-base">Total Amount</span>
                                    <span className="font-bold text-xl text-primary font-mono">
                                        KES {calculateTotal().toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-border">
                                <label className="text-sm font-medium block">Initial Payment</label>

                                <select
                                    className="w-full h-9 px-2 mb-2 rounded-lg border border-input text-sm bg-background"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="mpesa">M-Pesa</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="capital">Capital Injection</option>
                                </select>

                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">KES</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max={calculateTotal()}
                                        value={paidAmount}
                                        onChange={e => setPaidAmount(e.target.value)}
                                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Remaining Balance: <span className="font-medium text-destructive">
                                        KES {(calculateTotal() - (parseFloat(paidAmount) || 0)).toLocaleString()}
                                    </span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Expected Delivery</label>
                                <input
                                    type="date"
                                    value={expectedDate}
                                    onChange={e => setExpectedDate(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading || items.length === 0 || !selectedSupplier}
                                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-4"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Create Order
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
