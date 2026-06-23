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
    const orderId = 'ff1d1cde-8f49-469e-b62a-b9a10ac32138'; // ORD-20260619-00905

    // Get variant UUIDs for SKUs
    const skus = ['4STAND4*6', '4STAND5*6'];
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, sku')
      .in('sku', skus);
    
    const skuMap = {};
    variants.forEach(v => skuMap[v.sku] = v.id);
    console.log('SKU to UUID mapping:', skuMap);

    const varId1 = skuMap['4STAND4*6'];
    const varId2 = skuMap['4STAND5*6'];

    // 1. Restock 4STAND4*6 (+105)
    console.log('Restocking 4STAND4*6...');
    const { data: inv1 } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('variant_id', varId1)
      .single();
    
    const prev1 = inv1 ? inv1.quantity : 0;
    const new1 = prev1 + 105;

    await supabase
      .from('inventory')
      .update({ quantity: new1, updated_at: new Date().toISOString() })
      .eq('variant_id', varId1);
    
    await supabase.from('inventory_transactions').insert({
      variant_id: varId1,
      transaction_type: 'restock',
      quantity_change: 105,
      previous_quantity: prev1,
      new_quantity: new1,
      reference_type: 'sales_order',
      reference_id: orderId,
      notes: 'Manual restock for aborted/rolled-back order ORD-20260619-00905'
    });
    console.log(`4STAND4*6 restocked: ${prev1} -> ${new1}`);

    // 2. Restock 4STAND5*6 (+70)
    console.log('Restocking 4STAND5*6...');
    const { data: inv2 } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('variant_id', varId2)
      .single();
    
    const prev2 = inv2 ? inv2.quantity : 0;
    const new2 = prev2 + 70;

    await supabase
      .from('inventory')
      .update({ quantity: new2, updated_at: new Date().toISOString() })
      .eq('variant_id', varId2);
    
    await supabase.from('inventory_transactions').insert({
      variant_id: varId2,
      transaction_type: 'restock',
      quantity_change: 70,
      previous_quantity: prev2,
      new_quantity: new2,
      reference_type: 'sales_order',
      reference_id: orderId,
      notes: 'Manual restock for aborted/rolled-back order ORD-20260619-00905'
    });
    console.log(`4STAND5*6 restocked: ${prev2} -> ${new2}`);

    console.log('--- Restock ORD 905 Complete ---');
  } catch (err) {
    console.error(err);
  }
}
run();
