-- ============================================================================
-- Customer Users Database Migration
-- ============================================================================
-- This migration creates the customer_users table to track individual users
-- within each customer's single-tenant system.
-- ============================================================================

-- Table for individual users within customer accounts
CREATE TABLE IF NOT EXISTS customer_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    customer_user_id VARCHAR(255) NOT NULL, -- Customer's internal user identifier
    customer_user_email VARCHAR(255), -- Customer's internal user email
    display_name VARCHAR(255),
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'governance', 'reviewer', 'user')),
    metadata JSONB DEFAULT '{}', -- Additional user metadata from customer
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_account_id, customer_user_id) -- One user per customer account
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_users_customer_account 
    ON customer_users(customer_account_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_role 
    ON customer_users(customer_account_id, role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_users_customer_user_id 
    ON customer_users(customer_account_id, customer_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_is_active 
    ON customer_users(customer_account_id, is_active) WHERE is_active = true;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_users_updated_at ON customer_users;
CREATE TRIGGER update_customer_users_updated_at
    BEFORE UPDATE ON customer_users
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_users_updated_at();

-- Comments for documentation
COMMENT ON TABLE customer_users IS 'Individual users within customer accounts (single-tenant)';
COMMENT ON COLUMN customer_users.customer_user_id IS 'Customer''s internal user identifier (e.g., employee ID, username)';
COMMENT ON COLUMN customer_users.customer_user_email IS 'Customer''s internal user email address';
COMMENT ON COLUMN customer_users.role IS 'User role within the customer system for assignment purposes';

