-- ============================================================================
-- Customer Management Database Migration
-- ============================================================================
-- This migration creates tables for customer account management and API keys
-- ============================================================================

-- Table for customer accounts
CREATE TABLE IF NOT EXISTS customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL UNIQUE,
    customer_code VARCHAR(100) NOT NULL UNIQUE, -- Short code like "ACME-CORP"
    contact_email VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    domain VARCHAR(100), -- Default domain for governance profile selection
    governance_profile_id UUID REFERENCES governance_profiles(id),
    llm_provider_config_id UUID REFERENCES llm_provider_configs(id),
    metadata JSONB DEFAULT '{}', -- Additional customer-specific config
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Table for customer API keys
CREATE TABLE IF NOT EXISTS customer_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    api_key VARCHAR(255) NOT NULL UNIQUE, -- Hashed API key
    api_key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash for lookup
    key_name VARCHAR(255), -- Friendly name for the key
    permissions JSONB DEFAULT '{}', -- API permissions/restrictions
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES users(id)
);

-- Table for customer usage tracking
CREATE TABLE IF NOT EXISTS customer_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES customer_api_keys(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_account_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_code ON customer_accounts(customer_code);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_status ON customer_accounts(status);
CREATE INDEX IF NOT EXISTS idx_customer_api_keys_api_key_hash ON customer_api_keys(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_customer_api_keys_customer_account_id ON customer_api_keys(customer_account_id);
CREATE INDEX IF NOT EXISTS idx_customer_api_keys_is_active ON customer_api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_usage_customer_account_id ON customer_usage(customer_account_id);
CREATE INDEX IF NOT EXISTS idx_customer_usage_date ON customer_usage(date);

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key(prefix TEXT DEFAULT 'gov')
RETURNS TEXT AS $$
DECLARE
    key_part TEXT;
    full_key TEXT;
BEGIN
    -- Generate random part (32 characters)
    key_part := encode(gen_random_bytes(16), 'hex');
    full_key := prefix || '_' || key_part;
    RETURN full_key;
END;
$$ LANGUAGE plpgsql;

-- Function to hash API key for storage
CREATE OR REPLACE FUNCTION hash_api_key(api_key TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(digest(api_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_customer_accounts_updated_at ON customer_accounts;
CREATE TRIGGER update_customer_accounts_updated_at
    BEFORE UPDATE ON customer_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_accounts_updated_at();

-- Function to track API key usage
CREATE OR REPLACE FUNCTION track_api_key_usage(key_hash VARCHAR(64))
RETURNS VOID AS $$
BEGIN
    UPDATE customer_api_keys
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE api_key_hash = key_hash;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE customer_accounts IS 'Customer account information and configuration';
COMMENT ON TABLE customer_api_keys IS 'API keys for customer authentication';
COMMENT ON TABLE customer_usage IS 'Daily usage tracking for customers';

COMMENT ON COLUMN customer_accounts.customer_code IS 'Short unique identifier for the customer (e.g., ACME-CORP)';
COMMENT ON COLUMN customer_api_keys.api_key_hash IS 'SHA-256 hash of the API key for secure lookup';
COMMENT ON COLUMN customer_api_keys.permissions IS 'JSON object defining API permissions and restrictions';

