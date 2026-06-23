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
    console.log('--- Checking sales_orders created/updated on June 19, 2026 ---');
    const { data: orders, error: oError } = await supabase
      .from('sales_orders')
      .select('order_number, created_at, updated_at, created_by, status')
      .gte('created_at', '2026-06-19T00:00:00Z')
      .lte('created_at', '2026-06-19T23:59:59Z');

    if (oError) {
      console.error(oError);
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
        console.log(`Order: ${o.order_number} | Created: ${o.created_at} | Updated: ${o.updated_at} | CreatedBy: ${creatorName} | Status: ${o.status}`);
      }
    }

    console.log('\n--- Checking payments created on June 19, 2026 ---');
    const { data: payments, error: pError } = await supabase
      .from('payments')
      .select('id, amount, created_at, order_id, received_by')
      .gte('created_at', '2026-06-19T00:00:00Z')
      .lte('created_at', '2026-06-19T23:59:59Z');

    if (pError) {
      console.error(pError);
    } else {
      for (const p of payments) {
        let receiverName = 'Unknown';
        if (p.received_by) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', p.received_by)
            .single();
          if (prof) receiverName = `${prof.full_name} (${prof.email})`;
        }
        console.log(`Payment: ${p.id} | Amount: ${p.amount} | Created: ${p.created_at} | ReceivedBy: ${receiverName}`);
      }
    }

  } catch (err) {
    console.error(err);
  }
}

run();
