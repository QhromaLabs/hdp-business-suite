-- Consolidate Manufacturing Schema & Add Costing Logic

-- 1. ENHANCE RAW MATERIALS
-- Ensure unit_of_measure and current_cost exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_materials' AND column_name = 'current_cost') THEN
        ALTER TABLE public.raw_materials ADD COLUMN current_cost DECIMAL(12,2) DEFAULT 0;
    END IF;
    -- Map 'unit' to 'unit_of_measure' if needed, or just use 'unit' which exists
    -- Existing table has 'unit' TEXT NOT NULL. We will stick with that.
END $$;

-- 2. UPDATE RECIPE ITEMS for Non-Inventory Costs
-- Add item_type to distinguish between raw materials and service/overhead
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_items' AND column_name = 'item_type') THEN
        ALTER TABLE public.recipe_items 
        ADD COLUMN item_type TEXT DEFAULT 'raw_material' CHECK (item_type IN ('raw_material', 'service', 'overhead'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_items' AND column_name = 'unit_cost') THEN
        ALTER TABLE public.recipe_items 
        ADD COLUMN unit_cost DECIMAL(12,2) DEFAULT 0; -- For fixed service costs (e.g. Labor per piece)
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_items' AND column_name = 'description') THEN
        ALTER TABLE public.recipe_items 
        ADD COLUMN description TEXT; -- For Service/Overhead names
    END IF;
END $$;

-- 3. CONSOLIDATE PRODUCTION TABLES
-- We will use 'production_runs' as the master table.
-- We must drop 'production_batches' if it exists to avoid confusion.
DROP TABLE IF EXISTS public.production_batches CASCADE;

-- Add recipe_id to production_runs if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_runs' AND column_name = 'recipe_id') THEN
        ALTER TABLE public.production_runs 
        ADD COLUMN recipe_id UUID REFERENCES public.recipes(id);
    END IF;
END $$;

-- 4. CREATE MANUFACTURING LEDGER (The "Suspense Account" Logic)
CREATE TABLE IF NOT EXISTS public.manufacturing_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    production_run_id UUID REFERENCES public.production_runs(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('material_cost', 'labor_cost', 'overhead_cost', 'finished_good_value')),
    
    -- The financial impact
    debit_account TEXT NOT NULL, -- e.g., 'WIP', 'Finished Goods', 'COGS'
    credit_account TEXT NOT NULL, -- e.g., 'Raw Materials Inventory', 'Cash' (for direct labor), 'WIP'
    
    amount DECIMAL(12,2) NOT NULL,
    
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Ledger
ALTER TABLE public.manufacturing_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view manufacturing ledger" 
ON public.manufacturing_ledger FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert manufacturing ledger" 
ON public.manufacturing_ledger FOR INSERT TO authenticated WITH CHECK (true);


-- 5. FUNCTION TO CALCULATE AND EXECUTE PRODUCTION RUN
CREATE OR REPLACE FUNCTION public.complete_production_run(run_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    run_record RECORD;
    recipe_record RECORD;
    item_record RECORD;
    total_material_cost DECIMAL(12,2) := 0;
    total_labor_cost DECIMAL(12,2) := 0;
    total_overhead_cost DECIMAL(12,2) := 0;
    current_material_cost DECIMAL(12,2);
    item_cost DECIMAL(12,2);
BEGIN
    -- Get Production Run
    SELECT * INTO run_record FROM public.production_runs WHERE id = run_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Production Run not found';
    END IF;

    IF run_record.status = 'completed' THEN
        RAISE EXCEPTION 'Production Run is already completed';
    END IF;
    
    -- Get Recipe
    SELECT * INTO recipe_record FROM public.recipes WHERE id = run_record.recipe_id;
    
    IF NOT FOUND THEN
        -- If no recipe (custom run?), we might skip auto-deduction, but for now enforce recipe
        RAISE EXCEPTION 'Recipe not found for this production run'; 
    END IF;

    -- LOOP THROUGH ITEMS
    FOR item_record IN 
        SELECT * FROM public.recipe_items WHERE recipe_id = run_record.recipe_id
    LOOP
        -- Logic splits based on Item Type
        
        IF item_record.item_type = 'raw_material' THEN
            -- 1. RAW MATERIAL LOGIC
            -- Get current cost from Raw Materials table
            SELECT current_cost INTO current_material_cost 
            FROM public.raw_materials 
            WHERE id = item_record.raw_material_id;
            
            -- If no cost set, warn or default to 0 (Critical for accounting)
            current_material_cost := COALESCE(current_material_cost, 0);
            
            -- Calculate cost for this item in this run
            -- Quantity needed = (Item Qty per Yield / Yield Qty) * Run Planned Qty
            -- Simplified: Item Qty is usually per 1 unit or per Yield. Assuming Item Qty is per Yield.
            -- Need to be careful with units. Assuming simple scaling for now.
            item_cost := (item_record.quantity * run_record.actual_quantity) * current_material_cost;
            
            total_material_cost := total_material_cost + item_cost;

            -- DEDUCT INVENTORY (Logic carried over from previous migration concept)
            UPDATE public.raw_materials
            SET quantity_in_stock = quantity_in_stock - (item_record.quantity * run_record.actual_quantity)
            WHERE id = item_record.raw_material_id;

            -- LOG LEDGER ENTRY (Credit Raw Material, Debit WIP)
            INSERT INTO public.manufacturing_ledger (
                production_run_id, transaction_type, debit_account, credit_account, amount, notes
            ) VALUES (
                run_id, 'material_cost', 'WIP', 'Raw Materials Inventory', item_cost, 
                'Material Deduction: ' || item_record.raw_material_id
            );

        ELSIF item_record.item_type = 'service' THEN
            -- 2. LABOR/SERVICE LOGIC
            -- "Sewing Labor per pc"
            item_cost := item_record.unit_cost * run_record.actual_quantity;
            total_labor_cost := total_labor_cost + item_cost;

            -- LOG LEDGER ENTRY (Credit Cash/Payable, Debit WIP)
            -- Note: In a real system, this might credit "Wages Payable"
            INSERT INTO public.manufacturing_ledger (
                production_run_id, transaction_type, debit_account, credit_account, amount, notes
            ) VALUES (
                run_id, 'labor_cost', 'WIP', 'Wages Payable', item_cost, 
                'Labor Cost: ' || COALESCE(item_record.description, 'Service')
            );
            
        ELSIF item_record.item_type = 'overhead' THEN
            -- 3. OVERHEAD LOGIC
            item_cost := item_record.unit_cost * run_record.actual_quantity;
            total_overhead_cost := total_overhead_cost + item_cost;
            
             INSERT INTO public.manufacturing_ledger (
                production_run_id, transaction_type, debit_account, credit_account, amount, notes
            ) VALUES (
                run_id, 'overhead_cost', 'WIP', 'Overhead Absorption', item_cost, 
                'Overhead Cost'
            );
        END IF;

    END LOOP;

    -- FINAL STEP: MOVE FROM WIP TO FINISHED GOODS
    -- Total Cost of Production
    DECLARE
        total_production_cost DECIMAL(12,2) := total_material_cost + total_labor_cost + total_overhead_cost;
    BEGIN
        -- Update Run
        UPDATE public.production_runs
        SET 
            status = 'completed',
            end_date = NOW(),
            production_cost = total_production_cost,
            updated_at = NOW()
        WHERE id = run_id;

        -- Add to Finished Goods Inventory
        -- Assuming products table handles finished goods variants
        -- (Need to ensure inventory table update happens here depending on variant type)
        IF run_record.variant_id IS NOT NULL THEN
            INSERT INTO public.inventory (variant_id, quantity, last_stock_date)
            VALUES (run_record.variant_id, run_record.actual_quantity, NOW())
            ON CONFLICT (variant_id)
            DO UPDATE SET
                quantity = public.inventory.quantity + EXCLUDED.quantity,
                last_stock_date = NOW();
                
             -- LEDGER: Credit WIP, Debit Finished Goods
            INSERT INTO public.manufacturing_ledger (
                production_run_id, transaction_type, debit_account, credit_account, amount, notes
            ) VALUES (
                run_id, 'finished_good_value', 'Finished Goods Inventory', 'WIP', total_production_cost, 
                'Production Completion'
            );
        END IF;
    END;

END;
$$;
