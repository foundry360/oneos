// Check if api_key_hash exists in database
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://aigov:aigov_secret@localhost:5432/ai_governance',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const apiKeyHash = '57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498';

async function checkApiKeyHash() {
  try {
    console.log('Checking database for api_key_hash...\n');
    console.log('Hash:', apiKeyHash);
    console.log('');
    
    // Check all customer_api_keys
    const allKeys = await pool.query(
      `SELECT id, api_key_hash, is_active, customer_account_id, created_at 
       FROM customer_api_keys 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    
    console.log('All customer_api_keys (last 10):');
    if (allKeys.rows.length === 0) {
      console.log('  ❌ No API keys found in database');
    } else {
      allKeys.rows.forEach((row, index) => {
        console.log(`\n  ${index + 1}. ID: ${row.id}`);
        console.log(`     Hash: ${row.api_key_hash?.substring(0, 20)}...`);
        console.log(`     Is Active: ${row.is_active}`);
        console.log(`     Customer Account ID: ${row.customer_account_id}`);
        console.log(`     Created: ${row.created_at}`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Check specific hash
    const specificKey = await pool.query(
      `SELECT 
        cak.id, 
        cak.api_key_hash, 
        cak.is_active, 
        cak.created_at,
        ca.id as customer_id,
        ca.customer_code, 
        ca.status,
        ca.updated_at as customer_updated_at
      FROM customer_api_keys cak
      JOIN customer_accounts ca ON cak.customer_account_id = ca.id
      WHERE cak.api_key_hash = $1`,
      [apiKeyHash]
    );
    
    console.log('Matching record for our hash:');
    if (specificKey.rows.length === 0) {
      console.log('  ❌ No record found with this api_key_hash');
      console.log('  The webhook cannot find a matching record.');
    } else {
      const record = specificKey.rows[0];
      console.log('  ✅ Record found!');
      console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  API Key:');
      console.log('    ID:', record.id);
      console.log('    Hash:', record.api_key_hash);
      console.log('    Is Active:', record.is_active);
      console.log('    Created:', record.created_at);
      console.log('  Customer Account:');
      console.log('    ID:', record.customer_id);
      console.log('    Code:', record.customer_code);
      console.log('    Status:', record.status);
      console.log('    Updated:', record.customer_updated_at);
      console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkApiKeyHash();

