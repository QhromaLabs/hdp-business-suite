import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

const supabaseUrl = env['VITE_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    console.log('Querying public.audit_logs...');
    const { data: logs, error: lError } = await supabase.from('audit_logs').select('*');
    if (lError) {
      console.error('Audit logs error:', lError);
    } else {
      console.log('Audit logs count:', logs.length);
      console.log('Audit logs:', logs);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
