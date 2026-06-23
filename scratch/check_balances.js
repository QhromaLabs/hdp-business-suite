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

async function run() {
  try {
    const { data: variants } = await supabase.from('product_variants').select('sku, price');
    const priceMap = {};
    variants.forEach(v => priceMap[v.sku] = Number(v.price));
    console.log('Variant Prices:', priceMap);

    // Calculate ORD 901 total
    // 40 * 2STAND1.5M + 20 * 2STAND1.8M + 80 * 4STAND4*6 + 120 * 4STAND5*6
    const p1 = priceMap['2STAND1.5M'] || 0;
    const p2 = priceMap['2STAND1.8M'] || 0;
    const p3 = priceMap['4STAND4*6'] || 0;
    const p4 = priceMap['4STAND5*6'] || 0;
    const ord901Total = 40 * p1 + 20 * p2 + 80 * p3 + 120 * p4;
    console.log('ORD 901 estimated total:', ord901Total);

    // Calculate ORD 902 total
    // 3 * R60
    const pR60 = priceMap['R60'] || 0;
    const ord902Total = 3 * pR60;
    console.log('ORD 902 estimated total:', ord902Total);

    // Calculate ORD 903 total
    // 3 * STAR5 + 2 * STAR6 + 1 * HD7*10SETD + 1 * PR1
    const pS5 = priceMap['STAR5'] || 0;
    const pS6 = priceMap['STAR6'] || 0;
    const pHD = priceMap['HD7*10SETD'] || 0;
    const pPR1 = priceMap['PR1'] || 0;
    const ord903Total = 3 * pS5 + 2 * pS6 + 1 * pHD + 1 * pPR1;
    console.log('ORD 903 estimated total:', ord903Total);

    // Calculate ORD 904 total
    // 2 * 2STAND1.02M + 3 * 2STAND1.5M + 5 * 2STAND1.8M
    const p102 = priceMap['2STAND1.02M'] || 0;
    const ord904Total = 2 * p102 + 3 * p1 + 5 * p2;
    console.log('ORD 904 estimated total:', ord904Total);

    // Get customers with non-zero credit balance
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, credit_balance, credit_limit')
      .gt('credit_balance', 0);
    console.log('Customers with credit balance > 0:', customers);

  } catch (err) {
    console.error(err);
  }
}
run();
