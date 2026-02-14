-- Update Ledger Entries Table for Phase 2 Transactions
-- Makes profile_id nullable and removes foreign key constraint to support
-- review decisions, tokenized data, and other non-profile transactions

-- Remove foreign key constraint
ALTER TABLE ledger_entries 
  DROP CONSTRAINT IF EXISTS ledger_entries_profile_id_fkey;

-- Make profile_id nullable (it's used flexibly for different entity types)
ALTER TABLE ledger_entries 
  ALTER COLUMN profile_id DROP NOT NULL;

-- Update action column to support longer action names
ALTER TABLE ledger_entries 
  ALTER COLUMN action TYPE VARCHAR(100);

-- Add index on action for faster queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_action ON ledger_entries(action);

-- Update comments to reflect new usage
COMMENT ON TABLE ledger_entries IS 'Immutable ledger entries for all blockchain transactions (profiles, reviews, tokenized data, etc.)';
COMMENT ON COLUMN ledger_entries.profile_id IS 'Entity ID (profile_id, reviewTaskId, dataId, etc.) - used flexibly based on action type';
COMMENT ON COLUMN ledger_entries.version_hash IS 'Hash value (versionHash, decisionHash, tokenizedHash, etc.) - used flexibly based on action type';
COMMENT ON COLUMN ledger_entries.action IS 'Transaction type: PROFILE_ACTIVATED, PROFILE_ARCHIVED, REVIEW_APPROVED, REVIEW_REJECTED, TOKENIZED_DATA_STORED, etc.';




