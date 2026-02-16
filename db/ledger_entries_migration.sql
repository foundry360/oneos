-- Ledger Entries Table Migration
-- Simple table to store ledger entries for governance profile changes
-- In production, this would be replaced with a distributed ledger or blockchain

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES governance_profiles(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    version_hash VARCHAR(64) NOT NULL,
    entry_hash VARCHAR(64) NOT NULL UNIQUE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_entries_profile_id ON ledger_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_timestamp ON ledger_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_version_hash ON ledger_entries(version_hash);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_hash ON ledger_entries(entry_hash);

COMMENT ON TABLE ledger_entries IS 'Ledger entries for governance profile changes (simulator for production distributed ledger)';
COMMENT ON COLUMN ledger_entries.version_hash IS 'SHA-256 hash of the profile content at this version';
COMMENT ON COLUMN ledger_entries.entry_hash IS 'SHA-256 hash of this ledger entry for integrity verification';








