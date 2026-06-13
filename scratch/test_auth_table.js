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
    console.log('Querying auth.users via schema setting...');
    // We can change the schema in the client options!
    const authSchemaClient = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: 'auth' }
    });

    const { data, error } = await authSchemaClient.from('users').select('*').limit(5);
    if (error) {
      console.log('Error querying auth.users:', error);
    } else {
      console.log('Successfully queried auth.users!', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
