# Vendor API Key Flow

## Overview

This document explains the complete flow for vendor API key generation, distribution, and customer installation.

## Architecture

```
┌─────────────────────────────────────┐
│  Vendor Portal (Supabase)           │
│  - Generate API keys                │
│  - Store in vendor_api_keys table   │
│  - Track customer info              │
└─────────────────────────────────────┘
           │
           │ API Key: gov_abc123...
           │
           ▼
┌─────────────────────────────────────┐
│  Customer Receives API Key           │
│  - Via email/portal                  │
│  - During onboarding                 │
└─────────────────────────────────────┘
           │
           │ Customer enters key
           │ during installation
           ▼
┌─────────────────────────────────────┐
│  Customer Installation              │
│  - Validates against vendor         │
│  - Stores in customer_api_keys      │
│  - Creates customer account         │
└─────────────────────────────────────┘
           │
           │ All end-users use
           │ same API key
           ▼
┌─────────────────────────────────────┐
│  Customer's End-Users               │
│  - Use SDK with API key             │
│  - Identified by userId             │
└─────────────────────────────────────┘
```

## Step-by-Step Process

### 1. Vendor Generates API Key

**In Vendor Portal (Supabase):**

```sql
-- Vendor creates API key for customer
INSERT INTO vendor_api_keys (
  api_key_hash,
  customer_name,
  customer_code,
  contact_email,
  subscription_tier,
  license_type,
  status
) VALUES (
  hash_api_key('gov_abc123...'),
  'Acme Corporation',
  'ACME-CORP',
  'admin@acme.com',
  'enterprise',
  'annual',
  'pending'
);
```

**Vendor sends to customer:**
- API Key: `gov_abc123...`
- Installation instructions
- Support contact

### 2. Customer Runs Installation

**Customer executes:**
```bash
./scripts/install.sh
```

**Script prompts:**
```
Enter your vendor API key: gov_abc123...
```

### 3. Installation Validates Key

**Backend calls:**
```
POST /api/installation/validate-key
{
  "apiKey": "gov_abc123..."
}
```

**Backend:**
1. Hashes API key
2. Validates against vendor (Supabase)
3. Checks status (not revoked/expired)
4. Returns customer info

### 4. Installation Stores Key

**Backend:**
1. Creates/updates `customer_accounts` record
2. Stores API key hash in `customer_api_keys` table
3. Generates installation ID
4. Notifies vendor of activation
5. Saves to `.env` file

### 5. End-Users Use SDK

**Customer's end-users:**
```javascript
const response = await governLLM.complete({
  prompt: '...',
  userId: 'employee-123',  // Their internal user ID
  model: 'gpt-4'
});
```

**SDK:**
- Uses `VENDOR_API_KEY` from environment
- Sends `X-API-Key` header
- Backend looks up `customer_api_keys` table
- Identifies customer account
- Creates/updates `customer_users` record

## Database Tables

### Vendor Database (Supabase)

**`vendor_api_keys` table:**
- Stores vendor-generated API keys
- Tracks customer information
- Manages key lifecycle (pending → active → revoked)

### Customer Database

**`customer_accounts` table:**
- One record per customer installation
- Links to vendor via `customer_code`
- Stores installation metadata

**`customer_api_keys` table:**
- Stores validated vendor API key (one per customer)
- Used by all end-users
- Links to `customer_accounts`

**`customer_users` table:**
- Individual end-users within customer
- Identified by `userId` from SDK
- Auto-created on first use

## API Key Lifecycle

```
pending → active → revoked/expired
   │        │
   │        └──→ Used by end-users
   │
   └──→ Customer validates during installation
```

## Environment Variables

### Vendor Side

```env
# Supabase configuration
SUPABASE_VENDOR_URL=https://vendor-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Customer Side

```env
# Vendor API validation
VENDOR_API_URL=https://vendor-project.supabase.co
VENDOR_API_KEY=your-vendor-api-key

# Installation info
INSTALLATION_ID=inst_abc123...
CUSTOMER_CODE=ACME-CORP

# Customer's API key (stored after validation)
VENDOR_API_KEY=gov_abc123...
```

## Security Considerations

1. **API keys are hashed** - Never stored in plain text
2. **One key per customer** - All end-users share the same key
3. **User identification** - End-users identified by `userId` parameter
4. **Key rotation** - Vendor can revoke and issue new keys
5. **Validation required** - Keys must be validated before use

## Troubleshooting

### Key Validation Fails

**Check:**
- API key is correct (no typos)
- Key status in vendor portal (not revoked)
- Vendor API is accessible
- Network connectivity

### Installation Fails

**Check:**
- Backend server is running
- Database is accessible
- Environment variables are set
- Vendor API URL is correct

### End-Users Can't Authenticate

**Check:**
- `VENDOR_API_KEY` is set in environment
- Key is stored in `customer_api_keys` table
- Key is active (`is_active = true`)
- Customer account is active

## Best Practices

1. **Generate keys before installation** - Have keys ready for customers
2. **Secure distribution** - Use encrypted email or secure portal
3. **Track activations** - Monitor when keys are activated
4. **Rotate regularly** - Set expiration dates
5. **Monitor usage** - Track API key usage patterns
6. **Revoke compromised keys** - Have process for immediate revocation


