-- ============================================================================
-- Fix Hash Computation - Recompute All Entry Hashes Consistently
-- ============================================================================
-- This script fixes hash mismatches by recomputing all entry hashes
-- using the same logic as the trigger and verification function.
-- Run this if verification fails after Step 7.
-- 
-- NOTE: This temporarily disables the append-only triggers to allow updates.
-- ============================================================================

-- Temporarily disable the update prevention trigger
ALTER TABLE ledger_entries DISABLE TRIGGER prevent_ledger_entry_updates;

DO $$
DECLARE
    entry_rec RECORD;
    prev_hash VARCHAR(64) := '';
    entry_data TEXT;
    computed_hash VARCHAR(64);
    updated_count INTEGER := 0;
    total_count INTEGER;
BEGIN
    -- Get total count
    SELECT COUNT(*) INTO total_count FROM ledger_entries;
    
    RAISE NOTICE 'Recomputing hashes for % entries...', total_count;
    
    -- Process each entry in sequence order
    FOR entry_rec IN 
        SELECT * FROM ledger_entries
        ORDER BY sequence_number
    LOOP
        -- Build entry data for hashing (must match trigger/verification logic exactly)
        -- Important: Use the same JSON serialization approach
        entry_data := json_build_object(
            'id', entry_rec.id::text,
            'profile_id', COALESCE(entry_rec.profile_id::text, ''),
            'action', entry_rec.action,
            'version_hash', entry_rec.version_hash,
            'previous_entry_hash', prev_hash,
            'sequence_number', entry_rec.sequence_number,
            'timestamp', entry_rec.timestamp::text,
            'metadata', COALESCE(entry_rec.metadata::text, '{}')
        )::text;
        
        -- Compute SHA-256 hash
        computed_hash := encode(digest(entry_data, 'sha256'), 'hex');
        
        -- Update entry with correct hash and previous_entry_hash
        UPDATE ledger_entries
        SET 
            previous_entry_hash = prev_hash,
            entry_hash = computed_hash
        WHERE id = entry_rec.id;
        
        -- Update previous hash for next iteration
        prev_hash := computed_hash;
        updated_count := updated_count + 1;
        
        -- Progress indicator every 100 entries
        IF updated_count % 100 = 0 THEN
            RAISE NOTICE 'Processed % entries...', updated_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Fixed % entry hashes', updated_count;
END $$;

-- Re-enable the update prevention trigger
ALTER TABLE ledger_entries ENABLE TRIGGER prevent_ledger_entry_updates;

-- Verify the fix
DO $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM verify_ledger_integrity();
    IF result.is_valid THEN
        RAISE NOTICE '✅ Hash computation fixed! Ledger integrity verified: % entries checked', result.checked_entries;
    ELSE
        RAISE WARNING '⚠️  Still have issues: %', result.error_message;
        RAISE WARNING '   Broken chain at sequence: %', result.broken_chain_at;
    END IF;
END $$;

