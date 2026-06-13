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
    console.log('Querying public.profiles...');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(5);
    if (pError) console.error('Profiles error:', pError);
    else console.log('Profiles success:', profiles);

    console.log('Querying public.user_roles...');
    const { data: roles, error: rError } = await supabase.from('user_roles').select('*').limit(5);
    if (rError) console.error('Roles error:', rError);
    else console.log('Roles success:', roles);

    console.log('Querying public.employees...');
    const { data: employees, error: eError } = await supabase.from('employees').select('*').limit(5);
    if (eError) console.error('Employees error:', eError);
    else console.log('Employees success:', employees);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
