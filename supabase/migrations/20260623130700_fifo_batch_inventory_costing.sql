-- 1. Create inventory_batches table
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    initial_quantity INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    landed_cost_per_unit DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for inventory_batches
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_batches
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'inventory_batches') THEN
        CREATE POLICY "Enable read access for all users" ON public.inventory_batches FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert access for all users' AND tablename = 'inventory_batches') THEN
        CREATE POLICY "Enable insert access for all users" ON public.inventory_batches FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable update access for all users' AND tablename = 'inventory_batches') THEN
        CREATE POLICY "Enable update access for all users" ON public.inventory_batches FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable delete access for all users' AND tablename = 'inventory_batches') THEN
        CREATE POLICY "Enable delete access for all users" ON public.inventory_batches FOR DELETE USING (true);
    END IF;
END $$;

-- 2. Add landed_cost_at_sale to sales_order_items
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS landed_cost_at_sale DECIMAL(12,2) DEFAULT 0;

-- 3. Create FIFO inventory deduction helper function
CREATE OR REPLACE FUNCTION public.deduct_inventory_fifo(p_variant_id UUID, p_qty_to_deduct INTEGER)
RETURNS DECIMAL AS $$
DECLARE
  v_qty_remaining_to_deduct INTEGER := p_qty_to_deduct;
  v_batch RECORD;
  v_total_landed_cost DECIMAL(12,2) := 0;
BEGIN
  FOR v_batch IN 
    SELECT * 
    FROM public.inventory_batches 
    WHERE variant_id = p_variant_id AND quantity_remaining > 0
    ORDER BY created_at ASC
  LOOP
    IF v_qty_remaining_to_deduct <= 0 THEN
      EXIT;
    END IF;

    IF v_batch.quantity_remaining >= v_qty_remaining_to_deduct THEN
      -- Fulfill completely from this batch
      UPDATE public.inventory_batches 
      SET quantity_remaining = quantity_remaining - v_qty_remaining_to_deduct,
          updated_at = NOW()
      WHERE id = v_batch.id;

      v_total_landed_cost := v_total_landed_cost + (v_qty_remaining_to_deduct * v_batch.landed_cost_per_unit);
      v_qty_remaining_to_deduct := 0;
    ELSE
      -- Fulfill partially and exhaust this batch
      UPDATE public.inventory_batches 
      SET quantity_remaining = 0,
          updated_at = NOW()
      WHERE id = v_batch.id;

      v_total_landed_cost := v_total_landed_cost + (v_batch.quantity_remaining * v_batch.landed_cost_per_unit);
      v_qty_remaining_to_deduct := v_qty_remaining_to_deduct - v_batch.quantity_remaining;
    END IF;
  END LOOP;

  -- Fallback if we sell/deduct below zero (create a negative adjustment batch)
  IF v_qty_remaining_to_deduct > 0 THEN
    DECLARE
      v_current_cost DECIMAL(12,2);
    BEGIN
      SELECT COALESCE(cost_price, 0) INTO v_current_cost 
      FROM public.product_variants 
      WHERE id = p_variant_id;

      INSERT INTO public.inventory_batches (
        variant_id, 
        purchase_order_id, 
        initial_quantity, 
        quantity_remaining, 
        landed_cost_per_unit, 
        created_at,
        updated_at
      ) VALUES (
        p_variant_id, 
        NULL, 
        0, 
        -v_qty_remaining_to_deduct, 
        v_current_cost, 
        NOW(),
        NOW()
      );

      v_total_landed_cost := v_total_landed_cost + (v_qty_remaining_to_deduct * v_current_cost);
    END;
  END IF;

  RETURN v_total_landed_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update sales order item trigger function
CREATE OR REPLACE FUNCTION public.handle_sales_order_item_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_total_landed_cost DECIMAL(12,2) := 0;
  v_previous_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  -- Deduct from batches in FIFO order
  SELECT public.deduct_inventory_fifo(NEW.variant_id, NEW.quantity) INTO v_total_landed_cost;

  -- Calculate unit landed cost at sale
  NEW.landed_cost_at_sale := CASE WHEN NEW.quantity > 0 THEN (v_total_landed_cost / NEW.quantity) ELSE 0 END;

  -- Update main inventory table (quantity cache)
  SELECT quantity INTO v_previous_quantity 
  FROM public.inventory 
  WHERE variant_id = NEW.variant_id 
  LIMIT 1;

  IF v_previous_quantity IS NULL THEN
     v_previous_quantity := 0;
  END IF;

  v_new_quantity := v_previous_quantity - NEW.quantity;

  -- Insert transaction log
  INSERT INTO public.inventory_transactions (
    variant_id, 
    transaction_type, 
    quantity_change, 
    previous_quantity, 
    new_quantity, 
    reference_type, 
    reference_id, 
    notes,
    created_at
  ) VALUES (
    NEW.variant_id, 
    'sale', 
    -NEW.quantity, 
    v_previous_quantity, 
    v_new_quantity, 
    'sales_order', 
    NEW.order_id, 
    'FIFO deduction from sales order (Landed Cost: ' || ROUND(NEW.landed_cost_at_sale, 2) || ')',
    NOW()
  );

  UPDATE public.inventory 
  SET quantity = v_new_quantity,
      updated_at = NOW()
  WHERE variant_id = NEW.variant_id;

  IF NOT FOUND THEN
    INSERT INTO public.inventory (variant_id, quantity, reserved_quantity, warehouse_location, updated_at)
    VALUES (NEW.variant_id, v_new_quantity, 0, 'Main Warehouse', NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to handle other inventory transactions (re-stocking, manufacturing output, adjustments)
CREATE OR REPLACE FUNCTION public.handle_inventory_transaction_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_current_cost DECIMAL(12,2);
  v_discard DECIMAL;
BEGIN
  -- We only create batches when stock is INCREASED (quantity_change > 0)
  -- and it's NOT a purchase receipt (since the PO receive modal handles purchase_recv batches directly)
  IF NEW.quantity_change > 0 AND NEW.transaction_type != 'purchase_recv' THEN
    SELECT COALESCE(cost_price, 0) INTO v_current_cost 
    FROM public.product_variants 
    WHERE id = NEW.variant_id;

    INSERT INTO public.inventory_batches (
      variant_id, 
      purchase_order_id, 
      initial_quantity, 
      quantity_remaining, 
      landed_cost_per_unit, 
      created_at,
      updated_at
    ) VALUES (
      NEW.variant_id, 
      NULL, 
      NEW.quantity_change, 
      NEW.quantity_change, 
      v_current_cost, 
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.created_at, NOW())
    );
  -- If stock is DECREASED manually (not a sale)
  ELSIF NEW.quantity_change < 0 AND NEW.transaction_type != 'sale' THEN
    SELECT public.deduct_inventory_fifo(NEW.variant_id, -NEW.quantity_change) INTO v_discard;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create it
DROP TRIGGER IF EXISTS on_inventory_transaction_insert ON public.inventory_transactions;
CREATE TRIGGER on_inventory_transaction_insert
AFTER INSERT ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_inventory_transaction_insert();

-- 6. Backfill existing purchase order items as inventory batches
DO $$
DECLARE
  v_po RECORD;
  v_item RECORD;
  v_subtotal DECIMAL(12,2);
  v_total_var_cost DECIMAL(12,2);
  v_share DECIMAL;
  v_allocated_cost DECIMAL(12,2);
  v_unit_landed_cost DECIMAL(12,2);
BEGIN
  FOR v_po IN 
    SELECT id, creditor_id, created_at, 
           COALESCE(freight_cost, 0) as freight, 
           COALESCE(customs_cost, 0) as customs, 
           COALESCE(handling_cost, 0) as handling
    FROM public.purchase_orders
  LOOP
    -- Calculate total variable costs for this PO
    v_total_var_cost := v_po.freight + v_po.customs + v_po.handling;
    
    -- Calculate items subtotal
    SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
    FROM public.purchase_order_items
    WHERE purchase_order_id = v_po.id;

    -- Create batch for each item
    FOR v_item IN 
      SELECT id, variant_id, quantity, unit_cost, subtotal, created_at
      FROM public.purchase_order_items
      WHERE purchase_order_id = v_po.id
    LOOP
      v_share := CASE WHEN v_subtotal > 0 THEN v_item.subtotal / v_subtotal ELSE 0 END;
      v_allocated_cost := v_total_var_cost * v_share;
      v_unit_landed_cost := CASE WHEN v_item.quantity > 0 THEN (v_item.subtotal + v_allocated_cost) / v_item.quantity ELSE v_item.unit_cost END;

      -- Check if we already backfilled this PO item batch
      IF NOT EXISTS (SELECT 1 FROM public.inventory_batches WHERE purchase_order_id = v_po.id AND variant_id = v_item.variant_id) THEN
        INSERT INTO public.inventory_batches (
          variant_id, 
          purchase_order_id, 
          initial_quantity, 
          quantity_remaining, 
          landed_cost_per_unit, 
          created_at,
          updated_at
        ) VALUES (
          v_item.variant_id,
          v_po.id,
          v_item.quantity,
          v_item.quantity, -- We will run sales deduction next to adjust remaining quantity
          v_unit_landed_cost,
          COALESCE(v_item.created_at, v_po.created_at, NOW()),
          COALESCE(v_item.created_at, v_po.created_at, NOW())
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 7. Backfill non-PO stock as default batches (using current variant cost_price)
DO $$
DECLARE
  v_inv RECORD;
  v_batch_sum INTEGER;
  v_diff INTEGER;
  v_cost DECIMAL(12,2);
BEGIN
  FOR v_inv IN 
    SELECT variant_id, quantity FROM public.inventory
  LOOP
    -- Get current sum of batch remaining quantities for this variant
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO v_batch_sum
    FROM public.inventory_batches
    WHERE variant_id = v_inv.variant_id;

    v_diff := v_inv.quantity - v_batch_sum;

    -- If there's more inventory than we have batch logs for, create a default starting batch for the remainder
    IF v_diff > 0 THEN
      SELECT COALESCE(cost_price, 0) INTO v_cost
      FROM public.product_variants
      WHERE id = v_inv.variant_id;

      INSERT INTO public.inventory_batches (
        variant_id, 
        purchase_order_id, 
        initial_quantity, 
        quantity_remaining, 
        landed_cost_per_unit, 
        created_at,
        updated_at
      ) VALUES (
        v_inv.variant_id,
        NULL,
        v_diff,
        v_diff,
        v_cost,
        NOW() - INTERVAL '1 year', -- set in the past to make sure it's used first
        NOW() - INTERVAL '1 year'
      );
    END IF;
  END LOOP;
END $$;

-- 8. Chronological FIFO deduction replay for existing sales
DO $$
DECLARE
  v_sale RECORD;
  v_discard DECIMAL;
BEGIN
  -- Iterate through all sales items in chronological order to deduct from batches and set landed_cost_at_sale
  FOR v_sale IN 
    SELECT id, variant_id, quantity, created_at
    FROM public.sales_order_items
    ORDER BY created_at ASC
  LOOP
    -- Deduct quantity and get the landed cost
    SELECT public.deduct_inventory_fifo(v_sale.variant_id, v_sale.quantity) INTO v_discard;
    
    -- Update the sale item with the calculated landed cost per unit
    UPDATE public.sales_order_items
    SET landed_cost_at_sale = CASE WHEN v_sale.quantity > 0 THEN (v_discard / v_sale.quantity) ELSE 0 END
    WHERE id = v_sale.id;
  END LOOP;
END $$;

-- 9. Correct remaining quantities in batches to match current inventory levels exactly
-- (in case of manual transactions or other mismatches in history)
DO $$
DECLARE
  v_inv RECORD;
  v_batch_sum INTEGER;
  v_diff INTEGER;
  v_cost DECIMAL(12,2);
  v_batch RECORD;
  v_deducted INTEGER;
BEGIN
  FOR v_inv IN 
    SELECT variant_id, quantity FROM public.inventory
  LOOP
    SELECT COALESCE(SUM(quantity_remaining), 0) INTO v_batch_sum
    FROM public.inventory_batches
    WHERE variant_id = v_inv.variant_id;

    v_diff := v_inv.quantity - v_batch_sum;

    IF v_diff > 0 THEN
      -- Create a correcting batch
      SELECT COALESCE(cost_price, 0) INTO v_cost
      FROM public.product_variants
      WHERE id = v_inv.variant_id;

      INSERT INTO public.inventory_batches (
        variant_id, 
        purchase_order_id, 
        initial_quantity, 
        quantity_remaining, 
        landed_cost_per_unit, 
        created_at,
        updated_at
      ) VALUES (
        v_inv.variant_id,
        NULL,
        v_diff,
        v_diff,
        v_cost,
        NOW(),
        NOW()
      );
    ELSIF v_diff < 0 THEN
      -- Reduce from batches to match inventory
      v_deducted := -v_diff;
      FOR v_batch IN 
        SELECT id, quantity_remaining 
        FROM public.inventory_batches 
        WHERE variant_id = v_inv.variant_id AND quantity_remaining > 0
        ORDER BY created_at DESC -- reduce from newest first to preserve older batch costs if possible
      LOOP
        IF v_deducted <= 0 THEN
          EXIT;
        END IF;

        IF v_batch.quantity_remaining >= v_deducted THEN
          UPDATE public.inventory_batches 
          SET quantity_remaining = quantity_remaining - v_deducted 
          WHERE id = v_batch.id;
          v_deducted := 0;
        ELSE
          UPDATE public.inventory_batches 
          SET quantity_remaining = 0 
          WHERE id = v_batch.id;
          v_deducted := v_deducted - v_batch.quantity_remaining;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 10. Re-create the sales order item trigger as BEFORE INSERT to allow modifying NEW row
DROP TRIGGER IF EXISTS on_sales_order_item_insert ON public.sales_order_items;
CREATE TRIGGER on_sales_order_item_insert
BEFORE INSERT ON public.sales_order_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_sales_order_item_insert();

