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

async function run() {
  try {
    console.log('Fetching OpenAPI spec from PostgREST...');
    const url = `${supabaseUrl}/rest/v1/`;
    const response = await fetch(url, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });

    if (!response.ok) {
      console.error('Fetch failed:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log('--- Paths (Endpoints) ---');
    const paths = Object.keys(data.paths || {});
    console.log('Exposed endpoints:', paths);
    
    console.log('--- RPCs ---');
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log('RPCs:', rpcs);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
