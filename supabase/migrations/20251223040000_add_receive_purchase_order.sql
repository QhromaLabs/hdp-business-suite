-- Add items_received column to purchase_orders
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS items_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

-- Function to receive purchase order items and update inventory/costs
CREATE OR REPLACE FUNCTION public.receive_purchase_order(order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    po_record RECORD;
    item_record RECORD;
BEGIN
    -- 1. Get the purchase order
    SELECT * INTO po_record FROM public.purchase_orders WHERE id = order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase Order not found';
    END IF;

    IF po_record.items_received THEN
        RAISE EXCEPTION 'Items for this order have already been received';
    END IF;

    -- 2. Loop through items
    FOR item_record IN 
        SELECT * FROM public.purchase_order_items WHERE purchase_order_id = order_id
    LOOP
        -- 3. Update Inventory (Increment Quantity)
        INSERT INTO public.inventory (variant_id, quantity, last_stock_date)
        VALUES (item_record.variant_id, item_record.quantity, NOW())
        ON CONFLICT (variant_id) 
        DO UPDATE SET 
            quantity = inventory.quantity + EXCLUDED.quantity,
            last_stock_date = NOW();

        -- 4. Update Cost Price for the Variant
        UPDATE public.product_variants
        SET cost_price = item_record.unit_cost,
            updated_at = NOW()
        WHERE id = item_record.variant_id;

        -- 5. Create Inventory Transaction Log
        INSERT INTO public.inventory_transactions (
            variant_id,
            transaction_type,
            quantity_change,
            previous_quantity, -- approximate, strictly for audit trail
            new_quantity,      -- approximate
            reference_type,
            reference_id,
            notes,
            created_by
        )
        VALUES (
            item_record.variant_id,
            'purchase_recv',
            item_record.quantity,
            (SELECT quantity - item_record.quantity FROM public.inventory WHERE variant_id = item_record.variant_id),
            (SELECT quantity FROM public.inventory WHERE variant_id = item_record.variant_id),
            'purchase_order',
            order_id,
            'Received from PO #' || po_record.order_number,
            auth.uid()
        );
    END LOOP;

    -- 6. Mark PO as received
    UPDATE public.purchase_orders
    SET items_received = true,
        received_at = NOW()
    WHERE id = order_id;

END;
$$;
