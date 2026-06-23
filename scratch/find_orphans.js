import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('../.env');
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

const supabaseUrl = env['VITE_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    console.log('--- Checking for orphaned payments ---');
    // Fetch payments not linked to any existing sales_order
    // Since we don't have join query directly in REST unless defined, we can fetch all payments around that time.
    const { data: payments, error: pError } = await supabase
      .from('payments')
      .select('id, order_id, amount, created_at')
      .gte('created_at', '2026-06-17T00:00:00Z');

    if (pError) {
      console.error('Error fetching payments:', pError);
    } else {
      console.log(`Found ${payments.length} payments since June 17:`);
      // Let's check which payments have order_id that is NOT in sales_orders
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('id');
      const orderIds = new Set(orders.map(o => o.id));

      payments.forEach(p => {
        const isOrphan = !orderIds.has(p.order_id);
        console.log(`Payment: ID ${p.id} | OrderID: ${p.order_id} | Amount: ${p.amount} | Created: ${p.created_at} | Orphan: ${isOrphan}`);
      });
    }

    console.log('\n--- Checking for orphaned order items ---');
    // Fetch order items and see if they link to non-existent orders
    const { data: items, error: iError } = await supabase
      .from('sales_order_items')
      .select('id, order_id, variant_id, quantity, total_price');

    if (iError) {
      console.error('Error fetching order items:', iError);
    } else {
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('id');
      const orderIds = new Set(orders.map(o => o.id));

      let orphanCount = 0;
      items.forEach(item => {
        if (!orderIds.has(item.order_id)) {
          orphanCount++;
          console.log(`Orphaned Item: ID ${item.id} | OrderID: ${item.order_id} | Variant: ${item.variant_id} | Qty: ${item.quantity} | Price: ${item.total_price}`);
        }
      });
      console.log(`Total orphaned sales_order_items: ${orphanCount}`);
    }

    console.log('\n--- Checking inventory transactions ---');
    // Fetch inventory transactions since June 17
    const { data: txns, error: tError } = await supabase
      .from('inventory_transactions')
      .select('*')
      .gte('created_at', '2026-06-17T00:00:00Z');

    if (tError) {
      console.error('Error fetching inventory transactions:', tError);
    } else {
      console.log(`Found ${txns.length} inventory transactions:`);
      txns.forEach(t => {
        console.log(`Txn ID: ${t.id} | Type: ${t.transaction_type} | QtyChange: ${t.quantity_change} | Reference ID: ${t.reference_id} | Reference Type: ${t.reference_type} | Created: ${t.created_at}`);
      });
    }

  } catch (err) {
    console.error(err);
  }
}

run();
