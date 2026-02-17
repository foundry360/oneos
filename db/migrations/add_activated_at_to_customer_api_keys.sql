-- ============================================================================
-- Migration: Add activated_at column to customer_api_keys for timeboxed licenses
-- ============================================================================
-- This migration adds the activated_at timestamp column to track when a license
-- key was activated, enabling 12-month expiration from activation date.
-- ============================================================================

-- Add activated_at column if it doesn't exist
ALTER TABLE customer_api_keys 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;

-- Create index for expiration checks (performance optimization)
CREATE INDEX IF NOT EXISTS idx_customer_api_keys_expires_at 
ON customer_api_keys(expires_at) WHERE is_active = true;

-- Create index for activation date queries
CREATE INDEX IF NOT EXISTS idx_customer_api_keys_activated_at 
ON customer_api_keys(activated_at) WHERE is_active = true;

-- Add comment for documentation
COMMENT ON COLUMN customer_api_keys.activated_at IS 'Timestamp when the license key was activated. Used to calculate expiration date (12 months from activation).';

