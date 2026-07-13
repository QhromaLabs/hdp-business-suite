-- Create function to resolve negative batches (representing short sales / back-orders) against positive batches chronologically
CREATE OR REPLACE FUNCTION public.resolve_negative_batches(p_variant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_neg_batch RECORD;
  v_pos_batch RECORD;
  v_transfer INTEGER;
BEGIN
  -- Loop through all negative batches for this variant (oldest first)
  FOR v_neg_batch IN 
    SELECT id, quantity_remaining 
    FROM public.inventory_batches 
    WHERE variant_id = p_variant_id AND quantity_remaining < 0
    ORDER BY created_at ASC
  LOOP
    -- For each negative batch, find positive batches to offset it
    FOR v_pos_batch IN 
      SELECT id, quantity_remaining 
      FROM public.inventory_batches 
      WHERE variant_id = p_variant_id AND quantity_remaining > 0
      ORDER BY created_at ASC
    LOOP
      IF v_neg_batch.quantity_remaining >= 0 THEN
        EXIT; -- This negative batch is fully resolved
      END IF;

      -- Calculate how much we can transfer
      v_transfer := LEAST(-v_neg_batch.quantity_remaining, v_pos_batch.quantity_remaining);

      IF v_transfer > 0 THEN
        -- Reduce positive batch
        UPDATE public.inventory_batches 
        SET quantity_remaining = quantity_remaining - v_transfer,
            updated_at = NOW()
        WHERE id = v_pos_batch.id;

        -- Reduce negative batch (bring it closer to 0)
        UPDATE public.inventory_batches 
        SET quantity_remaining = quantity_remaining + v_transfer,
            updated_at = NOW()
        WHERE id = v_neg_batch.id;

        -- Update local variable for the loop
        v_neg_batch.quantity_remaining := v_neg_batch.quantity_remaining + v_transfer;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function on inventory_batches to auto-resolve negative batches upon insert
CREATE OR REPLACE FUNCTION public.handle_inventory_batch_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.resolve_negative_batches(NEW.variant_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to inventory_batches table
DROP TRIGGER IF EXISTS on_inventory_batch_insert ON public.inventory_batches;
CREATE TRIGGER on_inventory_batch_insert
AFTER INSERT ON public.inventory_batches
FOR EACH ROW
EXECUTE FUNCTION public.handle_inventory_batch_insert();

-- One-time execution: Resolve negative batches for all variants in the database
DO $$
DECLARE
  v_variant RECORD;
BEGIN
  FOR v_variant IN SELECT DISTINCT variant_id FROM public.inventory_batches LOOP
    PERFORM public.resolve_negative_batches(v_variant.variant_id);
  END LOOP;
END $$;

-- Correction: Update today's (June 27th, 2026) T2S.G sales to reflect the correct PO-063639 costs (85.07 landed, 72.00 factory)
UPDATE public.sales_order_items
SET landed_cost_at_sale = 85.07,
    factory_cost_at_sale = 72.00
WHERE variant_id = '3bda4fe5-5a98-4eeb-9ac5-c973724c148a'
  AND created_at >= '2026-06-27T00:00:00Z';

-- Update the notes of today's T2S.G sales transactions for audit clarity
UPDATE public.inventory_transactions
SET notes = 'FIFO deduction from sales order (Landed Cost: 85.07, Factory Cost: 72.00) [Corrected]'
WHERE variant_id = '3bda4fe5-5a98-4eeb-9ac5-c973724c148a'
  AND created_at >= '2026-06-27T00:00:00Z'
  AND transaction_type = 'sale';
