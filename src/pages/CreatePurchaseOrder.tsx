
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Plus, Trash2, Save, Loader2, Search } from 'lucide-react';
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
        setSearchTerm(''); // Clear search to show added item easily? No, keep it.
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
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

        const totalAmount = calculateTotal();
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
                    status: initialPayment >= totalAmount ? 'completed' : initialPayment > 0 ? 'partial' : 'pending',
                    notes,
                    expected_date: expectedDate || null,
                    created_at: new Date(orderDate).toISOString()
                }])
                .select()
                .single();

            if (poError) throw poError;

            // 2. Create PO Items and Update Inventory/Cost
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

            // 3. Update Inventory & Cost Price for each item
            for (const item of items) {
                // Determine transaction type
                // Logic: Buying creates 'purchase' stock entry
                await supabase.from('inventory').insert([{
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    transaction_type: 'purchase',
                    notes: `PO #${po.order_number}`
                }]);

                // Update Cost Price if changed (Basic logic: update to latest cost)
                await supabase
                    .from('product_variants')
                    .update({ cost_price: item.unit_cost })
                    .eq('id', item.variant_id);
            }

            // 4. Handle Financials (Creditor Ledger)
            // A. Record the Bill (increases debt)
            // Wait, we need to track debt. 
            // If we pay 100% upfront, debt is 0. 
            // If we pay 0, debt is Total.
            // Creditor Transaction for BILL
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
                const { error: payError } = await supabase
                    .from('creditor_transactions')
                    .insert([{
                        creditor_id: selectedSupplier,
                        transaction_type: 'payment',
                        amount: initialPayment,
                        reference_number: `PAY-${po.order_number}`,
                        notes: 'Initial Payment',
                        created_at: new Date(orderDate).toISOString()
                    }]);
                if (payError) throw payError;
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
            <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-scale-in">

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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium">Supplier</label>
                                    <label className="flex items-center gap-2 text-xs font-medium text-primary cursor-pointer hover:text-primary/80 bg-primary/10 px-2 py-1 rounded-md transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedSupplier === suppliers.find(s => s.name === 'Anonymous Vendor')?.id}
                                            onChange={async (e) => {
                                                if (e.target.checked) {
                                                    const anon = suppliers.find(s => s.name === 'Anonymous Vendor');
                                                    if (anon) {
                                                        setSelectedSupplier(anon.id);
                                                    } else {
                                                        // Auto-create if missing
                                                        try {
                                                            const { data: newAnon, error } = await supabase
                                                                .from('creditors')
                                                                .insert([{
                                                                    name: 'Anonymous Vendor',
                                                                    contact_person: 'Walk-in',
                                                                    address: 'General',
                                                                    outstanding_balance: 0
                                                                }])
                                                                .select()
                                                                .single();

                                                            if (error) throw error;
                                                            if (newAnon) {
                                                                setSuppliers([...suppliers, newAnon]);
                                                                setSelectedSupplier(newAnon.id);
                                                                toast.success('Created Anonymous Vendor record');
                                                            }
                                                        } catch (err: any) {
                                                            console.error('Error creating anonymous vendor:', err);
                                                            toast.error('Could not create Anonymous Vendor. Please add manually.');
                                                        }
                                                    }
                                                } else {
                                                    setSelectedSupplier('');
                                                }
                                            }}
                                            className="w-3.5 h-3.5 rounded border-primary text-primary focus:ring-primary/20 cursor-pointer"
                                        />
                                        Anonymous / Walk-in
                                    </label>
                                </div>
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

                        {/* Item Selection */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                Items
                                <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                    {items.length} items
                                </span>
                            </h3>

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
                                            <th className="px-2 text-right font-medium w-24">Cost</th>
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
                                className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                            />
                        </div>
                    </div>

                    {/* Right Column: Calculations & Submit */}
                    <div className="space-y-6">
                        <div className="bg-muted/10 border border-border rounded-2xl p-6 space-y-4 sticky top-0">
                            <h3 className="font-semibold text-lg border-b border-border pb-2">Order Summary</h3>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-mono">{calculateTotal().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-border">
                                    <span className="font-bold text-base">Total Amount</span>
                                    <span className="font-bold text-xl text-primary font-mono">
                                        KES {calculateTotal().toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-border">
                                <label className="text-sm font-medium">Initial Payment</label>
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
