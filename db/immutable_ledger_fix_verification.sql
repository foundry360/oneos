-- ============================================================================
-- Fix Verification Functions - Compute Hash Without Inserting
-- ============================================================================
-- This fixes verify_notarization_integrity to compute hashes without inserting
-- ============================================================================

-- Create a helper function that computes root hash WITHOUT inserting
CREATE OR REPLACE FUNCTION compute_root_hash_only(
    start_sequence BIGINT,
    end_sequence BIGINT
)
RETURNS VARCHAR(64) AS $$
DECLARE
    all_hashes TEXT[];
    merkle_root VARCHAR(64);
    entry_count_val INTEGER;
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
    
    -- If no entries, return NULL
    IF entry_count_val = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Build Merkle tree root (same logic as generate_root_hash but no insert)
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
    
    RETURN merkle_root;
END;
$$ LANGUAGE plpgsql;

-- Fix verify_notarization_integrity to use compute_root_hash_only
CREATE OR REPLACE FUNCTION verify_notarization_integrity()
RETURNS TABLE(
    is_valid BOOLEAN,
    checked_notarizations INTEGER,
    broken_at UUID,
    error_message TEXT
) AS $$
DECLARE
    notarization_rec RECORD;
    computed_root VARCHAR(64);
    checked_count INTEGER := 0;
    broken_id UUID;
    error_msg TEXT;
BEGIN
    -- Check each notarization
    FOR notarization_rec IN 
        SELECT * FROM ledger_root_hashes
        ORDER BY sequence_end
    LOOP
        checked_count := checked_count + 1;
        
        -- Recompute root hash for the range (without inserting)
        computed_root := compute_root_hash_only(
            notarization_rec.sequence_start,
            notarization_rec.sequence_end
        );
        
        -- If computed_root is NULL, there are no entries (shouldn't happen but handle it)
        IF computed_root IS NULL THEN
            broken_id := notarization_rec.id;
            error_msg := format(
                'No entries found for notarization range %s to %s',
                notarization_rec.sequence_start,
                notarization_rec.sequence_end
            );
            RETURN QUERY SELECT FALSE, checked_count, broken_id, error_msg;
            RETURN;
        END IF;
        
        -- Verify root hash matches
        IF computed_root != notarization_rec.root_hash THEN
            broken_id := notarization_rec.id;
            error_msg := format(
                'Notarization root hash mismatch at ID %s. Expected: %s, Found: %s',
                notarization_rec.id,
                computed_root,
                notarization_rec.root_hash
            );
            RETURN QUERY SELECT FALSE, checked_count, broken_id, error_msg;
            RETURN;
        END IF;
    END LOOP;
    
    -- All checks passed
    RETURN QUERY SELECT TRUE, checked_count, NULL::UUID, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Verify functions were updated
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'compute_root_hash_only'
          AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Failed to create compute_root_hash_only function';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'verify_notarization_integrity'
          AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Failed to update verify_notarization_integrity function';
    END IF;
    
    RAISE NOTICE '✅ Verification functions fixed successfully';
END $$;

