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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  try {
    console.log('Attempting sign up...');
    const { data, error } = await supabase.auth.signUp({
      email: 'new_test_user_unique_123@gmail.com',
      password: 'password123',
      options: {
        data: {
          full_name: 'Rose'
        }
      }
    });
    
    if (error) {
      console.log('Sign up failed. Error object:', JSON.stringify(error, null, 2));
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      console.log('Error status:', error.status);
    } else {
      console.log('Sign up success! Data:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
