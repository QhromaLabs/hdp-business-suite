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
    console.log('Searching public.employees for rose...');
    const { data: employees, error: eError } = await supabase
      .from('employees')
      .select('*')
      .ilike('email', 'rose@hdpk.co.ke');
    if (eError) console.error('Employees query error:', eError);
    else console.log('Employees found:', employees);

    console.log('Searching public.profiles for rose...');
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', 'rose@hdpk.co.ke');
    if (pError) console.error('Profiles query error:', pError);
    else console.log('Profiles found:', profiles);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
