// Test Supabase Realtime connection
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_VENDOR_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

console.log('Testing Supabase Realtime Connection...\n');
console.log('Configuration:');
console.log('  URL:', supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : '❌ NOT SET');
console.log('  Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : '❌ NOT SET');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured!');
  console.error('   Set SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

try {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });

  console.log('✅ Supabase client created');
  console.log('');

  // Test basic connection
  console.log('Testing basic connection...');
  const { data, error } = await supabase
    .from('vendor_api_keys')
    .select('id, status, api_key_hash')
    .limit(1);

  if (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  }

  console.log('✅ Connection successful');
  console.log('   Found', data?.length || 0, 'records');
  console.log('');

  // Test Realtime subscription
  console.log('Testing Realtime subscription...');
  const channel = supabase
    .channel('test-connection')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'vendor_api_keys'
      },
      (payload) => {
        console.log('✅ Received Realtime update:', {
          eventType: payload.eventType,
          table: payload.table,
          newStatus: payload.new?.status,
          oldStatus: payload.old?.status
        });
      }
    )
    .subscribe((status, err) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime subscription active!');
        console.log('');
        console.log('Now change a status in Supabase to test...');
        console.log('(Press Ctrl+C to exit)');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel error:', err?.message);
        if (err) {
          console.error('Error details:', err);
        }
        process.exit(1);
      } else if (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
      }
    });
  
  // Wait a bit to see subscription status
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\nStopping subscription...');
    await channel.unsubscribe();
    process.exit(0);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}

