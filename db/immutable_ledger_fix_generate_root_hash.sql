-- ============================================================================
-- Fix Generate Root Hash Function - Resolve Ambiguous Column Reference
-- ============================================================================
-- This fixes the ambiguous column reference error in generate_root_hash function
-- ============================================================================

-- Drop and recreate the function with fixed variable names
DROP FUNCTION IF EXISTS generate_root_hash(BIGINT, BIGINT, TEXT);

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
    inserted_root_hash VARCHAR(64);
    inserted_entry_count INTEGER;
    inserted_sequence_start BIGINT;
    inserted_sequence_end BIGINT;
BEGIN
    -- Collect all entry hashes in the range
    SELECT ARRAY_AGG(le.entry_hash ORDER BY le.sequence_number) INTO all_hashes
    FROM ledger_entries le
    WHERE le.sequence_number >= start_sequence 
      AND le.sequence_number <= end_sequence;
    
    -- Get count
    SELECT COUNT(*) INTO entry_count_val
    FROM ledger_entries le
    WHERE le.sequence_number >= start_sequence 
      AND le.sequence_number <= end_sequence;
    
    -- If no entries, raise error
    IF entry_count_val = 0 THEN
        RAISE EXCEPTION 'No entries found in sequence range % to %', start_sequence, end_sequence;
    END IF;
    
    -- Build Merkle tree root (simplified: hash all hashes together)
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
            SELECT lrh2.root_hash 
            FROM ledger_root_hashes lrh2
            ORDER BY lrh2.sequence_end DESC 
            LIMIT 1
        )
    RETURNING 
        ledger_root_hashes.root_hash,
        ledger_root_hashes.entry_count,
        ledger_root_hashes.sequence_start,
        ledger_root_hashes.sequence_end
    INTO 
        inserted_root_hash,
        inserted_entry_count,
        inserted_sequence_start,
        inserted_sequence_end;
    
    -- Return the values
    RETURN QUERY
    SELECT 
        inserted_root_hash,
        inserted_entry_count,
        inserted_sequence_start,
        inserted_sequence_end;
END;
$$ LANGUAGE plpgsql;

-- Verify function was recreated
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'generate_root_hash'
          AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Failed to recreate generate_root_hash function';
    END IF;
    
    RAISE NOTICE '✅ generate_root_hash function fixed successfully';
END $$;

