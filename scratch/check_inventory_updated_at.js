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

const skusToCheck = [
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
    const { data: variants, error: vError } = await supabase
      .from('product_variants')
      .select('id, sku, variant_name');

    if (vError) {
      console.error(vError);
      return;
    }

    const skuToVar = {};
    variants.forEach(v => {
      skuToVar[v.sku] = v;
    });

    console.log('--- Inventory updated_at times ---');
    for (const sku of skusToCheck) {
      const v = skuToVar[sku];
      if (!v) continue;

      const { data: inv, error: iError } = await supabase
        .from('inventory')
        .select('updated_at, quantity')
        .eq('variant_id', v.id)
        .single();

      if (iError) {
        console.error(`Error for ${sku}:`, iError.message);
        continue;
      }

      console.log(`SKU: ${sku.padEnd(15)} | Qty: ${String(inv.quantity).padStart(5)} | UpdatedAt: ${inv.updated_at}`);
    }

  } catch (err) {
    console.error(err);
  }
}

run();
