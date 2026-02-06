-- Add Product Tagging for Intermediate Goods

-- 1. Add product_type column to products table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'product_type') THEN
        ALTER TABLE public.products 
        ADD COLUMN product_type TEXT DEFAULT 'finished_good' CHECK (product_type IN ('finished_good', 'semi_finished_good', 'raw_material'));
        
        -- Default existing products to 'finished_good'
        UPDATE public.products SET product_type = 'finished_good' WHERE product_type IS NULL;
    END IF;
END $$;
