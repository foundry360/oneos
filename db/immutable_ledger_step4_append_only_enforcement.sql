-- ============================================================================
-- Step 4: Append-Only Enforcement (Prevent UPDATE/DELETE)
-- ============================================================================
-- This step creates triggers that prevent UPDATE and DELETE operations,
-- making the ledger truly append-only. Run this AFTER Step 3.
-- ============================================================================

-- Function to prevent updates
CREATE OR REPLACE FUNCTION prevent_ledger_updates()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable and cannot be updated. Entry ID: %, Sequence: %', 
        OLD.id, OLD.sequence_number;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent deletes
CREATE OR REPLACE FUNCTION prevent_ledger_deletes()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable and cannot be deleted. Entry ID: %, Sequence: %', 
        OLD.id, OLD.sequence_number;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS prevent_ledger_entry_updates ON ledger_entries;
CREATE TRIGGER prevent_ledger_entry_updates
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_updates();

DROP TRIGGER IF EXISTS prevent_ledger_entry_deletes ON ledger_entries;
CREATE TRIGGER prevent_ledger_entry_deletes
    BEFORE DELETE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_deletes();

-- Verify triggers were created
DO $$
DECLARE
    update_trigger_exists BOOLEAN;
    delete_trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'prevent_ledger_entry_updates'
          AND event_object_table = 'ledger_entries'
    ) INTO update_trigger_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'prevent_ledger_entry_deletes'
          AND event_object_table = 'ledger_entries'
    ) INTO delete_trigger_exists;
    
    IF NOT update_trigger_exists THEN
        RAISE EXCEPTION 'Failed to create UPDATE prevention trigger';
    END IF;
    
    IF NOT delete_trigger_exists THEN
        RAISE EXCEPTION 'Failed to create DELETE prevention trigger';
    END IF;
    
    RAISE NOTICE '✅ Step 4 Complete: Append-only enforcement triggers created successfully';
    RAISE NOTICE '⚠️  WARNING: UPDATE and DELETE operations are now blocked on ledger_entries';
END $$;

-- Test the enforcement (optional - uncomment to test)
/*
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Get an existing entry ID
    SELECT id INTO test_id FROM ledger_entries LIMIT 1;
    
    IF test_id IS NULL THEN
        RAISE NOTICE 'No entries to test with';
        RETURN;
    END IF;
    
    -- Try to update (should fail)
    BEGIN
        UPDATE ledger_entries SET action = 'TEST_UPDATE' WHERE id = test_id;
        RAISE EXCEPTION 'UPDATE prevention failed - update was allowed!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%immutable%' THEN
                RAISE NOTICE '✅ UPDATE prevention test passed';
            ELSE
                RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
            END IF;
    END;
    
    -- Try to delete (should fail)
    BEGIN
        DELETE FROM ledger_entries WHERE id = test_id;
        RAISE EXCEPTION 'DELETE prevention failed - delete was allowed!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%immutable%' THEN
                RAISE NOTICE '✅ DELETE prevention test passed';
            ELSE
                RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
            END IF;
    END;
END $$;
*/

