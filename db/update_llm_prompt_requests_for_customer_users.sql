-- ============================================================================
-- Update llm_prompt_requests to Support Customer Users
-- ============================================================================
-- This migration updates llm_prompt_requests to reference customer_users
-- instead of only internal users, supporting single-tenant customer systems.
-- ============================================================================

-- Make user_id nullable (for customer users) and add customer_user_id
ALTER TABLE llm_prompt_requests 
  DROP CONSTRAINT IF EXISTS llm_prompt_requests_user_id_fkey;

ALTER TABLE llm_prompt_requests 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add customer_user_id column
ALTER TABLE llm_prompt_requests 
  ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES customer_users(id) ON DELETE CASCADE;

-- Add index for customer_user_id
CREATE INDEX IF NOT EXISTS idx_llm_prompt_requests_customer_user 
    ON llm_prompt_requests(customer_user_id);

-- Add constraint to ensure either user_id or customer_user_id is set
ALTER TABLE llm_prompt_requests 
  ADD CONSTRAINT check_user_or_customer_user 
  CHECK (
    (user_id IS NOT NULL AND customer_user_id IS NULL) OR 
    (user_id IS NULL AND customer_user_id IS NOT NULL)
  );

-- Comments
COMMENT ON COLUMN llm_prompt_requests.customer_user_id IS 'Reference to customer user (for single-tenant customer systems)';
COMMENT ON COLUMN llm_prompt_requests.user_id IS 'Reference to internal platform user (nullable for customer prompts)';

