import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file manually
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

console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Error listing users:', error);
      return;
    }
    
    console.log('--- List of Users ---');
    for (const u of users) {
      console.log(`Email: ${u.email}`);
      console.log(`ID: ${u.id}`);
      console.log(`Confirmed: ${u.email_confirmed_at}`);
      console.log(`Identities:`, JSON.stringify(u.identities, null, 2));
      console.log(`App Metadata:`, JSON.stringify(u.app_metadata, null, 2));
      console.log(`User Metadata:`, JSON.stringify(u.user_metadata, null, 2));
      console.log('---------------------');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
