# Step-by-Step Implementation Guide for Immutable Ledger

This guide breaks down the immutable ledger implementation into 7 manageable steps. Complete each step, verify it works, then move to the next.

## Overview

The implementation is split into these steps:

1. **Add Columns** - Add sequence_number and previous_entry_hash columns
2. **Backfill Existing** - Update existing entries with hash chains
3. **Hash Chain Trigger** - Auto-compute chains for new entries
4. **Append-Only Enforcement** - Prevent UPDATE/DELETE operations
5. **Notarization Table** - Create table for root hash checkpoints
6. **Notarization Functions** - Functions to create checkpoints
7. **Verification Functions** - Functions to verify integrity

## Prerequisites

- PostgreSQL database with `pgcrypto` extension
- Existing `ledger_entries` table
- Database admin access
- **Backup your database first!**

## Step 1: Add Columns for Hash Chaining

**File:** `db/immutable_ledger_step1_add_columns.sql`

**What it does:**
- Adds `sequence_number` column (BIGSERIAL) for ordering
- Adds `previous_entry_hash` column for chain linking
- Creates indexes for performance

**Run it:**
```bash
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step1_add_columns.sql
```

**Verify:**
```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ledger_entries' 
  AND column_name IN ('sequence_number', 'previous_entry_hash');

-- Should show both columns
```

**Expected output:**
```
✅ Step 1 Complete: Columns added successfully
```

**If successful:** Proceed to Step 2

---

## Step 2: Backfill Existing Entries

**File:** `db/immutable_ledger_step2_backfill_existing.sql`

**What it does:**
- Assigns sequence numbers to existing entries
- Computes hash chains for all existing entries
- Updates entry_hash to include chain information

**⚠️ Important:** This may take time if you have many entries. Monitor progress.

**Run it:**
```bash
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step2_backfill_existing.sql
```

**Verify:**
```sql
-- Check that all entries have sequence numbers
SELECT 
    COUNT(*) as total_entries,
    COUNT(sequence_number) as entries_with_sequence,
    COUNT(previous_entry_hash) as entries_with_previous_hash
FROM ledger_entries;

-- All counts should match
```

**Expected output:**
```
Backfilling X entries with hash chains...
Processed 100 entries...
Processed 200 entries...
...
✅ Step 2 Complete: Backfilled X ledger entries with hash chains
✅ All X entries have sequence numbers
```

**If successful:** Proceed to Step 3

---

## Step 3: Create Hash Chain Trigger

**File:** `db/immutable_ledger_step3_hash_chain_trigger.sql`

**What it does:**
- Creates a trigger that automatically computes hash chains for NEW entries
- Ensures all future inserts maintain chain integrity

**Run it:**
```bash
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step3_hash_chain_trigger.sql
```

**Verify:**
```sql
-- Check trigger exists
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'ledger_entries'
  AND trigger_name = 'compute_ledger_hash_trigger';

-- Should show the trigger
```

**Test it:**
```sql
-- Insert a test entry
INSERT INTO ledger_entries (profile_id, action, version_hash, metadata)
VALUES (
    NULL,
    'TEST_TRIGGER',
    'test_hash_' || md5(random()::text),
    '{"test": true}'::jsonb
);

-- Check it has sequence and hash
SELECT 
    sequence_number,
    previous_entry_hash,
    LEFT(entry_hash, 20) as hash_preview,
    action
FROM ledger_entries
WHERE action = 'TEST_TRIGGER'
ORDER BY sequence_number DESC
LIMIT 1;
```

**Expected output:**
```
✅ Step 3 Complete: Hash chain trigger created successfully
```

**If successful:** Proceed to Step 4

---

## Step 4: Append-Only Enforcement

**File:** `db/immutable_ledger_step4_append_only_enforcement.sql`

**What it does:**
- Creates triggers that BLOCK UPDATE and DELETE operations
- Makes the ledger truly immutable at the database level

**⚠️ WARNING:** After this step, you CANNOT update or delete ledger entries!

**Run it:**
```bash
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step4_append_only_enforcement.sql
```

**Verify:**
```sql
-- Check triggers exist
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'ledger_entries'
  AND trigger_name IN (
    'prevent_ledger_entry_updates',
    'prevent_ledger_entry_deletes'
  );

-- Should show both triggers
```

**Test it (these should FAIL):**
```sql
-- Try to update (should fail)
UPDATE ledger_entries 
SET action = 'TEST_UPDATE' 
WHERE id = (SELECT id FROM ledger_entries LIMIT 1);
-- Expected: ERROR about immutable entries

-- Try to delete (should fail)
DELETE FROM ledger_entries 
WHERE id = (SELECT id FROM ledger_entries LIMIT 1);
-- Expected: ERROR about immutable entries
```

**Expected output:**
```
✅ Step 4 Complete: Append-only enforcement triggers created successfully
⚠️  WARNING: UPDATE and DELETE operations are now blocked on ledger_entries
```

**If successful:** Proceed to Step 5

---

## Step 5: Create Notarization Table

**File:** `db/immutable_ledger_step5_notarization_table.sql`

**What it does:**
- Creates `ledger_root_hashes` table for storing periodic checkpoints
- Sets up indexes for efficient queries

**Run it:**
```bash
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step5_notarization_table.sql
```

**Verify:**
```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'ledger_root_hashes';

-- Should show the table
```

**Expected output:**
```
✅ Step 5 Complete: Root hash notarization table created successfully
```

**If successful:** Proceed to Step 6

---

## Step 6: Create Notarization Functions

**File:** `db/immutable_ledger_step6_notarization_functions.sql`

**What it does:**
- Creates `generate_root_hash()` - generates root hash for a range
- Creates `notarize_ledger()` - creates periodic checkpoints

**Run it:**
```bash
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step6_notarization_functions.sql
```

**Verify:**
```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('generate_root_hash', 'notarize_ledger');

-- Should show both functions
```

**Test it:**
```sql
-- Create first notarization
SELECT * FROM notarize_ledger(1000, 'initial-setup');

-- Check it was created
SELECT 
    sequence_start,
    sequence_end,
    entry_count,
    notarized_at
FROM ledger_root_hashes
ORDER BY sequence_end DESC
LIMIT 1;
```

**Expected output:**
```
✅ Step 6 Complete: Notarization functions created successfully
```

**If successful:** Proceed to Step 7

---

## Step 7: Create Verification Functions

**File:** `db/immutable_ledger_step7_verification_functions.sql`

**What it does:**
- Creates `verify_ledger_integrity()` - verifies hash chain integrity
- Creates `verify_notarization_integrity()` - verifies notarizations

**Run it:**
```bash
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step7_verification_functions.sql
```

**Verify:**
```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('verify_ledger_integrity', 'verify_notarization_integrity');

-- Should show both functions
```

**Test it:**
```sql
-- Verify entire ledger
SELECT * FROM verify_ledger_integrity();

-- Verify notarizations
SELECT * FROM verify_notarization_integrity();
```

**Expected output:**
```
✅ Step 7 Complete: Verification functions created successfully
✅ IMMUTABLE LEDGER SETUP COMPLETE!
   Verified X entries with hash chain integrity
```

**🎉 Congratulations!** Your immutable ledger is now fully set up!

---

## Quick Reference: Running All Steps

If you want to run all steps at once (after testing individually):

```bash
# Run all steps in order
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step1_add_columns.sql
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step2_backfill_existing.sql
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step3_hash_chain_trigger.sql
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step4_append_only_enforcement.sql
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step5_notarization_table.sql
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step6_notarization_functions.sql
psql -h localhost -U your_user -d your_database -f db/immutable_ledger_step7_verification_functions.sql
```

## Troubleshooting

### Step 2 takes too long
- This is normal for large datasets
- Monitor progress in the logs
- Consider running during maintenance window

### Step 4 blocks legitimate operations
- This is by design - ledger is immutable
- If you need to modify entries, you must temporarily disable triggers (not recommended)

### Verification fails
- Check the error message for the specific sequence number
- This indicates data corruption or a broken chain
- Review entries around that sequence number

## Next Steps After Implementation

1. Set up periodic notarization (daily cron job)
2. Add monitoring/alerting for verification failures
3. Document the process for your team
4. Consider external notarization for additional security

