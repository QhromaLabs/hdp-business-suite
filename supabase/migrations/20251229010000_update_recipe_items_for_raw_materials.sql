-- Add raw_material_id to recipe_items
ALTER TABLE public.recipe_items
ADD COLUMN raw_material_id UUID REFERENCES public.raw_materials(id);

-- Make material_variant_id nullable since we might use raw materials instead
ALTER TABLE public.recipe_items
ALTER COLUMN material_variant_id DROP NOT NULL;

-- Add check constraint to ensure at least one is present
ALTER TABLE public.recipe_items
ADD CONSTRAINT recipe_items_material_check 
CHECK (
  (material_variant_id IS NOT NULL AND raw_material_id IS NULL) OR 
  (material_variant_id IS NULL AND raw_material_id IS NOT NULL)
);
