-- ============================================================================
-- Step 1: Add Columns for Hash Chaining
-- ============================================================================
-- This step adds the necessary columns for hash chaining:
-- - sequence_number: Sequential ordering
-- - previous_entry_hash: Links to previous entry
-- ============================================================================

-- Enable pgcrypto extension for hash functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add sequence number for ordering (critical for hash chain)
ALTER TABLE ledger_entries 
  ADD COLUMN IF NOT EXISTS sequence_number BIGSERIAL;

-- Add previous entry hash for chaining
ALTER TABLE ledger_entries 
  ADD COLUMN IF NOT EXISTS previous_entry_hash VARCHAR(64);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_entries_sequence ON ledger_entries(sequence_number);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_previous_hash ON ledger_entries(previous_entry_hash);

-- Add comments
COMMENT ON COLUMN ledger_entries.sequence_number IS 'Sequential number for ordering entries in the chain';
COMMENT ON COLUMN ledger_entries.previous_entry_hash IS 'Hash of previous entry for chain integrity';

-- Verify columns were added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ledger_entries' 
          AND column_name = 'sequence_number'
    ) THEN
        RAISE EXCEPTION 'Failed to add sequence_number column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ledger_entries' 
          AND column_name = 'previous_entry_hash'
    ) THEN
        RAISE EXCEPTION 'Failed to add previous_entry_hash column';
    END IF;
    
    RAISE NOTICE '✅ Step 1 Complete: Columns added successfully';
END $$;

