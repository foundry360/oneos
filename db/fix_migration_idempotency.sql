-- ============================================================================
-- Fix Migration Idempotency
-- ============================================================================
-- This script fixes any migration issues by ensuring triggers can be recreated
-- Run this if you get "trigger already exists" errors
-- ============================================================================

-- Drop and recreate LLM governance triggers
DROP TRIGGER IF EXISTS update_llm_prompt_requests_updated_at ON llm_prompt_requests;
CREATE TRIGGER update_llm_prompt_requests_updated_at
    BEFORE UPDATE ON llm_prompt_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_llm_prompt_requests_updated_at();

-- Drop and recreate customer management triggers
DROP TRIGGER IF EXISTS update_customer_accounts_updated_at ON customer_accounts;
CREATE TRIGGER update_customer_accounts_updated_at
    BEFORE UPDATE ON customer_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_accounts_updated_at();

-- Verify triggers exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_llm_prompt_requests_updated_at'
    ) THEN
        RAISE EXCEPTION 'LLM prompt requests trigger not found';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_customer_accounts_updated_at'
    ) THEN
        RAISE EXCEPTION 'Customer accounts trigger not found';
    END IF;
    
    RAISE NOTICE '✅ All triggers created successfully';
END $$;

