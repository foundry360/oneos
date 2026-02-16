# Vendor Portal Setup Guide

This guide explains how to set up the vendor portal in Supabase to generate and manage customer API keys.

## Prerequisites

- Supabase account
- Supabase project created
- Vendor admin access

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Create new project (or use existing)
3. Note your project URL and API keys

## Step 2: Create Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- Vendor API keys table
CREATE TABLE vendor_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_hash VARCHAR(64) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_code VARCHAR(100) NOT NULL UNIQUE,
    contact_email VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50),
    license_type VARCHAR(50),
    expires_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    activated_at TIMESTAMP,
    installation_id VARCHAR(100),
    installation_url VARCHAR(500),
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_vendor_api_keys_hash ON vendor_api_keys(api_key_hash);
CREATE INDEX idx_vendor_api_keys_status ON vendor_api_keys(status);
CREATE INDEX idx_vendor_api_keys_customer_code ON vendor_api_keys(customer_code);

-- Enable RLS
ALTER TABLE vendor_api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read for key validation (with hash only)
CREATE POLICY "Allow key validation"
    ON vendor_api_keys
    FOR SELECT
    USING (true); -- Allow validation queries

-- Policy: Only authenticated users can insert/update
CREATE POLICY "Vendor admins can manage keys"
    ON vendor_api_keys
    FOR ALL
    USING (auth.role() = 'authenticated');
```

## Step 3: Create Vendor Admin User

1. Go to Supabase Auth → Users
2. Create a new user (or use existing)
3. Note the user ID

## Step 4: Generate API Key Function

Create a function to generate API keys:

```sql
CREATE OR REPLACE FUNCTION generate_vendor_api_key()
RETURNS TEXT AS $$
DECLARE
    key_part TEXT;
    full_key TEXT;
BEGIN
    key_part := encode(gen_random_bytes(16), 'hex');
    full_key := 'gov_' || key_part;
    RETURN full_key;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION hash_vendor_api_key(api_key TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(digest(api_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;
```

## Step 5: Generate API Key for Customer

### Option A: Via Supabase Dashboard

1. Go to SQL Editor
2. Run:

```sql
-- Generate API key
DO $$
DECLARE
    new_api_key TEXT;
    api_key_hash VARCHAR(64);
BEGIN
    -- Generate key
    new_api_key := generate_vendor_api_key();
    api_key_hash := hash_vendor_api_key(new_api_key);
    
    -- Insert into table
    INSERT INTO vendor_api_keys (
        api_key_hash,
        customer_name,
        customer_code,
        contact_email,
        subscription_tier,
        license_type,
        status
    ) VALUES (
        api_key_hash,
        'Acme Corporation',
        'ACME-CORP',
        'admin@acme.com',
        'enterprise',
        'annual',
        'pending'
    );
    
    -- Return the key (only shown once!)
    RAISE NOTICE 'API Key: %', new_api_key;
    RAISE NOTICE '⚠️ Save this key immediately - it will not be shown again!';
END $$;
```

### Option B: Via Simple Portal (Next.js)

Create a simple Next.js app that:
1. Connects to Supabase
2. Provides UI to generate keys
3. Displays key once (then stores hash only)

## Step 6: Configure Customer Installation

Set environment variables in customer's `.env`:

```env
# Vendor API Configuration
VENDOR_API_URL=https://your-project.supabase.co
VENDOR_API_KEY=your-supabase-anon-key

# Or use SUPABASE_VENDOR_URL
SUPABASE_VENDOR_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Step 7: Customer Installation

Customer runs:
```bash
./scripts/install.sh
```

Enters API key: `gov_abc123...`

Installation:
1. Validates against Supabase
2. Stores in customer's database
3. Notifies vendor (updates status to 'active')

## Monitoring Keys

### View All Keys

```sql
SELECT 
    customer_name,
    customer_code,
    status,
    created_at,
    activated_at,
    installation_url
FROM vendor_api_keys
ORDER BY created_at DESC;
```

### Find Pending Keys

```sql
SELECT * FROM vendor_api_keys
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Find Active Installations

```sql
SELECT 
    customer_name,
    customer_code,
    installation_url,
    activated_at,
    metadata
FROM vendor_api_keys
WHERE status = 'active'
ORDER BY activated_at DESC;
```

## Revoking Keys

```sql
UPDATE vendor_api_keys
SET 
    status = 'revoked',
    revoked_at = NOW(),
    revoked_by = auth.uid()
WHERE customer_code = 'ACME-CORP';
```

## Integration with HubSpot

You can sync keys to HubSpot:

```javascript
// After generating key in Supabase
await hubspotService.syncApiKey({
  apiKey: newApiKey,
  customerCode: 'ACME-CORP',
  customerName: 'Acme Corporation',
  subscriptionTier: 'enterprise',
  status: 'pending'
});
```

## Best Practices

1. **Generate keys before customer onboarding** - Have keys ready
2. **Use secure distribution** - Encrypted email or secure portal
3. **Track activations** - Monitor when keys are activated
4. **Set expiration dates** - For trial or temporary keys
5. **Revoke compromised keys** - Have process for immediate action
6. **Monitor usage** - Track which keys are being used

## Troubleshooting

### Customer Can't Validate Key

**Check:**
- Key exists in `vendor_api_keys` table
- Key status is 'pending' or 'active'
- Key hash matches (use `hash_vendor_api_key()` function)
- Customer has correct `VENDOR_API_URL` and `VENDOR_API_KEY`

### Key Validation Returns 401

**Check:**
- Supabase anon key is correct
- RLS policies allow validation queries
- API key hash matches database

### Installation Doesn't Activate Key

**Check:**
- Customer's backend can reach Supabase
- Installation ID is being sent
- Update query is working


