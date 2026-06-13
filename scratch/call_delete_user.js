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

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    console.log('Invoking delete-user edge function for rose@hdpk.co.ke...');
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { email: 'rose@hdpk.co.ke' }
    });
    
    if (error) {
      console.error('Failed to delete user via edge function:', error);
    } else {
      console.log('Delete user response:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
