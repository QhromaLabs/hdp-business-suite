import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(env['VITE_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

const missingOrderIds = [
  'f227983d-e0c5-46b7-aec5-7b8b03a314b0',
  'f5b08c52-ebb6-495f-811b-6edebe3cf988',
  '4873f85d-8841-48d2-b790-3909774ad030',
  'd7461a98-23c4-4f7f-893f-7242f9691a9a',
  'ff1d1cde-8f49-469e-b62a-b9a10ac32138'
];

async function run() {
  try {
    console.log('Checking sales_commissions for missing orders...');
    const { data: commissions, error } = await supabase
      .from('sales_commissions')
      .select('*, employees(full_name)')
      .in('order_id', missingOrderIds);
    
    if (error) {
      console.log('Error:', error.message);
    } else {
      console.log('Matching commissions:', commissions);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
