import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nygxnxrasprjmxetvudk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z3hueHJhc3Byam14ZXR2dWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEwMjg2NCwiZXhwIjoyMDgxNjc4ODY0fQ.dYBuMGViMdYELXUqAPXMOh81EYtf2S31dfZCeDf_86s'
);

async function calculateLandedMarkupDetails() {
  const [{ data: allTimeFreight, error: freightError }, { data: allTimePurchaseItems, error: itemsError }] = await Promise.all([
    supabase.from('expenses').select('id, category, amount, description').in('category', ['Shipping Freight Charges', 'Shipping Handling Costs', 'Custom Taxes']),
    supabase.from('purchase_order_items').select('id, quantity')
  ]);

  if (freightError) {
    console.error('Freight error:', freightError);
    return;
  }
  if (itemsError) {
    console.error('Items error:', itemsError);
    return;
  }

  const totalAllTimeFreight = allTimeFreight?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const totalAllTimeItemsProcured = allTimePurchaseItems?.reduce((sum, p) => sum + Number(p.quantity), 0) || 0;
  const ratio = totalAllTimeItemsProcured > 0 ? (totalAllTimeFreight / totalAllTimeItemsProcured) : 0;

  console.log('--- EXPENSES (FREIGHT/HANDLING/TAXES) ---');
  console.log(allTimeFreight);
  console.log('Total freight expense amount:', totalAllTimeFreight);

  console.log('\n--- PURCHASE ORDER ITEMS ---');
  console.log('Count of items records:', allTimePurchaseItems.length);
  console.log('Total quantity of all-time items procured:', totalAllTimeItemsProcured);

  console.log('\n--- LANDED MARKUP (RATIO) ---');
  console.log(`${totalAllTimeFreight} / ${totalAllTimeItemsProcured} = ${ratio}`);
  console.log('Formatted to 2 decimal places:', ratio.toFixed(2));
}

calculateLandedMarkupDetails();
