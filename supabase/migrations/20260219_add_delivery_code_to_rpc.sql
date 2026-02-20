-- Add delivery_code to the RPC function return
CREATE OR REPLACE FUNCTION public.get_orders_by_delivery_phone(_phone text)
RETURNS TABLE (
  id uuid,
  order_number text,
  customer_id uuid,
  customer_name text,
  business_name text,
  status text,
  total_amount numeric,
  delivery_address text,
  latitude numeric,
  longitude numeric,
  address_name text,
  dispatched_at timestamptz,
  created_at timestamptz,
  order_items jsonb,
  delivery_code text
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
    NULL as business_name,
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
    ) as order_items,
    so.delivery_code
  FROM sales_orders so
  INNER JOIN employees e ON so.delivery_agent_id = e.id
  LEFT JOIN customers c ON so.customer_id = c.id
  WHERE e.phone = _phone
    AND so.status IN ('dispatched', 'in_transit')
  ORDER BY so.dispatched_at DESC;
$$;

-- Grant permissions re-apply just in case
GRANT EXECUTE ON FUNCTION public.get_orders_by_delivery_phone(text) TO anon, authenticated, service_role;
