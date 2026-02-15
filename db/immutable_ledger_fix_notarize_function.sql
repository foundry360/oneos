-- ============================================================================
-- Fix Notarize Ledger Function - Resolve Ambiguous Column Reference
-- ============================================================================
-- This fixes the ambiguous column reference error in notarize_ledger function
-- ============================================================================

-- Drop and recreate the function with fixed column references
DROP FUNCTION IF EXISTS notarize_ledger(INTEGER, TEXT);

CREATE OR REPLACE FUNCTION notarize_ledger(
    batch_size INTEGER DEFAULT 1000,
    notarized_by_text TEXT DEFAULT 'system'
)
RETURNS TABLE(
    root_hash VARCHAR(64),
    entry_count INTEGER,
    sequence_start BIGINT,
    sequence_end BIGINT,
    notarized_at TIMESTAMP
) AS $$
DECLARE
    last_notarized_seq BIGINT;
    current_max_seq BIGINT;
    start_seq BIGINT;
    end_seq_val BIGINT;  -- Renamed to avoid conflict
BEGIN
    -- Get last notarized sequence number (fully qualify table column)
    SELECT COALESCE(MAX(lrh.sequence_end), 0) INTO last_notarized_seq
    FROM ledger_root_hashes lrh;
    
    -- Get current max sequence number
    SELECT COALESCE(MAX(le.sequence_number), 0) INTO current_max_seq
    FROM ledger_entries le;
    
    -- Calculate range
    start_seq := last_notarized_seq + 1;
    end_seq_val := LEAST(start_seq + batch_size - 1, current_max_seq);
    
    -- If no new entries, return
    IF start_seq > current_max_seq THEN
        RAISE NOTICE 'No new entries to notarize';
        RETURN;
    END IF;
    
    -- Generate root hash for the range
    RETURN QUERY
    SELECT 
        r.root_hash,
        r.entry_count,
        r.sequence_start,
        r.sequence_end,
        lrh.notarized_at
    FROM generate_root_hash(start_seq, end_seq_val, notarized_by_text) AS r
    JOIN ledger_root_hashes lrh ON lrh.root_hash = r.root_hash;
END;
$$ LANGUAGE plpgsql;

-- Verify function was recreated
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'notarize_ledger'
          AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Failed to recreate notarize_ledger function';
    END IF;
    
    RAISE NOTICE '✅ notarize_ledger function fixed successfully';
END $$;

