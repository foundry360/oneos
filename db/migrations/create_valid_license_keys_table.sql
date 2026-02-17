-- ============================================================================
-- Migration: Create valid_license_keys table for UI-managed license keys
-- ============================================================================
-- This table stores valid license key hashes that can be managed from the UI
-- Works in addition to (or instead of) VALID_LICENSE_KEY_HASHES environment variable
-- ============================================================================

-- Table to store valid license key hashes (managed from UI)
CREATE TABLE IF NOT EXISTS valid_license_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash
    description TEXT, -- Optional description (e.g., "Customer ABC License")
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- User who added it (if available)
    metadata JSONB DEFAULT '{}' -- Additional metadata
);

-- Index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_valid_license_keys_hash 
ON valid_license_keys(license_key_hash) WHERE is_active = true;

-- Index for active keys
CREATE INDEX IF NOT EXISTS idx_valid_license_keys_is_active 
ON valid_license_keys(is_active) WHERE is_active = true;

-- Comments for documentation
COMMENT ON TABLE valid_license_keys IS 'Stores valid license key hashes that can be managed from the UI. Used for license validation.';
COMMENT ON COLUMN valid_license_keys.license_key_hash IS 'SHA-256 hash of the license key';
COMMENT ON COLUMN valid_license_keys.description IS 'Optional description for the license key (e.g., customer name)';

