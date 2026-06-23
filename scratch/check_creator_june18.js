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
  const { data: orders, error } = await supabase
    .from('sales_orders')
    .select('order_number, created_at, created_by, customer_id, customers(name)')
    .gte('created_at', '2026-06-18T00:00:00Z')
    .lte('created_at', '2026-06-18T23:59:59Z');

  if (error) {
    console.error(error);
  } else {
    for (const o of orders) {
      let creatorName = 'Unknown';
      if (o.created_by) {
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', o.created_by)
          .single();
        if (p) creatorName = `${p.full_name} (${p.email})`;
      }
      console.log(`Order: ${o.order_number} | Created: ${o.created_at} | CreatedBy: ${creatorName} | Customer: ${o.customers ? o.customers.name : 'Unknown'}`);
    }
  }
}
run();
