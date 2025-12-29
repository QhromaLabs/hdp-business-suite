-- Backfill payment records for existing dispatched orders that don't have payments
-- This ensures historical orders appear in the ledger

INSERT INTO payments (order_id, customer_id, amount, payment_method, created_at)
SELECT 
  so.id as order_id,
  so.customer_id,
  so.total_amount as amount,
  COALESCE(so.payment_method, 'cash') as payment_method,
  COALESCE(so.dispatched_at, so.created_at) as created_at
FROM sales_orders so
WHERE 
  so.status = 'dispatched'
  AND so.is_credit_sale = false
  AND NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.order_id = so.id
  );
