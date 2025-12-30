import { SalesOrder } from "@/hooks/useSalesOrders";
import { format } from "date-fns";

interface ReceiptProps {
    order: SalesOrder;
    items: any[];
    settings?: {
        storeName: string;
        storeAddress: string;
        storePhone: string;
        taxRate: number;
        taxEnabled: boolean;
    };
}

export const ReceiptContent = ({ order, items, settings }: ReceiptProps) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KSh',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const subtotal = Number(order.subtotal) || 0;
    const total = Number(order.total_amount) || 0;
    // If distinct tax amount isn't stored, we might calculate or assume it's included/excluded based on taxEnabled
    // For now we use what's on the order object or fallback
    const taxAmount = Number(order.tax_amount) || (settings?.taxEnabled ? total - subtotal : 0);

    return (
        <div className="receipt-container" style={{
            width: '80mm',
            padding: '5px',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12px',
            lineHeight: '1.2',
            color: 'black',
            backgroundColor: 'white',
        }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0' }}>
                    {settings?.storeName || 'HDPK K LTD'}
                </h2>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>
                    {settings?.storeAddress || 'P.O BOX 45678-00200 NAIROBI'}
                </p>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>
                    TEL: {settings?.storePhone || '00111111111'}
                </p>
            </div>

            <div style={{ borderBottom: '1px dashed black', margin: '5px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>Ord: {order.order_number}</span>
                <span>{format(new Date(order.created_at), 'dd/MM/yy HH:mm')}</span>
            </div>
            <div style={{ fontSize: '10px', marginBottom: '5px' }}>
                Cost: {order.customer?.name || 'Walk-in'}
            </div>

            <div style={{ borderBottom: '1px dashed black', margin: '5px 0' }} />

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                    <tr style={{ textAlign: 'left' }}>
                        <th style={{ paddingBottom: '3px' }}>Item</th>
                        <th style={{ textAlign: 'right', paddingBottom: '3px', width: '25px' }}>Qty</th>
                        <th style={{ textAlign: 'right', paddingBottom: '3px', width: '40px' }}>Gross</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ paddingBottom: '2px', paddingRight: '2px' }}>
                                <div style={{ fontWeight: 'bold' }}>{item.variant?.product?.name}</div>
                                <div style={{ fontSize: '9px' }}>{item.variant?.variant_name}</div>
                                <div style={{ fontSize: '9px' }}>Wgt: {Number(item.unit_price).toLocaleString()}g</div>
                            </td>
                            <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                                {Math.round(Number(item.total_price))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ borderBottom: '1px dashed black', margin: '5px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Subtotal Gross:</span>
                <span>{formatCurrency(subtotal)}</span>
            </div>

            {settings?.taxEnabled && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '10px' }}>
                    <span>VAT:</span>
                    <span>{formatCurrency(taxAmount)}</span>
                </div>
            )}

            {Number(order.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '10px' }}>
                    <span>Discount:</span>
                    <span>-{formatCurrency(Number(order.discount_amount))}</span>
                </div>
            )}

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '5px',
                fontWeight: 'bold',
                fontSize: '14px'
            }}>
                <span>TOTAL GROSS WEIGHT:</span>
                <span>{formatCurrency(total)}</span>
            </div>

            <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }} />

            <div style={{ textAlign: 'center', fontSize: '10px' }}>
                <p style={{ margin: '2px 0' }}>Paid via {order.payment_method}</p>
                <p style={{ margin: '5px 0' }}>Thank you for shopping with us!</p>
                <p style={{ margin: '2px 0' }}>Powered by Qraft</p>
            </div>
        </div>
    );
};
