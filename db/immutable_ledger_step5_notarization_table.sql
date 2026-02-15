-- ============================================================================
-- Step 5: Create Root Hash Notarization Table
-- ============================================================================
-- This step creates the table for storing periodic root hash notarizations.
-- Run this AFTER Step 4.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ledger_root_hashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_hash VARCHAR(64) NOT NULL UNIQUE,
    sequence_start BIGINT NOT NULL,
    sequence_end BIGINT NOT NULL,
    entry_count INTEGER NOT NULL,
    notarized_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notarized_by TEXT, -- Could be system, external service, or user
    metadata JSONB DEFAULT '{}',
    previous_root_hash VARCHAR(64), -- Links to previous notarization
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ledger_root_hashes_sequence ON ledger_root_hashes(sequence_end);
CREATE INDEX IF NOT EXISTS idx_ledger_root_hashes_notarized_at ON ledger_root_hashes(notarized_at);
CREATE INDEX IF NOT EXISTS idx_ledger_root_hashes_previous ON ledger_root_hashes(previous_root_hash);

-- Add comments
COMMENT ON TABLE ledger_root_hashes IS 'Periodic root hash notarizations for ledger integrity verification';
COMMENT ON COLUMN ledger_root_hashes.root_hash IS 'Merkle root hash of all entries in the range';
COMMENT ON COLUMN ledger_root_hashes.sequence_start IS 'First sequence number in this notarization';
COMMENT ON COLUMN ledger_root_hashes.sequence_end IS 'Last sequence number in this notarization';
COMMENT ON COLUMN ledger_root_hashes.previous_root_hash IS 'Hash of previous notarization for chaining';

-- Verify table was created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ledger_root_hashes'
    ) THEN
        RAISE EXCEPTION 'Failed to create ledger_root_hashes table';
    END IF;
    
    RAISE NOTICE '✅ Step 5 Complete: Root hash notarization table created successfully';
END $$;

