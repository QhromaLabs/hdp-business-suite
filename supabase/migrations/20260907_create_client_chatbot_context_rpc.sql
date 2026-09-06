-- Migration: Client Chatbot Live Context Engine & Message Store

-- 1. Create client_chat_messages table for persisting conversation history
CREATE TABLE IF NOT EXISTS public.client_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast session lookup
CREATE INDEX IF NOT EXISTS idx_client_chat_messages_session ON public.client_chat_messages(session_id, created_at ASC);

-- Enable RLS
ALTER TABLE public.client_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own chat messages" 
ON public.client_chat_messages
FOR ALL
USING (auth.uid() = user_id OR user_id IS NULL);

-- 2. Create get_live_client_context RPC function
CREATE OR REPLACE FUNCTION public.get_live_client_context(
    p_user_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_products JSONB;
    v_orders JSONB;
    v_store_info JSONB;
    v_result JSONB;
BEGIN
    -- Top In-Stock Products & Pricing
    SELECT coalesce(jsonb_agg(
        jsonb_build_object(
            'name', p.name,
            'category', pc.name,
            'price', p.price,
            'stock_quantity', p.stock_quantity,
            'description', p.description
        )
    ), '[]'::jsonb)
    INTO v_products
    FROM (
        SELECT p.name, p.category_id, p.price, p.stock_quantity, p.description
        FROM public.products p
        WHERE p.status = 'active' OR p.stock_quantity > 0
        ORDER BY p.created_at DESC
        LIMIT p_limit
    ) p
    LEFT JOIN public.product_categories pc ON p.category_id = pc.id;

    -- Recent Orders for user (if user_id provided)
    IF p_user_id IS NOT NULL THEN
        SELECT coalesce(jsonb_agg(
            jsonb_build_object(
                'order_number', o.order_number,
                'status', o.status,
                'total_amount', o.total_amount,
                'created_at', o.created_at,
                'payment_status', o.payment_status
            )
        ), '[]'::jsonb)
        INTO v_orders
        FROM (
            SELECT order_number, status, total_amount, created_at, payment_status
            FROM public.sales_orders
            WHERE customer_id IN (SELECT id FROM public.customers WHERE profile_id = p_user_id OR email = (SELECT email FROM auth.users WHERE id = p_user_id))
            ORDER BY created_at DESC
            LIMIT 5
        ) o;
    ELSE
        v_orders := '[]'::jsonb;
    END IF;

    -- Store Settings
    SELECT coalesce(jsonb_build_object(
        'store_name', store_name,
        'contact_email', contact_email,
        'contact_phone', contact_phone,
        'address', address,
        'currency', currency
    ), '{}'::jsonb)
    INTO v_store_info
    FROM public.store_settings
    LIMIT 1;

    -- Combine into single JSON context
    v_result := jsonb_build_object(
        'store', v_store_info,
        'in_stock_products', v_products,
        'user_recent_orders', v_orders,
        'context_timestamp', now()
    );

    RETURN v_result;
END;
$$;
