-- Add delivery_agent_id column to sales_orders table
-- This allows tracking which employee (delivery agent) is assigned to deliver the order

ALTER TABLE "public"."sales_orders" 
ADD COLUMN "delivery_agent_id" UUID REFERENCES "public"."employees"("id") ON DELETE SET NULL;

-- Add index for performance when querying orders by delivery agent
CREATE INDEX IF NOT EXISTS "idx_sales_orders_delivery_agent" 
ON "public"."sales_orders"("delivery_agent_id");

-- Add comment documenting the column
COMMENT ON COLUMN "public"."sales_orders"."delivery_agent_id" 
IS 'The employee ID of the delivery agent assigned to deliver this order. References employees table.';
