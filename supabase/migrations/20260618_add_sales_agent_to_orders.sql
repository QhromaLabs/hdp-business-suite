-- Add sales_agent_id to sales_orders to track which sales agent made the sale.
-- Required by the mobile POS app when creating orders.
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS sales_agent_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_agent
ON public.sales_orders(sales_agent_id);

COMMENT ON COLUMN public.sales_orders.sales_agent_id
IS 'The employee ID of the sales agent who created this order. Used for commission tracking.';
