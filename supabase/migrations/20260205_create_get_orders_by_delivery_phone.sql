-- Create RPC function to get orders assigned to a delivery agent by phone number
-- This allows the delivery app to fetch orders for the logged-in agent

CREATE OR REPLACE FUNCTION public.get_orders_by_delivery_phone(_phone text)
RETURNS TABLE (
  id uuid,
  order_number text,
  customer_id uuid,
  status text,
  total_amount numeric,
  delivery_address text,
  latitude numeric,
  longitude numeric,
  address_name text,
  dispatched_at timestamptz,
  created_at timestamptz
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
    so.status::text,
    so.total_amount,
    so.delivery_address,
    so.latitude,
    so.longitude,
    so.address_name,
    so.dispatched_at,
    so.created_at
  FROM sales_orders so
  INNER JOIN employees e ON so.delivery_agent_id = e.id
  WHERE e.phone = _phone
    AND so.status IN ('dispatched')
  ORDER BY so.dispatched_at DESC;
$$;

-- Grant execute permissions to allow delivery app (authenticated and anon) to call this function
GRANT EXECUTE ON FUNCTION public.get_orders_by_delivery_phone(text) TO anon, authenticated, service_role;

-- Add comment documenting the function
COMMENT ON FUNCTION public.get_orders_by_delivery_phone(text) 
IS 'Returns orders assigned to a delivery agent by their phone number. Used by the delivery mobile app.';
