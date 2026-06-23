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
    console.log('--- Sales Orders around 18th & 19th June 2026 ---');
    // Fetch orders created on/after June 17, 2026
    const { data: orders, error: oError } = await supabase
      .from('sales_orders')
      .select('id, order_number, created_at, status, total_amount, payment_method')
      .gte('created_at', '2026-06-17T00:00:00Z')
      .lte('created_at', '2026-06-21T23:59:59Z')
      .order('order_number', { ascending: true });

    if (oError) {
      console.error('Error fetching sales orders:', oError);
    } else {
      console.log(`Found ${orders.length} orders:`);
      orders.forEach(o => {
        console.log(`Order: ${o.order_number} | Created: ${o.created_at} | Status: ${o.status} | Total: ${o.total_amount} | PayMethod: ${o.payment_method}`);
      });
    }

    console.log('\n--- Audit Logs for sales_orders delete/update ---');
    const { data: logs, error: lError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'sales_orders')
      .order('created_at', { ascending: false });

    if (lError) {
      console.error('Error fetching audit logs:', lError);
    } else {
      console.log(`Found ${logs.length} logs for table 'sales_orders':`);
      logs.forEach(log => {
        console.log(`Time: ${log.created_at} | Action: ${log.action} | User: ${log.user_id}`);
        console.log(`Old Values:`, JSON.stringify(log.old_values));
        console.log(`New Values:`, JSON.stringify(log.new_values));
        console.log('---');
      });
    }

    console.log('\n--- General DELETE actions in audit logs ---');
    const { data: delLogs, error: delError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'DELETE')
      .order('created_at', { ascending: false });

    if (delError) {
      console.error('Error fetching general DELETE logs:', delError);
    } else {
      console.log(`Found ${delLogs.length} DELETE logs:`);
      delLogs.forEach(log => {
        console.log(`Time: ${log.created_at} | Table: ${log.table_name} | User: ${log.user_id}`);
        console.log(`Old Values:`, JSON.stringify(log.old_values));
        console.log('---');
      });
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
