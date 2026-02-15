# Customer Management Guide

## Overview

This guide explains how to create and manage customer accounts, API keys, and monitor usage in the Governance Platform.

---

## Customer Account Management

### Creating a Customer Account

**Endpoint:** `POST /api/customers`

**Required Role:** Admin

**Request Body:**
```json
{
  "customerName": "Acme Corporation",
  "customerCode": "ACME-CORP",
  "contactEmail": "admin@acme.com",
  "contactName": "John Doe",
  "domain": "financial",
  "governanceProfileId": "uuid-here",
  "llmProviderConfigId": "uuid-here",
  "metadata": {
    "industry": "finance",
    "region": "US"
  }
}
```

**Response:**
```json
{
  "customer": {
    "id": "uuid",
    "customerName": "Acme Corporation",
    "customerCode": "ACME-CORP",
    "contactEmail": "admin@acme.com",
    "status": "active",
    "domain": "financial",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

**Example (cURL):**
```bash
curl -X POST https://governance.yourcompany.com/api/customers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Acme Corporation",
    "customerCode": "ACME-CORP",
    "contactEmail": "admin@acme.com",
    "domain": "financial"
  }'
```

---

## API Key Management

### Creating an API Key

**Endpoint:** `POST /api/customers/:customerId/api-keys`

**Required Role:** Admin

**Request Body:**
```json
{
  "keyName": "Production Key",
  "expiresAt": "2025-12-31T23:59:59Z",
  "permissions": {
    "allowStreaming": true,
    "maxRequestsPerDay": 10000
  }
}
```

**Response:**
```json
{
  "apiKey": "gov_abc123def456...",
  "apiKeyId": "uuid",
  "keyName": "Production Key",
  "expiresAt": "2025-12-31T23:59:59Z",
  "warning": "Save this API key securely. It will not be shown again."
}
```

⚠️ **Important:** The API key is only shown once. Save it immediately!

**Example (cURL):**
```bash
curl -X POST https://governance.yourcompany.com/api/customers/CUSTOMER_ID/api-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "Production Key"
  }'
```

### Listing API Keys

**Endpoint:** `GET /api/customers/:customerId`

**Response includes all API keys:**
```json
{
  "id": "customer-uuid",
  "customer_name": "Acme Corporation",
  "api_keys": [
    {
      "id": "key-uuid",
      "keyName": "Production Key",
      "isActive": true,
      "lastUsedAt": "2024-01-15T14:30:00Z",
      "expiresAt": null,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Revoking an API Key

**Endpoint:** `POST /api/customers/:customerId/api-keys/:apiKeyId/revoke`

**Required Role:** Admin

**Response:**
```json
{
  "message": "API key revoked successfully"
}
```

**Example (cURL):**
```bash
curl -X POST https://governance.yourcompany.com/api/customers/CUSTOMER_ID/api-keys/KEY_ID/revoke \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Customer Account Workflow

### Step 1: Create Customer Account

```bash
# Create customer
curl -X POST https://governance.yourcompany.com/api/customers \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Acme Corporation",
    "customerCode": "ACME-CORP",
    "contactEmail": "admin@acme.com",
    "domain": "financial"
  }'
```

**Save the customer ID from the response.**

### Step 2: Create API Key

```bash
# Create API key for customer
curl -X POST https://governance.yourcompany.com/api/customers/CUSTOMER_ID/api-keys \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "Initial API Key"
  }'
```

**Save the API key immediately - it won't be shown again!**

### Step 3: Send Credentials to Customer

Send the customer:
- API Key: `gov_abc123...`
- API URL: `https://governance.yourcompany.com`
- Installation guide link

### Step 4: Monitor Usage

```bash
# Get usage statistics
curl https://governance.yourcompany.com/api/customers/CUSTOMER_ID/usage \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Customer Account Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customerName` | string | Yes | Full customer name |
| `customerCode` | string | Yes | Unique short code (e.g., "ACME-CORP") |
| `contactEmail` | string | Yes | Primary contact email |
| `contactName` | string | No | Contact person name |
| `domain` | string | No | Default domain for governance profile selection |
| `governanceProfileId` | UUID | No | Default governance profile |
| `llmProviderConfigId` | UUID | No | Default LLM provider configuration |
| `metadata` | JSON | No | Additional customer-specific data |
| `status` | enum | No | `active`, `suspended`, `inactive` |

---

## API Key Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `keyName` | string | No | Friendly name for the key |
| `expiresAt` | datetime | No | Expiration date (null = never expires) |
| `permissions` | JSON | No | API permissions and restrictions |

### Permissions Object

```json
{
  "allowStreaming": true,
  "maxRequestsPerDay": 10000,
  "maxTokensPerRequest": 100000,
  "allowedModels": ["gpt-4", "gpt-3.5-turbo"],
  "allowedDomains": ["financial", "general"]
}
```

---

## Usage Tracking

### Get Customer Usage

**Endpoint:** `GET /api/customers/:customerId/usage`

**Query Parameters:**
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)

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

---

## Customer Account Status

### Status Values

- **`active`** - Account is active and can use API
- **`suspended`** - Account temporarily suspended
- **`inactive`** - Account deactivated

### Updating Status

```sql
-- Suspend customer
UPDATE customer_accounts 
SET status = 'suspended' 
WHERE id = 'customer-uuid';

-- Reactivate customer
UPDATE customer_accounts 
SET status = 'active' 
WHERE id = 'customer-uuid';
```

---

## Best Practices

### 1. Customer Onboarding

1. Create customer account with unique `customerCode`
2. Create initial API key
3. Send credentials securely (encrypted email, password manager, etc.)
4. Provide installation guide
5. Schedule onboarding call

### 2. API Key Management

- **Create separate keys for environments** (dev, staging, prod)
- **Set expiration dates** for temporary keys
- **Use descriptive key names** (e.g., "Production - Web App", "Staging - API")
- **Rotate keys regularly** (every 90 days recommended)
- **Revoke compromised keys immediately**

### 3. Monitoring

- **Check usage daily** for new customers
- **Set up alerts** for unusual activity
- **Review API key last used dates** monthly
- **Monitor for expired keys**

### 4. Security

- **Never share API keys** in plain text
- **Use secure channels** for key distribution
- **Implement key rotation** policy
- **Audit key usage** regularly

---

## Admin Portal UI (Future)

A web-based admin portal will provide:

- ✅ Customer account management
- ✅ API key creation and revocation
- ✅ Usage dashboards
- ✅ Governance profile assignment
- ✅ Billing and quotas
- ✅ Audit logs

---

## Database Schema

### customer_accounts

Stores customer account information and configuration.

### customer_api_keys

Stores API keys with hashed values for security.

### customer_usage

Tracks daily usage statistics per customer.

---

## Troubleshooting

### Customer can't authenticate

1. Verify API key is correct
2. Check if key is active: `SELECT * FROM customer_api_keys WHERE api_key_hash = '...'`
3. Check if customer account is active: `SELECT status FROM customer_accounts WHERE id = '...'`
4. Verify key hasn't expired

### API key not found

1. Verify the key hash matches: `SELECT hash_api_key('gov_abc123...')`
2. Check if key was revoked
3. Verify customer account exists and is active

### Usage not tracking

1. Check `customer_usage` table for entries
2. Verify `track_api_key_usage()` function is being called
3. Check for database errors in logs

---

## Support

For customer management issues:
- **Email:** admin@governance.yourcompany.com
- **Documentation:** https://docs.governance.yourcompany.com/admin

