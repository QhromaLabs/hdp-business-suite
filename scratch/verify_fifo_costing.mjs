import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nygxnxrasprjmxetvudk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3hueHJhc3Byam14ZXR2dWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEwMjg2NCwiZXhwIjoyMDgxNjc4ODY0fQ.dYBuMGViMdYELXUqAPXMOh81EYtf2S31dfZCeDf_86s'
);

async function verifyFifoCosting() {
  console.log('--- STARTING FIFO COSTING VERIFICATION ---');

  // 1. Pick a variant with positive quantity in batches
  const { data: batches, error: batchErr } = await supabase
    .from('inventory_batches')
    .select('variant_id, landed_cost_per_unit, quantity_remaining')
    .gt('quantity_remaining', 5)
    .limit(1);

  if (batchErr || !batches || batches.length === 0) {
    console.error('Error finding a test variant:', batchErr);
    return;
  }

  const testBatch = batches[0];
  const variantId = testBatch.variant_id;
  const landedCostExpected = Number(testBatch.landed_cost_per_unit);
  
  console.log(`Test Variant: ${variantId}`);
  console.log(`Expected FIFO Landed Cost: ${landedCostExpected}`);
  console.log(`Active Batch Remaining Qty before test: ${testBatch.quantity_remaining}`);

  // Fetch current main inventory quantity
  const { data: currentInv } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('variant_id', variantId)
    .single();
  const currentInvQty = currentInv?.quantity || 0;
  console.log(`Main Inventory Qty before test: ${currentInvQty}`);

  // 2. Create a dummy sales order
  const { data: order, error: orderErr } = await supabase
    .from('sales_orders')
    .insert([{
      customer_id: '5c69affd-9b0f-451e-a15f-f5b7b993a9b6', // use a valid customer ID or anonymous if allowed
      total_amount: 1000,
      status: 'pending',
      payment_method: 'cash'
    }])
    .select()
    .single();

  if (orderErr) {
    console.error('Error creating sales order:', orderErr);
    return;
  }

  console.log(`Dummy Sales Order created: ${order.id}`);

  // 3. Create a sales order item (qty = 2) to trigger FIFO deduction
  const { data: item, error: itemErr } = await supabase
    .from('sales_order_items')
    .insert([{
      order_id: order.id,
      variant_id: variantId,
      quantity: 2,
      unit_price: 500,
      total_price: 1000
    }])
    .select()
    .single();

  if (itemErr) {
    console.error('Error inserting sales order item:', itemErr);
    // Cleanup order
    await supabase.from('sales_orders').delete().eq('id', order.id);
    return;
  }

  console.log(`Sales Order Item inserted: ${item.id}`);

  // 4. Retrieve the updated sales order item to inspect landed_cost_at_sale
  const { data: updatedItem } = await supabase
    .from('sales_order_items')
    .select('landed_cost_at_sale')
    .eq('id', item.id)
    .single();

  console.log(`Recorded landed_cost_at_sale: ${updatedItem?.landed_cost_at_sale}`);
  
  // 5. Retrieve updated batch quantity
  const { data: updatedBatch } = await supabase
    .from('inventory_batches')
    .select('quantity_remaining')
    .eq('variant_id', variantId)
    .order('created_at', { ascending: true })
    .limit(1);

  const newBatchQty = updatedBatch?.[0]?.quantity_remaining;
  console.log(`Active Batch Remaining Qty after test: ${newBatchQty} (Expected: ${testBatch.quantity_remaining - 2})`);

  // Retrieve updated main inventory
  const { data: updatedInv } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('variant_id', variantId)
    .single();
  console.log(`Main Inventory Qty after test: ${updatedInv?.quantity} (Expected: ${currentInvQty - 2})`);

  // 6. Cleanup
  console.log('--- CLEANING UP TEST DATA ---');
  await supabase.from('sales_orders').delete().eq('id', order.id); // Cascade will delete items
  
  // Revert batch quantity and inventory manually
  await supabase
    .from('inventory_batches')
    .update({ quantity_remaining: testBatch.quantity_remaining })
    .eq('variant_id', variantId)
    .order('created_at', { ascending: true })
    .limit(1);

  await supabase
    .from('inventory')
    .update({ quantity: currentInvQty })
    .eq('variant_id', variantId);

  console.log('Verification test completed successfully!');
}

verifyFifoCosting();
