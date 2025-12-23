import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Package, Barcode, Wallet, Calendar, Tag, History, Info, List, ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';
import { useProductHistory } from '@/hooks/useProducts';

interface ProductDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any;
}

export function ProductDetailsModal({ isOpen, onClose, product }: ProductDetailsModalProps) {
    if (!product) return null;

    const variant = product.variant || product;
    const prod = variant?.product || product;
    const { data: history, isLoading: isHistoryLoading } = useProductHistory(prod?.id);

    const details = [
        { label: 'Category', value: prod?.category?.name || 'Uncategorized', icon: Tag },
        { label: 'SKU', value: variant?.sku, icon: Package },
        { label: 'Barcode', value: variant?.barcode || 'N/A', icon: Barcode },
        { label: 'Cost Price', value: `KES ${variant?.cost_price || prod?.cost_price || 0}`, icon: Wallet },
        { label: 'Selling Price', value: `KES ${variant?.price || prod?.base_price || 0}`, icon: Wallet },
        { label: 'Current Stock', value: product.quantity ?? 'N/A', icon: Package },
    ];

    const attributes = prod?.attributes ? Object.entries(prod.attributes) : [];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                        {prod?.image_url ? (
                            <img src={prod.image_url} alt={prod.name} className="w-16 h-16 rounded-xl object-cover border border-border" />
                        ) : (
                            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <Package className="w-8 h-8" />
                            </div>
                        )}
                        <div>
                            <DialogTitle className="text-2xl font-bold">{prod?.name}</DialogTitle>
                            <DialogDescription className="sr-only">
                                Product details and stock movements for {prod?.name}
                            </DialogDescription>
                            <p className="text-muted-foreground text-sm flex items-center gap-2">
                                <Tag className="w-3 h-3" />
                                {prod?.category?.name || 'No Category'}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="overview" className="mt-6">
                    <TabsList className="grid w-full grid-cols-3 h-12">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="attributes" className="flex items-center gap-2">
                            <List className="w-4 h-4" />
                            Attributes
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <History className="w-4 h-4" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 py-4 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-muted/30 p-4 rounded-xl border border-border">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                <Info className="w-4 h-4 text-primary" />
                                Description
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {prod?.description || 'No description provided.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {details.map((item) => (
                                <div key={item.label} className="bg-card p-4 rounded-xl border border-border transition-colors hover:border-primary/20 group">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1 group-hover:text-primary transition-colors">
                                        <item.icon className="w-3.5 h-3.5" />
                                        {item.label}
                                    </span>
                                    <p className="text-base font-bold text-foreground">
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="attributes" className="py-4 animate-in fade-in slide-in-from-top-2">
                        {attributes.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {attributes.map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                                        <span className="text-sm font-medium text-muted-foreground capitalize">{key}</span>
                                        <span className="text-sm font-semibold">{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                                <Tag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-muted-foreground">No custom attributes for this product.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="py-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-primary" />
                                    Stock Movements
                                </h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Change</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history?.stock.map((tx: any) => (
                                            <TableRow key={tx.id}>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(tx.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="capitalize font-medium">{tx.transaction_type}</TableCell>
                                                <TableCell className={`text-right font-bold ${tx.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    <span className="flex items-center justify-end gap-1">
                                                        {tx.quantity_change > 0 ? <Plus className="w-3 h-3" /> : null}
                                                        {tx.quantity_change}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {history?.stock.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                                                    No stock movements recorded yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-primary" />
                                    Recent Sales
                                </h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history?.sales.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(item.order.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="font-medium">{item.order.customer?.name || 'Direct Sale'}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right font-bold text-primary">
                                                    KES {item.subtotal}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {history?.sales.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                                                    No sales recorded yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
