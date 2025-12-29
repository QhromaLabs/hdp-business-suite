ALTER TABLE public.production_batches ADD COLUMN IF NOT EXISTS production_cost DECIMAL(12,2) DEFAULT 0;
