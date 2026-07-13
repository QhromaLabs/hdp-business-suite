-- Drop the existing function first (redefining its return type requires dropping it CASCADE)
DROP FUNCTION IF EXISTS public.deduct_inventory_fifo(UUID, INTEGER) CASCADE;

-- Add factory_cost_per_unit to inventory_batches
ALTER TABLE public.inventory_batches ADD COLUMN IF NOT EXISTS factory_cost_per_unit DECIMAL(12,2) DEFAULT 0;

-- Add factory_cost_at_sale to sales_order_items
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS factory_cost_at_sale DECIMAL(12,2) DEFAULT 0;

-- Re-create deduct_inventory_fifo to compute and return both landed cost and factory cost
CREATE OR REPLACE FUNCTION public.deduct_inventory_fifo(p_variant_id UUID, p_qty_to_deduct INTEGER)
RETURNS TABLE (total_landed_cost DECIMAL, total_factory_cost DECIMAL) AS $$
DECLARE
  v_qty_remaining_to_deduct INTEGER := p_qty_to_deduct;
  v_batch RECORD;
  v_total_landed_cost DECIMAL(12,2) := 0;
  v_total_factory_cost DECIMAL(12,2) := 0;
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
      v_total_factory_cost := v_total_factory_cost + (v_qty_remaining_to_deduct * COALESCE(v_batch.factory_cost_per_unit, v_batch.landed_cost_per_unit));
      v_qty_remaining_to_deduct := 0;
    ELSE
      -- Fulfill partially and exhaust this batch
      UPDATE public.inventory_batches 
      SET quantity_remaining = 0,
          updated_at = NOW()
      WHERE id = v_batch.id;

      v_total_landed_cost := v_total_landed_cost + (v_batch.quantity_remaining * v_batch.landed_cost_per_unit);
      v_total_factory_cost := v_total_factory_cost + (v_batch.quantity_remaining * COALESCE(v_batch.factory_cost_per_unit, v_batch.landed_cost_per_unit));
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
        factory_cost_per_unit,
        created_at,
        updated_at
      ) VALUES (
        p_variant_id, 
        NULL, 
        0, 
        -v_qty_remaining_to_deduct, 
        v_current_cost, 
        v_current_cost,
        NOW(),
        NOW()
      );

      v_total_landed_cost := v_total_landed_cost + (v_qty_remaining_to_deduct * v_current_cost);
      v_total_factory_cost := v_total_factory_cost + (v_qty_remaining_to_deduct * v_current_cost);
    END;
  END IF;

  RETURN QUERY SELECT v_total_landed_cost, v_total_factory_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update sales order item trigger function to store both landed and factory cost
CREATE OR REPLACE FUNCTION public.handle_sales_order_item_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_total_landed_cost DECIMAL(12,2) := 0;
  v_total_factory_cost DECIMAL(12,2) := 0;
  v_previous_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  -- Deduct from batches in FIFO order
  SELECT total_landed_cost, total_factory_cost 
  INTO v_total_landed_cost, v_total_factory_cost
  FROM public.deduct_inventory_fifo(NEW.variant_id, NEW.quantity);

  -- Calculate unit costs at sale
  NEW.landed_cost_at_sale := CASE WHEN NEW.quantity > 0 THEN (v_total_landed_cost / NEW.quantity) ELSE 0 END;
  NEW.factory_cost_at_sale := CASE WHEN NEW.quantity > 0 THEN (v_total_factory_cost / NEW.quantity) ELSE 0 END;

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
    'FIFO deduction from sales order (Landed Cost: ' || ROUND(NEW.landed_cost_at_sale, 2) || ', Factory Cost: ' || ROUND(NEW.factory_cost_at_sale, 2) || ')',
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

-- Update transaction trigger function to populate factory_cost_per_unit
CREATE OR REPLACE FUNCTION public.handle_inventory_transaction_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_current_cost DECIMAL(12,2);
  v_discard RECORD;
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
      factory_cost_per_unit,
      created_at,
      updated_at
    ) VALUES (
      NEW.variant_id, 
      NULL, 
      NEW.quantity_change, 
      NEW.quantity_change, 
      v_current_cost, 
      v_current_cost,
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.created_at, NOW())
    );
  -- If stock is DECREASED manually (not a sale)
  ELSIF NEW.quantity_change < 0 AND NEW.transaction_type != 'sale' THEN
    SELECT * INTO v_discard FROM public.deduct_inventory_fifo(NEW.variant_id, -NEW.quantity_change);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to use the new BEFORE INSERT logic in case it was dropped
DROP TRIGGER IF EXISTS on_sales_order_item_insert ON public.sales_order_items;
CREATE TRIGGER on_sales_order_item_insert
BEFORE INSERT ON public.sales_order_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_sales_order_item_insert();

-- Backfill existing batches using PO items unit cost
DO $$
DECLARE
  v_batch RECORD;
  v_unit_cost DECIMAL(12,2);
BEGIN
  FOR v_batch IN SELECT id, variant_id, purchase_order_id, landed_cost_per_unit FROM public.inventory_batches LOOP
    IF v_batch.purchase_order_id IS NOT NULL THEN
      SELECT COALESCE(unit_cost, v_batch.landed_cost_per_unit) INTO v_unit_cost
      FROM public.purchase_order_items
      WHERE purchase_order_id = v_batch.purchase_order_id AND variant_id = v_batch.variant_id
      LIMIT 1;
      
      UPDATE public.inventory_batches
      SET factory_cost_per_unit = COALESCE(v_unit_cost, landed_cost_per_unit)
      WHERE id = v_batch.id;
    ELSE
      UPDATE public.inventory_batches
      SET factory_cost_per_unit = landed_cost_per_unit
      WHERE id = v_batch.id;
    END IF;
  END LOOP;
END $$;

-- Backfill existing sales order items with factory cost
DO $$
DECLARE
  v_sale RECORD;
  v_unit_cost DECIMAL(12,2);
BEGIN
  -- We try to map the sales item to batch information or fall back to landed_cost_at_sale
  FOR v_sale IN SELECT id, variant_id, landed_cost_at_sale FROM public.sales_order_items LOOP
    -- Find a batch for this variant
    SELECT COALESCE(factory_cost_per_unit, landed_cost_per_unit) INTO v_unit_cost
    FROM public.inventory_batches
    WHERE variant_id = v_sale.variant_id
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE public.sales_order_items
    SET factory_cost_at_sale = COALESCE(v_unit_cost, landed_cost_at_sale, 0)
    WHERE id = v_sale.id;
  END LOOP;
END $$;
