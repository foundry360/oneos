-- ============================================================================
-- Step 7: Create Verification Functions
-- ============================================================================
-- This step creates functions to verify ledger integrity and notarizations.
-- Run this AFTER Step 6. This is the final step!
-- ============================================================================

-- Function: Verify ledger integrity
CREATE OR REPLACE FUNCTION verify_ledger_integrity(
    start_sequence BIGINT DEFAULT NULL,
    end_sequence BIGINT DEFAULT NULL
)
RETURNS TABLE(
    is_valid BOOLEAN,
    checked_entries INTEGER,
    broken_chain_at BIGINT,
    error_message TEXT
) AS $$
DECLARE
    entry_rec RECORD;
    prev_hash VARCHAR(64);
    expected_hash VARCHAR(64);
    checked_count INTEGER := 0;
    broken_seq BIGINT;
    error_msg TEXT;
    start_seq BIGINT;
    end_seq BIGINT;
BEGIN
    -- Determine range
    IF start_sequence IS NULL THEN
        SELECT MIN(sequence_number) INTO start_seq FROM ledger_entries;
    ELSE
        start_seq := start_sequence;
    END IF;
    
    IF end_sequence IS NULL THEN
        SELECT MAX(sequence_number) INTO end_seq FROM ledger_entries;
    ELSE
        end_seq := end_sequence;
    END IF;
    
    -- If no entries, return valid
    IF start_seq IS NULL OR end_seq IS NULL THEN
        RETURN QUERY SELECT TRUE, 0, NULL::BIGINT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Initialize previous hash for first entry
    prev_hash := '';
    
    -- Check each entry in sequence
    FOR entry_rec IN 
        SELECT * FROM ledger_entries
        WHERE sequence_number >= start_seq 
          AND sequence_number <= end_seq
        ORDER BY sequence_number
    LOOP
        checked_count := checked_count + 1;
        
        -- Verify previous_entry_hash matches
        IF entry_rec.previous_entry_hash != prev_hash THEN
            broken_seq := entry_rec.sequence_number;
            error_msg := format(
                'Hash chain broken at sequence %s. Expected previous_hash: %s, Found: %s',
                entry_rec.sequence_number,
                prev_hash,
                entry_rec.previous_entry_hash
            );
            RETURN QUERY SELECT FALSE, checked_count, broken_seq, error_msg;
            RETURN;
        END IF;
        
        -- Recompute hash to verify entry_hash
        expected_hash := encode(
            digest(
                json_build_object(
                    'id', entry_rec.id::text,
                    'profile_id', COALESCE(entry_rec.profile_id::text, ''),
                    'action', entry_rec.action,
                    'version_hash', entry_rec.version_hash,
                    'previous_entry_hash', entry_rec.previous_entry_hash,
                    'sequence_number', entry_rec.sequence_number,
                    'timestamp', entry_rec.timestamp::text,
                    'metadata', COALESCE(entry_rec.metadata::text, '{}')
                )::text,
                'sha256'
            ),
            'hex'
        );
        
        -- Verify entry_hash
        IF entry_rec.entry_hash != expected_hash THEN
            broken_seq := entry_rec.sequence_number;
            error_msg := format(
                'Entry hash mismatch at sequence %s. Expected: %s, Found: %s',
                entry_rec.sequence_number,
                expected_hash,
                entry_rec.entry_hash
            );
            RETURN QUERY SELECT FALSE, checked_count, broken_seq, error_msg;
            RETURN;
        END IF;
        
        -- Update previous hash for next iteration
        prev_hash := entry_rec.entry_hash;
    END LOOP;
    
    -- All checks passed
    RETURN QUERY SELECT TRUE, checked_count, NULL::BIGINT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function: Verify notarization integrity
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
        
        -- Recompute root hash for the range
        SELECT root_hash INTO computed_root
        FROM generate_root_hash(
            notarization_rec.sequence_start,
            notarization_rec.sequence_end,
            'verification'
        );
        
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

-- Verify functions were created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'verify_ledger_integrity'
          AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Failed to create verify_ledger_integrity function';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'verify_notarization_integrity'
          AND routine_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Failed to create verify_notarization_integrity function';
    END IF;
    
    RAISE NOTICE '✅ Step 7 Complete: Verification functions created successfully';
END $$;

-- Final verification test
DO $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM verify_ledger_integrity();
    IF result.is_valid THEN
        RAISE NOTICE '✅ IMMUTABLE LEDGER SETUP COMPLETE!';
        RAISE NOTICE '   Verified % entries with hash chain integrity', result.checked_entries;
    ELSE
        RAISE WARNING '⚠️  Ledger integrity check failed: %', result.error_message;
        RAISE WARNING '   Broken chain at sequence: %', result.broken_chain_at;
    END IF;
END $$;

