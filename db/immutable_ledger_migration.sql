-- ============================================================================
-- Immutable Ledger Enhancement Migration
-- ============================================================================
-- This migration adds:
-- 1. Hard database append-only enforcement (triggers prevent UPDATE/DELETE)
-- 2. Hash chaining between rows (each entry links to previous)
-- 3. Periodic root hash notarization (checkpoints)
-- 4. Verification function (chain integrity checking)
-- ============================================================================

-- Enable pgcrypto extension for hash functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. ADD COLUMNS FOR HASH CHAINING
-- ============================================================================

-- Add sequence number for ordering (critical for hash chain)
ALTER TABLE ledger_entries 
  ADD COLUMN IF NOT EXISTS sequence_number BIGSERIAL;

-- Add previous entry hash for chaining
ALTER TABLE ledger_entries 
  ADD COLUMN IF NOT EXISTS previous_entry_hash VARCHAR(64);

-- Add index on sequence_number for fast ordering
CREATE INDEX IF NOT EXISTS idx_ledger_entries_sequence ON ledger_entries(sequence_number);

-- Add index on previous_entry_hash for chain traversal
CREATE INDEX IF NOT EXISTS idx_ledger_entries_previous_hash ON ledger_entries(previous_entry_hash);

-- ============================================================================
-- 2. CREATE ROOT HASH NOTARIZATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ledger_root_hashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_hash VARCHAR(64) NOT NULL UNIQUE,
    sequence_start BIGINT NOT NULL,
    sequence_end BIGINT NOT NULL,
    entry_count INTEGER NOT NULL,
    notarized_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notarized_by TEXT, -- Could be system, external service, or user
    metadata JSONB DEFAULT '{}',
    previous_root_hash VARCHAR(64), -- Links to previous notarization
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_root_hashes_sequence ON ledger_root_hashes(sequence_end);
CREATE INDEX IF NOT EXISTS idx_ledger_root_hashes_notarized_at ON ledger_root_hashes(notarized_at);
CREATE INDEX IF NOT EXISTS idx_ledger_root_hashes_previous ON ledger_root_hashes(previous_root_hash);

COMMENT ON TABLE ledger_root_hashes IS 'Periodic root hash notarizations for ledger integrity verification';
COMMENT ON COLUMN ledger_root_hashes.root_hash IS 'Merkle root hash of all entries in the range';
COMMENT ON COLUMN ledger_root_hashes.sequence_start IS 'First sequence number in this notarization';
COMMENT ON COLUMN ledger_root_hashes.sequence_end IS 'Last sequence number in this notarization';
COMMENT ON COLUMN ledger_root_hashes.previous_root_hash IS 'Hash of previous notarization for chaining';

-- ============================================================================
-- 3. FUNCTION: Compute hash chain for new entry
-- ============================================================================

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
    
    -- Set previous_entry_hash
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

-- ============================================================================
-- 4. TRIGGER: Auto-compute hash chain on INSERT
-- ============================================================================

DROP TRIGGER IF EXISTS compute_ledger_hash_trigger ON ledger_entries;
CREATE TRIGGER compute_ledger_hash_trigger
    BEFORE INSERT ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION compute_ledger_entry_hash();

-- ============================================================================
-- 5. TRIGGERS: Prevent UPDATE and DELETE (Append-Only Enforcement)
-- ============================================================================

-- Function to prevent updates
CREATE OR REPLACE FUNCTION prevent_ledger_updates()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable and cannot be updated. Entry ID: %', OLD.id;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent deletes
CREATE OR REPLACE FUNCTION prevent_ledger_deletes()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable and cannot be deleted. Entry ID: %', OLD.id;
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

-- ============================================================================
-- 6. FUNCTION: Generate root hash for a sequence range
-- ============================================================================

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
    entry_rec RECORD;
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
    
    -- If no entries, return NULL
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
        ledger_root_hashes.sequence_end
    INTO 
        root_hash,
        entry_count,
        sequence_start,
        sequence_end;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCTION: Periodic notarization (call this periodically)
-- ============================================================================

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
    SELECT COALESCE(MAX(sequence_end), 0) INTO last_notarized_seq
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
        r.notarized_at
    FROM generate_root_hash(start_seq, end_seq, notarized_by_text) r
    JOIN ledger_root_hashes lrh ON lrh.root_hash = r.root_hash;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FUNCTION: Verify ledger integrity
-- ============================================================================

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

-- ============================================================================
-- 9. FUNCTION: Verify notarization integrity
-- ============================================================================

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

-- ============================================================================
-- 10. BACKFILL: Update existing entries with hash chains
-- ============================================================================

-- This will backfill sequence numbers and hash chains for existing entries
DO $$
DECLARE
    entry_rec RECORD;
    prev_hash VARCHAR(64) := '';
    seq_num BIGINT := 0;
    entry_data TEXT;
    computed_hash VARCHAR(64);
BEGIN
    -- Only run if there are existing entries without sequence numbers
    IF EXISTS (
        SELECT 1 FROM ledger_entries 
        WHERE sequence_number IS NULL 
        LIMIT 1
    ) THEN
        -- Update each entry in order
        FOR entry_rec IN 
            SELECT * FROM ledger_entries
            ORDER BY timestamp, id
        LOOP
            seq_num := seq_num + 1;
            
            -- Build entry data
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
            
            -- Compute hash
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
        END LOOP;
        
        RAISE NOTICE 'Backfilled % ledger entries with hash chains', seq_num;
    END IF;
END $$;

-- ============================================================================
-- 11. COMMENTS
-- ============================================================================

COMMENT ON COLUMN ledger_entries.sequence_number IS 'Sequential number for ordering entries in the chain';
COMMENT ON COLUMN ledger_entries.previous_entry_hash IS 'Hash of previous entry for chain integrity';
COMMENT ON COLUMN ledger_entries.entry_hash IS 'SHA-256 hash of this entry including previous_entry_hash for chain verification';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the verification function
DO $$
DECLARE
    result RECORD;
BEGIN
    SELECT * INTO result FROM verify_ledger_integrity();
    IF result.is_valid THEN
        RAISE NOTICE '✅ Ledger integrity verified: % entries checked', result.checked_entries;
    ELSE
        RAISE WARNING '⚠️ Ledger integrity check failed: %', result.error_message;
    END IF;
END $$;

