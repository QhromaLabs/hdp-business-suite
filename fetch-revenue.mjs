import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nygxnxrasprjmxetvudk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3hueHJhc3Byam14ZXR2dWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEwMjg2NCwiZXhwIjoyMDgxNjc4ODY0fQ.dYBuMGViMdYELXUqAPXMOh81EYtf2S31dfZCeDf_86s'
);

async function checkRevenue() {
  const { data: sales, error: salesError } = await supabase
    .from('sales_orders')
    .select('total_amount, status');

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount');

  if (salesError || paymentsError) {
    console.error(salesError || paymentsError);
    return;
  }

  const validStatuses = ['delivered', 'completed', 'approved', 'in_transit', 'ready_for_pickup', 'dispatched'];
  
  const validOrders = sales.filter(o => validStatuses.includes(o.status));
  const accruedRevenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const pendingRevenue = sales.filter(o => o.status === 'pending').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const totalCashCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  console.log(JSON.stringify({
    accruedRevenue,
    pendingRevenue,
    totalCashCollected,
    totalValidOrders: validOrders.length
  }, null, 2));
}

checkRevenue();
