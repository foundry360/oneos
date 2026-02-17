// Verify database status after webhook
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const apiKeyHash = '57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498';

async function verifyDatabaseStatus() {
  try {
    console.log('Checking database status...\n');
    
    const result = await pool.query(
      `SELECT 
        ca.id as customer_id,
        ca.customer_code,
        ca.status as customer_status,
        ca.updated_at as customer_updated_at,
        cak.id as api_key_id,
        cak.api_key_hash,
        cak.is_active,
        cak.created_at as key_created_at
      FROM customer_accounts ca
      JOIN customer_api_keys cak ON ca.id = cak.customer_account_id
      WHERE cak.api_key_hash = $1`,
      [apiKeyHash]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No matching record found!');
      console.log('   The webhook cannot find a customer with this api_key_hash.');
      console.log('   Make sure you ran the script to create the matching record.');
      console.log('\n   Expected hash:', apiKeyHash);
    } else {
      const record = result.rows[0];
      console.log('✅ Matching record found:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Customer Account:');
      console.log('  ID:', record.customer_id);
      console.log('  Code:', record.customer_code);
      console.log('  Status:', record.customer_status);
      console.log('  Last Updated:', record.customer_updated_at);
      console.log('\nCustomer API Key:');
      console.log('  ID:', record.api_key_id);
      console.log('  Hash:', record.api_key_hash.substring(0, 20) + '...');
      console.log('  Is Active:', record.is_active);
      console.log('  Created:', record.key_created_at);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (record.customer_status === 'inactive' && record.is_active === false) {
        console.log('\n✅ Status is correctly set to inactive!');
      } else if (record.customer_status === 'active' && record.is_active === true) {
        console.log('\n⚠️  Status is still active. Webhook may not have reached the endpoint yet.');
        console.log('   Check:');
        console.log('   1. Is the tunnel running?');
        console.log('   2. Is the Supabase webhook URL correct?');
        console.log('   3. Check backend logs for webhook activity');
      } else {
        console.log('\n⚠️  Status mismatch detected!');
        console.log('   Customer status:', record.customer_status);
        console.log('   API key is_active:', record.is_active);
      }
    }
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

verifyDatabaseStatus();

