-- Add 'in_transit' to order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'in_transit';

-- Update the RPC function to return richer data including items and customer name
CREATE OR REPLACE FUNCTION public.get_orders_by_delivery_phone(_phone text)
RETURNS TABLE (
  id uuid,
  order_number text,
  customer_id uuid,
  customer_name text, -- Added
  business_name text, -- Added from customer/company logic if available, defaulting to generic check
  status text,
  total_amount numeric,
  delivery_address text,
  latitude numeric,
  longitude numeric,
  address_name text,
  dispatched_at timestamptz,
  created_at timestamptz,
  order_items jsonb -- Added
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    so.id,
    so.order_number,
    so.customer_id,
    c.name as customer_name,
    NULL as business_name, -- Placeholder if you don't have a separate business name column, or map it if you do
    so.status::text,
    so.total_amount,
    so.delivery_address,
    so.latitude,
    so.longitude,
    so.address_name,
    so.dispatched_at,
    so.created_at,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'quantity', soi.quantity,
                'name', p.name,
                'variant', pv.variant_name
            )
        )
        FROM sales_order_items soi
        JOIN product_variants pv ON soi.variant_id = pv.id
        JOIN products p ON pv.product_id = p.id
        WHERE soi.order_id = so.id
    ) as order_items
  FROM sales_orders so
  INNER JOIN employees e ON so.delivery_agent_id = e.id
  LEFT JOIN customers c ON so.customer_id = c.id
  WHERE e.phone = _phone
    AND so.status IN ('dispatched', 'in_transit')
  ORDER BY so.dispatched_at DESC;
$$;

-- Grant permissions re-apply just in case
GRANT EXECUTE ON FUNCTION public.get_orders_by_delivery_phone(text) TO anon, authenticated, service_role;
