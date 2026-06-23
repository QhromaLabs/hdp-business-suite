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
    console.log('--- Sequence status ---');
    const { data: seqData, error: seqError } = await supabase.rpc('get_sequence_status');
    if (seqError) {
      console.log('Could not call get_sequence_status RPC, attempting raw SQL query via execution...');
      // Let's run a raw query to check the current value of order_number_seq
      // Wait, we don't have a direct SQL execution function, but we can write an RPC or query standard views.
    } else {
      console.log('Sequence status:', seqData);
    }

    console.log('\n--- Triggers on sales_orders ---');
    // Query pg_trigger for sales_orders
    const { data: triggers, error: trigError } = await supabase
      .from('pg_trigger') // Wait, pg_catalog/pg_trigger might not be exposed on PostgREST unless there's an RPC or view, let's try querying standard views.
      .select('*')
      .limit(5);
    if (trigError) {
      console.log('Cannot query pg_trigger directly (standard REST API does not expose it):', trigError.message);
    } else {
      console.log('Triggers:', triggers);
    }

    console.log('\n--- Total audit logs ---');
    const { count, error: countError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });
    if (countError) {
      console.error('Error counting audit logs:', countError);
    } else {
      console.log('Total audit logs in table:', count);
    }

    console.log('\n--- Checking if there are deleted records in audit_logs ---');
    const { data: allLogs, error: allLogsError } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(100);
    if (allLogsError) {
      console.error('Error fetching logs:', allLogsError);
    } else {
      console.log(`Found ${allLogs.length} recent logs in audit_logs table.`);
      allLogs.forEach(l => {
        console.log(`Action: ${l.action} | Table: ${l.table_name} | Record ID: ${l.record_id} | Created: ${l.created_at}`);
      });
    }

  } catch (err) {
    console.error('Unexpected:', err);
  }
}

run();
