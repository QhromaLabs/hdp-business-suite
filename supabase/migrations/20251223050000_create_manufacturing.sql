-- Manufacturing Module Tables

-- 1. Recipes Table
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_variant_id UUID NOT NULL REFERENCES public.product_variants(id),
    name TEXT NOT NULL,
    description TEXT,
    yield_quantity NUMERIC NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Recipe Items Table (Ingredients)
CREATE TABLE IF NOT EXISTS public.recipe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    material_variant_id UUID NOT NULL REFERENCES public.product_variants(id), -- Raw Material
    quantity NUMERIC NOT NULL, -- Quantity required per recipe yield
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Production Batches Table
CREATE TABLE IF NOT EXISTS public.production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id),
    quantity NUMERIC NOT NULL, -- Number of recipe yields to produce
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Function to Complete Production Batch
CREATE OR REPLACE FUNCTION public.complete_production_batch(batch_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    batch_record RECORD;
    recipe_record RECORD;
    item_record RECORD;
    required_qty NUMERIC;
BEGIN
    -- Get batch info
    SELECT * INTO batch_record FROM public.production_batches WHERE id = batch_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Production Batch not found';
    END IF;

    IF batch_record.status = 'completed' THEN
        RAISE EXCEPTION 'Batch is already completed';
    END IF;

    -- Get recipe info
    SELECT * INTO recipe_record FROM public.recipes WHERE id = batch_record.recipe_id;

    -- Loop through recipe items to deduct raw materials
    FOR item_record IN 
        SELECT * FROM public.recipe_items WHERE recipe_id = batch_record.recipe_id
    LOOP
        required_qty := item_record.quantity * batch_record.quantity;

        -- 1. Deduct Raw Material Inventory
        UPDATE public.inventory 
        SET quantity = quantity - required_qty,
            last_stock_date = NOW()
        WHERE variant_id = item_record.material_variant_id;
        
        -- Log Deduction
        INSERT INTO public.inventory_transactions (
            variant_id, transaction_type, quantity_change, 
            reference_type, reference_id, notes, created_by
        ) VALUES (
            item_record.material_variant_id, 'production_use', -required_qty,
            'production_batch', batch_id, 'Used for Batch ' || batch_record.id, batch_record.created_by
        );
    END LOOP;

    -- 2. Add Finished Good Inventory
    INSERT INTO public.inventory (variant_id, quantity, last_stock_date)
    VALUES (recipe_record.product_variant_id, batch_record.quantity * recipe_record.yield_quantity, NOW())
    ON CONFLICT (variant_id)
    DO UPDATE SET
        quantity = inventory.quantity + EXCLUDED.quantity,
        last_stock_date = NOW();

    -- Log Addition
    INSERT INTO public.inventory_transactions (
        variant_id, transaction_type, quantity_change, 
        reference_type, reference_id, notes, created_by
    ) VALUES (
        recipe_record.product_variant_id, 'production_yield', batch_record.quantity * recipe_record.yield_quantity,
        'production_batch', batch_id, 'Yield from Batch ' || batch_record.id, batch_record.created_by
    );

    -- 3. Update Batch Status
    UPDATE public.production_batches
    SET status = 'completed',
        end_date = NOW(),
        updated_at = NOW()
    WHERE id = batch_id;

END;
$$;
