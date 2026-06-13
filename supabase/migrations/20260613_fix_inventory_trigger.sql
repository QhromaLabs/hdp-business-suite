-- Drop any existing triggers on sales_order_items to avoid duplicates
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'sales_order_items') 
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON sales_order_items';
  END LOOP;
END $$;

-- Create robust inventory deduction function
CREATE OR REPLACE FUNCTION public.handle_sales_order_item_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  -- Get the current quantity, defaulting to 0 if not found
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
    'Auto deduction from sales order',
    NOW()
  );

  -- Update inventory table
  UPDATE public.inventory 
  SET quantity = v_new_quantity,
      updated_at = NOW()
  WHERE variant_id = NEW.variant_id;

  -- If no row was updated, it means the inventory record didn't exist. We should insert one.
  IF NOT FOUND THEN
    INSERT INTO public.inventory (variant_id, quantity, reserved_quantity, warehouse_location, updated_at)
    VALUES (NEW.variant_id, v_new_quantity, 0, 'Main Warehouse', NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the new trigger
CREATE TRIGGER on_sales_order_item_insert
AFTER INSERT ON public.sales_order_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_sales_order_item_insert();
