# Implementation Steps for Immutable Ledger

This guide outlines the steps to implement the immutable ledger enhancement for the `ledger_entries` table.

## Overview

The immutable ledger migration adds:
1. **Hard database append-only enforcement** - Triggers prevent UPDATE/DELETE operations
2. **Hash chaining between rows** - Each entry cryptographically links to the previous entry
3. **Periodic root hash notarization** - Creates checkpoints for integrity verification
4. **Verification functions** - Tools to verify chain integrity

## Prerequisites

- PostgreSQL database with `pgcrypto` extension available
- Existing `ledger_entries` table (from `ledger_entries_migration.sql` and `update_ledger_entries_for_phase2.sql`)
- Database admin access to run migrations

## Implementation Steps

### Step 1: Backup Database

**⚠️ CRITICAL: Always backup before running migrations**

```bash
# Using pg_dump
pg_dump -h localhost -U your_user -d your_database > backup_before_immutable_ledger.sql

# Or with connection string
pg_dump "postgresql://user:password@host:port/database" > backup_before_immutable_ledger.sql

# Or using Docker
docker-compose exec postgres pg_dump -U postgres your_database > backup_before_immutable_ledger.sql
```

### Step 2: Review Migration Script

Review the migration script to understand what it does:
- File: `db/immutable_ledger_migration.sql`
- Read through all sections to understand the changes

### Step 3: Run the Migration

#### Option A: Using psql Command Line

```bash
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_migration.sql
```

#### Option B: Using Docker (if using docker-compose)

```bash
# Copy migration file into container first
docker cp db/immutable_ledger_migration.sql <container_name>:/tmp/

# Then run it
docker-compose exec postgres psql -U postgres -d your_database -f /tmp/immutable_ledger_migration.sql

# Or run directly from host
docker-compose exec -T postgres psql -U postgres -d your_database < db/immutable_ledger_migration.sql
```

#### Option C: Using psql with connection string

```bash
# Using connection string
psql "postgresql://user:password@host:port/database" -f db/immutable_ledger_migration.sql

# Or set environment variables
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=your_database
export PGUSER=your_user
psql -f db/immutable_ledger_migration.sql
```

#### Option D: Using a Database GUI Tool

If you're using pgAdmin, DBeaver, or another GUI tool:
1. Open the SQL editor
2. Load/open `db/immutable_ledger_migration.sql`
3. Execute the script
4. Review any warnings or errors

### Step 4: Verify Migration Success

Run these verification queries:

```sql
-- Check that columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ledger_entries' 
  AND column_name IN ('sequence_number', 'previous_entry_hash');

-- Check that triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'ledger_entries';

-- Check that functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'verify_ledger_integrity',
    'verify_notarization_integrity',
    'notarize_ledger',
    'generate_root_hash'
  );

-- Verify ledger integrity
SELECT * FROM verify_ledger_integrity();
```

### Step 5: Test Append-Only Enforcement

Test that UPDATE and DELETE are blocked:

```sql
-- This should FAIL with an error
UPDATE ledger_entries SET action = 'TEST' WHERE id = (SELECT id FROM ledger_entries LIMIT 1);

-- This should FAIL with an error
DELETE FROM ledger_entries WHERE id = (SELECT id FROM ledger_entries LIMIT 1);
```

### Step 6: Test Hash Chaining

Insert a test entry and verify the chain:

```sql
-- Insert a test entry (if you have a test profile_id)
INSERT INTO ledger_entries (profile_id, action, version_hash, metadata)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'TEST_ACTION',
    'test_hash_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    '{"test": true}'::jsonb
);

-- Verify the chain
SELECT 
    sequence_number,
    previous_entry_hash,
    entry_hash,
    action
FROM ledger_entries
ORDER BY sequence_number DESC
LIMIT 5;
```

### Step 7: Create Initial Notarization

Create the first root hash notarization:

```sql
-- Notarize existing entries (adjust batch_size as needed)
SELECT * FROM notarize_ledger(1000, 'initial-setup');
```

### Step 8: Set Up Periodic Notarization

#### Option A: Database Cron (pg_cron extension)

If you have `pg_cron` installed:

```sql
-- Schedule daily notarization at 2 AM
SELECT cron.schedule(
    'notarize-ledger-daily',
    '0 2 * * *',
    $$SELECT * FROM notarize_ledger(1000, 'scheduled-job')$$
);
```

#### Option B: Application-Level Scheduler

Create a scheduled job in your backend (Node.js example):

```javascript
// In backend/src/services/scheduler.js or similar
const cron = require('node-cron');
const db = require('../config/database');

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    const result = await db.query('SELECT * FROM notarize_ledger(1000, $1)', ['scheduled-job']);
    logger.info('Ledger notarization completed', { result: result.rows });
  } catch (error) {
    logger.error('Ledger notarization failed', { error: error.message });
  }
});
```

#### Option C: External Cron Job

Add to your system crontab:

```bash
# Run daily at 2 AM
0 2 * * * psql -h localhost -U your_user -d your_database -c "SELECT * FROM notarize_ledger(1000, 'cron-job');"
```

### Step 9: Update Application Code

The ledger service will automatically work with the new structure, but you may want to:

1. **Update ledgerService.js** to handle sequence numbers (optional - they're auto-generated)
2. **Add verification endpoints** to your API:

```javascript
// In backend/src/routes/ledger.js or similar
router.get('/verify', authenticate, async (req, res) => {
  try {
    const { start_sequence, end_sequence } = req.query;
    const result = await db.query(
      'SELECT * FROM verify_ledger_integrity($1, $2)',
      [start_sequence || null, end_sequence || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/verify-notarizations', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM verify_notarization_integrity()');
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Step 10: Monitor and Maintain

1. **Regular Verification**: Run integrity checks periodically:
   ```sql
   SELECT * FROM verify_ledger_integrity();
   SELECT * FROM verify_notarization_integrity();
   ```

2. **Monitor Notarizations**: Check notarization status:
   ```sql
   SELECT 
       sequence_start,
       sequence_end,
       entry_count,
       notarized_at,
       notarized_by
   FROM ledger_root_hashes
   ORDER BY sequence_end DESC;
   ```

3. **Check Chain Health**: Monitor for any integrity issues:
   ```sql
   -- Check for gaps in sequence
   SELECT 
       sequence_number,
       previous_entry_hash,
       LAG(entry_hash) OVER (ORDER BY sequence_number) as expected_previous
   FROM ledger_entries
   WHERE sequence_number > 1
   ORDER BY sequence_number DESC
   LIMIT 10;
   ```

## Rollback Plan

If you need to rollback (⚠️ This removes immutability):

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS prevent_ledger_entry_updates ON ledger_entries;
DROP TRIGGER IF EXISTS prevent_ledger_entry_deletes ON ledger_entries;
DROP TRIGGER IF EXISTS compute_ledger_hash_trigger ON ledger_entries;

-- Remove functions (optional - keep for verification)
-- DROP FUNCTION IF EXISTS prevent_ledger_updates();
-- DROP FUNCTION IF EXISTS prevent_ledger_deletes();
-- DROP FUNCTION IF EXISTS compute_ledger_entry_hash();

-- Remove columns (optional - keep for historical data)
-- ALTER TABLE ledger_entries DROP COLUMN IF EXISTS sequence_number;
-- ALTER TABLE ledger_entries DROP COLUMN IF EXISTS previous_entry_hash;
```

## Troubleshooting

### Issue: Migration fails with "column already exists"
- **Solution**: The migration uses `IF NOT EXISTS`, so this shouldn't happen. If it does, check for partial migration.

### Issue: Backfill takes too long
- **Solution**: For large datasets, consider running backfill in batches or during maintenance window.

### Issue: Triggers prevent legitimate operations
- **Solution**: Triggers are designed to prevent ALL updates/deletes. If you need to modify entries, you must temporarily disable triggers (not recommended).

### Issue: Verification fails
- **Solution**: Check the error message for the specific sequence number where the chain breaks. This indicates data corruption.

## Best Practices

1. **Regular Notarization**: Run notarization daily or after every N entries
2. **Monitor Integrity**: Set up alerts for verification failures
3. **Backup Regularly**: Even though entries are immutable, backups are still important
4. **Document Notarizations**: Keep records of when notarizations occur
5. **External Verification**: Consider storing root hashes externally (blockchain, external service) for additional verification

## Next Steps

After implementation:
1. ✅ Test with production-like data
2. ✅ Set up monitoring/alerting
3. ✅ Document the process for your team
4. ✅ Consider external notarization services for additional security
5. ✅ Review and optimize notarization frequency based on entry volume

