import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nygxnxrasprjmxetvudk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3hueHJhc3Byam14ZXR2dWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEwMjg2NCwiZXhwIjoyMDgxNjc4ODY0fQ.dYBuMGViMdYELXUqAPXMOh81EYtf2S31dfZCeDf_86s'
);

async function checkJuneProcurement() {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .gte('created_at', '2026-06-01T00:00:00Z')
    .lte('created_at', '2026-06-30T23:59:59Z');

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

checkJuneProcurement();
