# Customer Integration - Complete Guide

## Overview

This guide covers everything needed to integrate customers with the LLM Governance Platform, including account management, API key creation, and the lightweight SDK installation.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Customer Account Management](#customer-account-management)
3. [API Key Management](#api-key-management)
4. [SDK Installation](#sdk-installation)
5. [Integration Examples](#integration-examples)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Admins: Create Customer Account

```bash
# 1. Run database migrations
psql -h localhost -U your_user -d your_database -f db/customer_management_migration.sql
psql -h localhost -U your_user -d your_database -f db/llm_governance_migration.sql

# 2. Create customer (using script or API)
./scripts/create-customer.sh

# 3. Send API key to customer
```

### For Customers: Install SDK

```bash
# 1. Download SDK
curl -o govern-llm.js https://governance.yourcompany.com/sdk/govern-llm.js

# 2. Set API key
export GOVERNANCE_API_KEY="gov_your_key_here"

# 3. Use in code
const { governLLM } = require('./govern-llm.js');
```

---

## Customer Account Management

### Creating a Customer Account

**Method 1: Using API**

```bash
curl -X POST https://governance.yourcompany.com/api/customers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Acme Corporation",
    "customerCode": "ACME-CORP",
    "contactEmail": "admin@acme.com",
    "contactName": "John Doe",
    "domain": "financial"
  }'
```

**Method 2: Using Script**

```bash
chmod +x scripts/create-customer.sh  # Linux/Mac only
./scripts/create-customer.sh
```

**Method 3: Using Admin Portal (Future)**

Navigate to Admin Portal → Customers → Create New Customer

### Customer Account Fields

| Field | Required | Description |
|-------|----------|-------------|
| `customerName` | Yes | Full company name |
| `customerCode` | Yes | Unique short code (e.g., "ACME-CORP") |
| `contactEmail` | Yes | Primary contact email |
| `contactName` | No | Contact person name |
| `domain` | No | Default domain for governance profiles |
| `governanceProfileId` | No | Default governance profile UUID |
| `llmProviderConfigId` | No | Default LLM provider config UUID |

---

## API Key Management

### Creating an API Key

**After creating a customer account, create an API key:**

```bash
curl -X POST https://governance.yourcompany.com/api/customers/CUSTOMER_ID/api-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "Production Key",
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

**Response:**
```json
{
  "apiKey": "gov_abc123def456...",
  "apiKeyId": "uuid",
  "keyName": "Production Key",
  "warning": "Save this API key securely. It will not be shown again."
}
```

⚠️ **CRITICAL:** The API key is only shown once. Save it immediately!

### API Key Format

- **Prefix:** `gov_` (identifies as governance platform key)
- **Length:** 32 characters after prefix
- **Example:** `gov_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### Managing API Keys

**List all keys for a customer:**
```bash
curl https://governance.yourcompany.com/api/customers/CUSTOMER_ID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Revoke an API key:**
```bash
curl -X POST https://governance.yourcompany.com/api/customers/CUSTOMER_ID/api-keys/KEY_ID/revoke \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### API Key Security

- ✅ Keys are hashed (SHA-256) before storage
- ✅ Keys cannot be retrieved after creation
- ✅ Keys can be revoked instantly
- ✅ Keys can have expiration dates
- ✅ Usage is tracked (last used timestamp)

---

## SDK Installation

### Method 1: Direct Download (Recommended)

```bash
# Download SDK file
curl -o govern-llm.js https://governance.yourcompany.com/sdk/govern-llm.js

# Or use the install script
curl -sSL https://governance.yourcompany.com/install.sh | bash
```

### Method 2: Copy-Paste

Copy the contents of `sdk/govern-llm.js` into your project.

### Method 3: NPM Package (Coming Soon)

```bash
npm install @governance/llm-sdk
```

---

## Integration Examples

### Example 1: Basic Integration

```javascript
const { governLLM } = require('./govern-llm.js');

async function chatWithLLM(userPrompt) {
  try {
    const response = await governLLM.complete({
      prompt: userPrompt,
      model: 'gpt-4',
      provider: 'openai'
    });
    
    return response.text;
  } catch (error) {
    if (error.status === 'pending_review') {
      return 'Your request is being reviewed. Please check back later.';
    }
    throw error;
  }
}
```

### Example 2: With Error Handling

```javascript
const { governLLM } = require('./govern-llm.js');

async function processPrompt(prompt) {
  try {
    const response = await governLLM.complete({
      prompt,
      model: 'gpt-4',
      domain: 'financial' // Use financial governance profile
    });
    
    console.log('Response:', response.text);
    console.log('Risk Level:', response.metadata.riskLevel);
    console.log('Tokens Used:', response.metadata.totalTokens);
    
    return response;
  } catch (error) {
    switch (error.status) {
      case 'pending_review':
        console.log('Review required. Request ID:', error.requestId);
        // Poll for status or notify user
        break;
      case 'rejected':
        console.error('Prompt rejected:', error.message);
        // Show user-friendly error
        break;
      default:
        console.error('Error:', error.message);
    }
    throw error;
  }
}
```

### Example 3: Replace Existing LLM Client

```javascript
// BEFORE: Direct OpenAI call
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }]
});

// AFTER: Governed LLM call
const { governLLM } = require('./govern-llm.js');

const response = await governLLM.complete({
  prompt: prompt,
  model: 'gpt-4',
  provider: 'openai'
});

// Response format is similar
console.log(response.text); // Equivalent to completion.choices[0].message.content
```

---

## How API Keys Work

### 1. Key Generation

When you create an API key:
1. System generates: `gov_` + 32 random hex characters
2. Key is hashed: SHA-256 hash stored in database
3. Original key is returned once (then discarded)

### 2. Authentication Flow

```
Customer Request
    ↓
X-API-Key: gov_abc123...
    ↓
[customerApiKeyAuth middleware]
    ↓
Hash API key → Lookup in database
    ↓
Find customer_account → Attach to req.user
    ↓
Continue to route handler
```

### 3. Security Features

- **Hashed Storage**: Keys stored as SHA-256 hashes
- **One-Time Display**: Original key only shown at creation
- **Revocation**: Keys can be instantly revoked
- **Expiration**: Optional expiration dates
- **Usage Tracking**: Last used timestamp recorded

---

## Customer Account Workflow

### Complete Onboarding Process

1. **Admin creates customer account**
   ```bash
   POST /api/customers
   ```

2. **Admin creates API key**
   ```bash
   POST /api/customers/:id/api-keys
   ```

3. **Admin sends credentials to customer**
   - API Key
   - API URL
   - Installation guide link

4. **Customer installs SDK**
   ```bash
   curl -o govern-llm.js https://governance.yourcompany.com/sdk/govern-llm.js
   export GOVERNANCE_API_KEY="gov_..."
   ```

5. **Customer updates code**
   ```javascript
   const { governLLM } = require('./govern-llm.js');
   ```

6. **Customer tests integration**
   ```javascript
   await governLLM.complete({ prompt: 'test', model: 'gpt-4' });
   ```

---

## Monitoring & Usage

### View Customer Usage

```bash
curl https://governance.yourcompany.com/api/customers/CUSTOMER_ID/usage \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "usage": [
    {
      "date": "2024-01-15",
      "requestCount": 1250,
      "tokenCount": 450000,
      "reviewCount": 15
    }
  ]
}
```

### View API Key Status

```bash
curl https://governance.yourcompany.com/api/customers/CUSTOMER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Shows all API keys with:
- Last used timestamp
- Expiration date
- Active status

---

## Troubleshooting

### Customer Can't Authenticate

1. **Verify API key format**
   - Should start with `gov_`
   - Should be 36 characters total

2. **Check key status**
   ```sql
   SELECT * FROM customer_api_keys 
   WHERE api_key_hash = hash_api_key('gov_abc123...');
   ```

3. **Verify customer account is active**
   ```sql
   SELECT status FROM customer_accounts WHERE id = 'customer-id';
   ```

4. **Check key expiration**
   ```sql
   SELECT expires_at FROM customer_api_keys WHERE id = 'key-id';
   ```

### SDK Errors

**"GOVERNANCE_API_KEY is required"**
- Set environment variable: `export GOVERNANCE_API_KEY="your-key"`
- Or pass in constructor: `new GovernLLM({ apiKey: 'your-key' })`

**"Fetch is not available" (Node.js < 18)**
- Install node-fetch: `npm install node-fetch`

**Network errors**
- Verify `GOVERNANCE_API_URL` is correct
- Check firewall rules
- Verify API endpoint is accessible

---

## Best Practices

### For Admins

1. **Use descriptive customer codes** (e.g., "ACME-CORP" not "CUST001")
2. **Create separate keys for environments** (dev, staging, prod)
3. **Set expiration dates** for temporary keys
4. **Monitor usage regularly** for unusual patterns
5. **Rotate keys periodically** (every 90 days)

### For Customers

1. **Store API keys securely** (environment variables, secrets manager)
2. **Never commit keys to version control**
3. **Use different keys per environment**
4. **Handle review-required errors gracefully**
5. **Monitor your usage** via admin portal

---

## Files Created

### Database
- `db/customer_management_migration.sql` - Customer accounts and API keys

### Backend
- `backend/src/middleware/customerAuth.js` - API key authentication
- `backend/src/routes/customers.js` - Customer management API
- `backend/src/routes/llm.js` - Updated to support API key auth

### SDK
- `sdk/govern-llm.js` - Single-file SDK (zero dependencies)

### Documentation
- `docs/CUSTOMER_INSTALLATION_GUIDE.md` - Customer installation guide
- `docs/CUSTOMER_MANAGEMENT_GUIDE.md` - Admin management guide
- `docs/QUICK_START_SUMMARY.md` - Quick reference

### Scripts
- `scripts/quick-install.sh` - Customer installation script
- `scripts/create-customer.sh` - Admin customer creation script

---

## Next Steps

1. ✅ Run database migrations
2. ✅ Test customer account creation
3. ✅ Test API key creation
4. ✅ Test SDK installation
5. ✅ Test end-to-end flow
6. 📊 Set up monitoring dashboards
7. 📧 Prepare customer onboarding materials

---

## Support

- **Customer Support:** support@governance.yourcompany.com
- **Admin Support:** admin@governance.yourcompany.com
- **Documentation:** https://docs.governance.yourcompany.com

