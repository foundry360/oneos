-- Update decisions table to allow 'llm-prompt' type
-- This migration adds 'llm-prompt' to the allowed decision types

DO $$
BEGIN
    -- Drop the existing check constraint
    ALTER TABLE decisions DROP CONSTRAINT IF EXISTS decisions_type_check;
    
    -- Add new constraint with 'llm-prompt' included
    ALTER TABLE decisions 
    ADD CONSTRAINT decisions_type_check 
    CHECK (type IN ('data-access', 'model-deployment', 'policy-exception', 'data-retention', 'user-permission', 'llm-prompt'));
    
    RAISE NOTICE '✅ Updated decisions table to allow llm-prompt type';
END $$;


