import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = '../.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function run() {
  try {
    const orderId = 'f227983d-e0c5-46b7-aec5-7b8b03a314b0';
    const customerId = 'fe814814-1a10-4a93-bba2-b9f5fefe11cc'; // pritty kamukunji
    const orderNumber = 'ORD-20260618-00901';
    const timestamp = '2026-06-18T11:12:28.719051+00:00';

    // 1. Get creator profile id for justine@hdpk.co.ke
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'justine@hdpk.co.ke')
      .single();
    const creatorId = creatorProfile ? creatorProfile.id : null;
    console.log('Justine Admin Profile ID:', creatorId);

    // 2. Get variant UUIDs for SKUs
    const skus = ['2STAND1.5M', '2STAND1.8M', '4STAND4*6', '4STAND5*6'];
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, sku')
      .in('sku', skus);
    
    const skuMap = {};
    variants.forEach(v => skuMap[v.sku] = v.id);
    console.log('SKU to UUID mapping:', skuMap);

    // 3. Recreate the sales_orders row
    console.log('Inserting into sales_orders...');
    const { data: salesOrder, error: oError } = await supabase
      .from('sales_orders')
      .insert({
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId,
        status: 'delivered',
        subtotal: 330000,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 330000,
        payment_method: 'mpesa',
        is_credit_sale: false,
        created_by: creatorId,
        created_at: timestamp,
        updated_at: timestamp
      })
      .select()
      .single();

    if (oError) {
      console.error('Error inserting sales order:', oError);
      return;
    }
    console.log('Recreated sales order successfully:', salesOrder.order_number);

    // 4. Record the current time to identify new trigger-created transactions
    const startTime = new Date().toISOString();

    // 5. Recreate sales_order_items
    console.log('Inserting order items into sales_order_items...');
    const items = [
      {
        order_id: orderId,
        variant_id: skuMap['2STAND1.5M'],
        quantity: 40,
        unit_price: 2900,
        discount: 0,
        total_price: 116000,
        created_at: timestamp
      },
      {
        order_id: orderId,
        variant_id: skuMap['2STAND1.8M'],
        quantity: 20,
        unit_price: 2900,
        discount: 0,
        total_price: 58000,
        created_at: timestamp
      },
      {
        order_id: orderId,
        variant_id: skuMap['4STAND4*6'],
        quantity: 80,
        unit_price: 780,
        discount: 0,
        total_price: 62400,
        created_at: timestamp
      },
      {
        order_id: orderId,
        variant_id: skuMap['4STAND5*6'],
        quantity: 120,
        unit_price: 780,
        discount: 0,
        total_price: 93600,
        created_at: timestamp
      }
    ];

    const { error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(items);

    if (itemsError) {
      console.error('Error inserting sales order items:', itemsError);
      return;
    }
    console.log('Recreated sales order items successfully.');

    // 6. Delete duplicate inventory transaction records created by the trigger
    // This keeps ONLY the original transactions from June 18th.
    console.log('Cleaning up duplicate trigger-created transactions...');
    const { data: newTxns, error: fetchTxnError } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('reference_id', orderId)
      .gte('created_at', startTime);

    if (fetchTxnError) {
      console.error('Error fetching new transactions:', fetchTxnError);
    } else if (newTxns && newTxns.length > 0) {
      const newTxnIds = newTxns.map(t => t.id);
      console.log(`Found ${newTxnIds.length} duplicate transactions to delete:`, newTxnIds);
      const { error: deleteTxnError } = await supabase
        .from('inventory_transactions')
        .delete()
        .in('id', newTxnIds);
      
      if (deleteTxnError) console.error('Error deleting duplicate transactions:', deleteTxnError);
      else console.log('Duplicate transactions cleaned up successfully.');
    }

    // 7. Create payment record
    console.log('Creating payment record...');
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        customer_id: customerId,
        amount: 330000,
        payment_method: 'mpesa',
        received_by: creatorId,
        created_at: timestamp
      });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
    } else {
      console.log('Payment record created successfully.');
    }

    console.log('--- Restore ORD 901 Complete ---');
  } catch (err) {
    console.error(err);
  }
}
run();
