// Test webhook endpoint with active status
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

const testWebhook = {
  type: 'UPDATE',
  table: 'vendor_api_keys',
  record: {
    id: 'a9a7961d-45ae-456c-b181-3a9f78a327a0',
    api_key_hash: '57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498',
    status: 'active',  // Testing ACTIVE status
    customer_code: 'TEST001'
  },
  old_record: {
    status: 'inactive'
  }
};

async function testWebhookActive() {
  try {
    console.log('Testing webhook endpoint with ACTIVE status...');
    console.log('URL:', `${API_URL}/api/webhooks/license-status`);
    console.log('Payload:', JSON.stringify(testWebhook, null, 2));
    console.log('');

    const response = await axios.post(
      `${API_URL}/api/webhooks/license-status`,
      testWebhook,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500
      }
    );

    console.log('✅ Webhook Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.updated) {
      console.log('\n✅ SUCCESS: Webhook processed and database should be updated!');
      console.log('Check database to verify status changed to active.');
    } else if (response.status === 404) {
      console.log('\n⚠️  Customer not found - check if customer_api_keys record exists');
    } else {
      console.log('\n⚠️  Webhook received but may not have updated database');
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ Webhook Error Response:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response received. Is the backend running?');
      console.error('Error:', error.message);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

testWebhookActive();

