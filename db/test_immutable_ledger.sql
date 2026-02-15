-- ============================================================================
-- Test Immutable Ledger - Complete Verification
-- ============================================================================
-- Run this to test all aspects of the immutable ledger
-- ============================================================================

-- 1. Verify ledger integrity
SELECT 
    'Ledger Integrity Check' as test_name,
    is_valid,
    checked_entries,
    COALESCE(broken_chain_at::text, 'None') as broken_at,
    COALESCE(error_message, 'All good!') as status
FROM verify_ledger_integrity();

-- 2. Check current ledger status
SELECT 
    'Ledger Status' as test_name,
    COUNT(*) as total_entries,
    MIN(sequence_number) as first_sequence,
    MAX(sequence_number) as last_sequence,
    MIN(timestamp) as oldest_entry,
    MAX(timestamp) as newest_entry
FROM ledger_entries;

-- 3. Check chain structure (last 5 entries)
SELECT 
    'Chain Structure (Last 5)' as test_name,
    sequence_number,
    action,
    LEFT(previous_entry_hash, 16) || '...' as prev_hash_preview,
    LEFT(entry_hash, 16) || '...' as hash_preview,
    timestamp
FROM ledger_entries
ORDER BY sequence_number DESC
LIMIT 5;

-- 4. Test notarization (if entries exist)
DO $$
DECLARE
    max_seq BIGINT;
    result RECORD;
BEGIN
    SELECT MAX(sequence_number) INTO max_seq FROM ledger_entries;
    
    IF max_seq IS NULL OR max_seq = 0 THEN
        RAISE NOTICE 'No entries to notarize. Insert some entries first.';
    ELSE
        -- Create notarization
        SELECT * INTO result 
        FROM notarize_ledger(1000, 'test-notarization');
        
        IF result.root_hash IS NOT NULL THEN
            RAISE NOTICE '✅ Notarization created successfully!';
            RAISE NOTICE '   Root Hash: %', LEFT(result.root_hash, 32) || '...';
            RAISE NOTICE '   Entries: % (sequences % to %)', 
                result.entry_count, 
                result.sequence_start, 
                result.sequence_end;
        ELSE
            RAISE NOTICE 'No new entries to notarize';
        END IF;
    END IF;
END $$;

-- 5. Check notarizations
SELECT 
    'Notarizations' as test_name,
    COUNT(*) as total_notarizations,
    MAX(sequence_end) as last_notarized_sequence,
    MAX(notarized_at) as last_notarization_time
FROM ledger_root_hashes;

-- 6. Verify notarization integrity (if any exist)
SELECT 
    'Notarization Integrity' as test_name,
    is_valid,
    checked_notarizations,
    COALESCE(broken_at::text, 'None') as broken_at,
    COALESCE(error_message, 'All good!') as status
FROM verify_notarization_integrity();

-- 7. Test immutability (these should fail)
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Get an entry ID
    SELECT id INTO test_id FROM ledger_entries LIMIT 1;
    
    IF test_id IS NULL THEN
        RAISE NOTICE 'No entries to test immutability';
        RETURN;
    END IF;
    
    -- Try UPDATE (should fail)
    BEGIN
        UPDATE ledger_entries SET action = 'TEST_UPDATE' WHERE id = test_id;
        RAISE WARNING '❌ UPDATE prevention FAILED - update was allowed!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%immutable%' THEN
                RAISE NOTICE '✅ UPDATE prevention working correctly';
            ELSE
                RAISE WARNING 'Unexpected error: %', SQLERRM;
            END IF;
    END;
    
    -- Try DELETE (should fail)
    BEGIN
        DELETE FROM ledger_entries WHERE id = test_id;
        RAISE WARNING '❌ DELETE prevention FAILED - delete was allowed!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%immutable%' THEN
                RAISE NOTICE '✅ DELETE prevention working correctly';
            ELSE
                RAISE WARNING 'Unexpected error: %', SQLERRM;
            END IF;
    END;
END $$;

-- Summary
SELECT 
    '✅ IMMUTABLE LEDGER TEST COMPLETE' as summary,
    'Check the notices above for detailed results' as next_steps;

