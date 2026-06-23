-- Create robust inventory restocking trigger function for deleted order items
CREATE OR REPLACE FUNCTION public.handle_sales_order_item_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  -- Get the current quantity, defaulting to 0 if not found
  SELECT quantity INTO v_previous_quantity 
  FROM public.inventory 
  WHERE variant_id = OLD.variant_id 
  LIMIT 1;

  IF v_previous_quantity IS NULL THEN
     v_previous_quantity := 0;
  END IF;

  v_new_quantity := v_previous_quantity + OLD.quantity;

  -- Insert compensating transaction log
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
    OLD.variant_id, 
    'restock', 
    OLD.quantity, 
    v_previous_quantity, 
    v_new_quantity, 
    'sales_order', 
    OLD.order_id, 
    'Auto restock from deleted sales order item',
    NOW()
  );

  -- Update inventory table
  UPDATE public.inventory 
  SET quantity = v_new_quantity,
      updated_at = NOW()
  WHERE variant_id = OLD.variant_id;

  -- If no row was updated, it means the inventory record didn't exist. We should insert one.
  IF NOT FOUND THEN
    INSERT INTO public.inventory (variant_id, quantity, reserved_quantity, warehouse_location, updated_at)
    VALUES (OLD.variant_id, v_new_quantity, 0, 'Main Warehouse', NOW());
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_sales_order_item_delete ON public.sales_order_items;

-- Create the new delete trigger
CREATE TRIGGER on_sales_order_item_delete
AFTER DELETE ON public.sales_order_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_sales_order_item_delete();
