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
    const { data: variants, error: vError } = await supabase
      .from('product_variants')
      .select('id, sku, variant_name');

    if (vError) {
      console.error(vError);
      return;
    }

    const varIdToSku = {};
    variants.forEach(v => {
      varIdToSku[v.id] = `${v.variant_name} (${v.sku})`;
    });

    console.log('--- Inventory transactions since June 17, 2026 ---');
    const { data: txns, error: tError } = await supabase
      .from('inventory_transactions')
      .select('*')
      .gte('created_at', '2026-06-17T00:00:00Z')
      .order('created_at', { ascending: true });

    if (tError) {
      console.error(tError);
      return;
    }

    txns.forEach(t => {
      const variantSku = varIdToSku[t.variant_id] || t.variant_id;
      console.log(`Time: ${t.created_at} | Variant: ${variantSku.padEnd(35)} | QtyChange: ${String(t.quantity_change).padStart(4)} | PrevQty: ${String(t.previous_quantity).padStart(5)} | NewQty: ${String(t.new_quantity).padStart(5)} | RefID: ${t.reference_id} | RefType: ${t.reference_type}`);
    });

  } catch (err) {
    console.error(err);
  }
}

run();
