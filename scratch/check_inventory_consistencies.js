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

const variantsToCheck = [
  '2STAND1.5M',
  '2STAND1.8M',
  '4STAND4*6',
  '4STAND5*6',
  'R60',
  'STAR5',
  'STAR6',
  'HD7*10SETD',
  'PR1',
  '2STAND1.02M'
];

async function run() {
  try {
    console.log('--- Fetching all variants with inventory and transaction sums ---');
    const { data: variants, error: vError } = await supabase
      .from('product_variants')
      .select('id, sku, variant_name');

    if (vError) {
      console.error(vError);
      return;
    }

    const skuToId = {};
    variants.forEach(v => {
      skuToId[v.sku] = v.id;
    });

    for (const sku of variantsToCheck) {
      const varId = skuToId[sku];
      if (!varId) {
        console.log(`SKU ${sku} not found.`);
        continue;
      }

      // Get current inventory quantity
      const { data: inv, error: iError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('variant_id', varId)
        .single();

      // Get sum of transactions
      const { data: txns, error: tError } = await supabase
        .from('inventory_transactions')
        .select('quantity_change')
        .eq('variant_id', varId);

      if (iError || tError) {
        console.error(`Error for ${sku}:`, iError, tError);
        continue;
      }

      const currentQty = inv ? inv.quantity : 0;
      const sumTxns = txns.reduce((sum, t) => sum + t.quantity_change, 0);

      console.log(`SKU: ${sku.padEnd(15)} | Current Inv: ${String(currentQty).padStart(5)} | Sum Txns: ${String(sumTxns).padStart(5)} | Diff (Inv - Txns): ${currentQty - sumTxns}`);
    }

  } catch (err) {
    console.error(err);
  }
}

run();
