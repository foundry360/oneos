-- ============================================================================
-- Step 6: Create Notarization Functions
-- ============================================================================
-- This step creates functions for generating and managing root hash notarizations.
-- Run this AFTER Step 5.
-- ============================================================================

-- Function: Generate root hash for a sequence range
CREATE OR REPLACE FUNCTION generate_root_hash(
    start_sequence BIGINT,
    end_sequence BIGINT,
    notarized_by_text TEXT DEFAULT 'system'
)
RETURNS TABLE(
    root_hash VARCHAR(64),
    entry_count INTEGER,
    sequence_start BIGINT,
    sequence_end BIGINT
) AS $$
DECLARE
    all_hashes TEXT[];
    merkle_root VARCHAR(64);
    entry_count_val INTEGER;
BEGIN
    -- Collect all entry hashes in the range
    SELECT ARRAY_AGG(entry_hash ORDER BY sequence_number) INTO all_hashes
    FROM ledger_entries
    WHERE sequence_number >= start_sequence 
      AND sequence_number <= end_sequence;
    
    -- Get count
    SELECT COUNT(*) INTO entry_count_val
    FROM ledger_entries
    WHERE sequence_number >= start_sequence 
      AND sequence_number <= end_sequence;
    
    -- If no entries, raise error
    IF entry_count_val = 0 THEN
        RAISE EXCEPTION 'No entries found in sequence range % to %', start_sequence, end_sequence;
    END IF;
    
    -- Build Merkle tree root (simplified: hash all hashes together)
    -- In production, you might want a proper Merkle tree implementation
    merkle_root := encode(
        digest(
            array_to_string(all_hashes, '') || 
            start_sequence::text || 
            end_sequence::text || 
            entry_count_val::text,
            'sha256'
        ),
        'hex'
    );
    
    -- Insert notarization record
    INSERT INTO ledger_root_hashes (
        root_hash,
        sequence_start,
        sequence_end,
        entry_count,
        notarized_by,
        previous_root_hash
    )
    SELECT 
        merkle_root,
        start_sequence,
        end_sequence,
        entry_count_val,
        notarized_by_text,
        (
            SELECT root_hash 
            FROM ledger_root_hashes 
            ORDER BY sequence_end DESC 
            LIMIT 1
        )
    RETURNING 
        ledger_root_hashes.root_hash,
        ledger_root_hashes.entry_count,
        ledger_root_hashes.sequence_start,
        ledger_root_hashes.sequence_end;
    
    -- Return the inserted values
    RETURN QUERY
    SELECT 
        ledger_root_hashes.root_hash,
        ledger_root_hashes.entry_count,
        ledger_root_hashes.sequence_start,
        ledger_root_hashes.sequence_end
    FROM ledger_root_hashes
    WHERE ledger_root_hashes.root_hash = merkle_root
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Periodic notarization (call this periodically)
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
    end_seq BIGINT;
BEGIN
    -- Get last notarized sequence number
    SELECT COALESCE(MAX(ledger_root_hashes.sequence_end), 0) INTO last_notarized_seq
    FROM ledger_root_hashes;
    
    -- Get current max sequence number
    SELECT COALESCE(MAX(sequence_number), 0) INTO current_max_seq
    FROM ledger_entries;
    
    -- Calculate range
    start_seq := last_notarized_seq + 1;
    end_seq := LEAST(start_seq + batch_size - 1, current_max_seq);
    
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
    FROM generate_root_hash(start_seq, end_seq, notarized_by_text) AS r
    JOIN ledger_root_hashes lrh ON lrh.root_hash = r.root_hash;
END;
$$ LANGUAGE plpgsql;

-- Verify functions were created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'generate_root_hash'
          AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Failed to create generate_root_hash function';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'notarize_ledger'
          AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Failed to create notarize_ledger function';
    END IF;
    
    RAISE NOTICE '✅ Step 6 Complete: Notarization functions created successfully';
END $$;

