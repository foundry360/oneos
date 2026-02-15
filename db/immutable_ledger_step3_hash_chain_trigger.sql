-- ============================================================================
-- Step 3: Create Hash Chain Trigger
-- ============================================================================
-- This step creates a trigger that automatically computes hash chains
-- for new entries. Run this AFTER Step 2.
-- ============================================================================

-- Function to compute hash chain for new entry
CREATE OR REPLACE FUNCTION compute_ledger_entry_hash()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash VARCHAR(64);
    entry_data TEXT;
    computed_hash VARCHAR(64);
BEGIN
    -- Get previous entry's hash (if exists)
    SELECT entry_hash INTO prev_hash
    FROM ledger_entries
    WHERE sequence_number = NEW.sequence_number - 1
    LIMIT 1;
    
    -- Set previous_entry_hash (empty string for first entry)
    NEW.previous_entry_hash := COALESCE(prev_hash, '');
    
    -- Build entry data for hashing (exclude entry_hash itself)
    entry_data := json_build_object(
        'id', NEW.id::text,
        'profile_id', COALESCE(NEW.profile_id::text, ''),
        'action', NEW.action,
        'version_hash', NEW.version_hash,
        'previous_entry_hash', NEW.previous_entry_hash,
        'sequence_number', NEW.sequence_number,
        'timestamp', NEW.timestamp::text,
        'metadata', COALESCE(NEW.metadata::text, '{}')
    )::text;
    
    -- Compute SHA-256 hash
    computed_hash := encode(digest(entry_data, 'sha256'), 'hex');
    
    -- Set entry_hash
    NEW.entry_hash := computed_hash;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS compute_ledger_hash_trigger ON ledger_entries;
CREATE TRIGGER compute_ledger_hash_trigger
    BEFORE INSERT ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION compute_ledger_entry_hash();

-- Verify trigger was created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'compute_ledger_hash_trigger'
          AND event_object_table = 'ledger_entries'
    ) THEN
        RAISE EXCEPTION 'Failed to create hash chain trigger';
    END IF;
    
    RAISE NOTICE '✅ Step 3 Complete: Hash chain trigger created successfully';
END $$;

-- Test the trigger (optional - uncomment to test)
/*
DO $$
DECLARE
    test_id UUID;
    test_entry RECORD;
BEGIN
    -- Insert a test entry
    INSERT INTO ledger_entries (profile_id, action, version_hash, metadata)
    VALUES (
        NULL,
        'TEST_TRIGGER',
        'test_hash_' || md5(random()::text),
        '{"test": true}'::jsonb
    )
    RETURNING id INTO test_id;
    
    -- Check the entry
    SELECT * INTO test_entry
    FROM ledger_entries
    WHERE id = test_id;
    
    IF test_entry.sequence_number IS NULL THEN
        RAISE EXCEPTION 'Trigger failed: sequence_number not set';
    END IF;
    
    IF test_entry.entry_hash IS NULL THEN
        RAISE EXCEPTION 'Trigger failed: entry_hash not computed';
    END IF;
    
    RAISE NOTICE '✅ Trigger test passed: Entry created with sequence % and hash %', 
        test_entry.sequence_number, 
        LEFT(test_entry.entry_hash, 16) || '...';
    
    -- Clean up test entry
    -- Note: We can't delete due to immutability, but this is just a test
    -- In production, you'd skip this test or use a test database
END $$;
*/

