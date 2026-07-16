import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nygxnxrasprjmxetvudk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3hueHJhc3Byam14ZXR2dWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEwMjg2NCwiZXhwIjoyMDgxNjc4ODY0fQ.dYBuMGViMdYELXUqAPXMOh81EYtf2S31dfZCeDf_86s'
);

async function main() {
  console.log('--- Deep Analyzing Stock History for T2S.G Standard ---');

  // Fetch all transactions for T2S.G (variant_id: '3bda4fe5-5a98-4eeb-9ac5-c973724c148a') in chronological order
  const { data: txns, error: txnErr } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('variant_id', '3bda4fe5-5a98-4eeb-9ac5-c973724c148a')
    .order('created_at', { ascending: true });

  if (txnErr) {
    console.error('Error fetching txns:', txnErr);
    return;
  }

  console.log(' chronological transaction logs:');
  txns.forEach(t => {
    console.log(`[${t.created_at}] Type: ${t.transaction_type}, Change: ${t.quantity_change}, Prev: ${t.previous_quantity}, New: ${t.new_quantity}, Notes: ${t.notes}`);
  });

  // Fetch all batches for T2S.G in chronological order
  const { data: batches, error: batchErr } = await supabase
    .from('inventory_batches')
    .select('*')
    .eq('variant_id', '3bda4fe5-5a98-4eeb-9ac5-c973724c148a')
    .order('created_at', { ascending: true });

  if (batchErr) {
    console.error('Error fetching batches:', batchErr);
    return;
  }

  console.log('\nAll Batches:');
  batches.forEach(b => {
    console.log(`ID: ${b.id}, PO: ${b.purchase_order_id}, Init: ${b.initial_quantity}, Remaining: ${b.quantity_remaining}, Cost: ${b.landed_cost_per_unit}, Created: ${b.created_at}`);
  });
}

main();
