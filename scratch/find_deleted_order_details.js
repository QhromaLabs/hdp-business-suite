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

const missingOrderIds = [
  'f227983d-e0c5-46b7-aec5-7b8b03a314b0',
  'f5b08c52-ebb6-495f-811b-6edebe3cf988',
  '4873f85d-8841-48d2-b790-3909774ad030',
  'd7461a98-23c4-4f7f-893f-7242f9691a9a',
  'ff1d1cde-8f49-469e-b62a-b9a10ac32138'
];

async function run() {
  try {
    console.log('--- Checking if missing orders exist in sales_orders ---');
    const { data: existingOrders, error: eoError } = await supabase
      .from('sales_orders')
      .select('id, order_number, created_at, status, total_amount')
      .in('id', missingOrderIds);

    if (eoError) {
      console.error(eoError);
    } else {
      console.log(`Found ${existingOrders.length} of the missing order IDs in sales_orders.`);
      existingOrders.forEach(o => {
        console.log(`- ID: ${o.id} | OrderNumber: ${o.order_number}`);
      });
    }

    console.log('\n--- Details of matching transactions from inventory_transactions ---');
    const { data: txns, error: tError } = await supabase
      .from('inventory_transactions')
      .select('*, product_variants(variant_name, sku)')
      .in('reference_id', missingOrderIds);

    if (tError) {
      console.error(tError);
    } else {
      for (const t of txns) {
        const varName = t.product_variants ? t.product_variants.variant_name : 'Unknown';
        const sku = t.product_variants ? t.product_variants.sku : 'Unknown';
        let creatorName = 'Unknown';
        if (t.created_by) {
          const { data: p } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', t.created_by)
            .single();
          if (p) creatorName = `${p.full_name} (${p.email})`;
        }
        console.log(`Order ID: ${t.reference_id} | Time: ${t.created_at} | Variant: ${varName} (${sku}) | Qty: ${t.quantity_change} | CreatedBy: ${t.created_by} [${creatorName}]`);
      }
    }

    // Let's print out what these orders represent so we can report to the user
  } catch (err) {
    console.error(err);
  }
}

run();
