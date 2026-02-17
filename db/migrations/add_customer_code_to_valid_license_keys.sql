-- ============================================================================
-- Migration: Add customer_code to valid_license_keys table
-- ============================================================================
-- This associates each license key with a customer ID code from the internal license platform
-- Used to validate that license keys are activated by the correct customer
-- ============================================================================

-- Add customer_code column
ALTER TABLE valid_license_keys
ADD COLUMN IF NOT EXISTS customer_code VARCHAR(100);

-- Index for customer code lookups
CREATE INDEX IF NOT EXISTS idx_valid_license_keys_customer_code
ON valid_license_keys(customer_code) WHERE is_active = true;

-- Comments for documentation
COMMENT ON COLUMN valid_license_keys.customer_code IS 'Customer ID code from internal license platform. Used to validate license key belongs to correct customer during activation.';

