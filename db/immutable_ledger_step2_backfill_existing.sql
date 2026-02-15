-- ============================================================================
-- Step 2: Backfill Existing Entries with Hash Chains
-- ============================================================================
-- This step backfills sequence numbers and hash chains for existing entries.
-- Run this AFTER Step 1 and BEFORE Step 3.
-- ============================================================================

-- Backfill sequence numbers and hash chains for existing entries
DO $$
DECLARE
    entry_rec RECORD;
    prev_hash VARCHAR(64) := '';
    seq_num BIGINT := 0;
    entry_data TEXT;
    computed_hash VARCHAR(64);
    total_entries INTEGER;
BEGIN
    -- Check if there are entries without sequence numbers
    SELECT COUNT(*) INTO total_entries
    FROM ledger_entries 
    WHERE sequence_number IS NULL;
    
    IF total_entries = 0 THEN
        RAISE NOTICE 'No entries to backfill. All entries already have sequence numbers.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Backfilling % entries with hash chains...', total_entries;
    
    -- Update each entry in order (by timestamp, then id)
    FOR entry_rec IN 
        SELECT * FROM ledger_entries
        WHERE sequence_number IS NULL
        ORDER BY timestamp, id
    LOOP
        seq_num := seq_num + 1;
        
        -- Build entry data for hashing
        entry_data := json_build_object(
            'id', entry_rec.id::text,
            'profile_id', COALESCE(entry_rec.profile_id::text, ''),
            'action', entry_rec.action,
            'version_hash', entry_rec.version_hash,
            'previous_entry_hash', prev_hash,
            'sequence_number', seq_num,
            'timestamp', entry_rec.timestamp::text,
            'metadata', COALESCE(entry_rec.metadata::text, '{}')
        )::text;
        
        -- Compute SHA-256 hash
        computed_hash := encode(digest(entry_data, 'sha256'), 'hex');
        
        -- Update entry
        UPDATE ledger_entries
        SET 
            sequence_number = seq_num,
            previous_entry_hash = prev_hash,
            entry_hash = computed_hash
        WHERE id = entry_rec.id;
        
        -- Update previous hash for next iteration
        prev_hash := computed_hash;
        
        -- Progress indicator every 100 entries
        IF seq_num % 100 = 0 THEN
            RAISE NOTICE 'Processed % entries...', seq_num;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Step 2 Complete: Backfilled % ledger entries with hash chains', seq_num;
END $$;

-- Verify backfill
DO $$
DECLARE
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM ledger_entries
    WHERE sequence_number IS NULL;
    
    SELECT COUNT(*) INTO total_count
    FROM ledger_entries;
    
    IF null_count > 0 THEN
        RAISE WARNING '⚠️  % entries still missing sequence numbers', null_count;
    ELSE
        RAISE NOTICE '✅ All % entries have sequence numbers', total_count;
    END IF;
END $$;

