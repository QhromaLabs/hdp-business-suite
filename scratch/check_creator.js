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
    console.log('--- Fetching order creator and customer details ---');
    const { data: orders, error: oError } = await supabase
      .from('sales_orders')
      .select('order_number, created_by, customer_id, customers(name)')
      .in('order_number', ['ORD-20260618-00900', 'ORD-20260619-00906']);

    if (oError) {
      console.error(oError);
    } else {
      for (const o of orders) {
        const custName = o.customers ? o.customers.name : 'Unknown';
        let creatorName = 'Unknown';
        if (o.created_by) {
          const { data: p } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', o.created_by)
            .single();
          if (p) creatorName = `${p.full_name} (${p.email})`;
        }
        console.log(`Order: ${o.order_number} | CreatedBy: ${o.created_by} [${creatorName}] | Customer: ${custName}`);
      }
    }

  } catch (err) {
    console.error(err);
  }
}

run();
