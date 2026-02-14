# Blockchain Integration Testing Guide

## Prerequisites

1. **Database Migration**: Run the Phase 2 schema update
2. **Backend Running**: Ensure backend server is running
3. **Database Access**: Verify PostgreSQL connection
4. **Test Data**: Have test profiles, files, and review tasks available

---

## Step 1: Run Database Migration

### Option A: Using psql directly
```bash
psql -U aigov -d ai_governance -f db/update_ledger_entries_for_phase2.sql
```

### Option B: Using Docker
```bash
docker exec -i ai-gov-postgres psql -U aigov -d ai_governance < db/update_ledger_entries_for_phase2.sql
```

### Verify Migration
```sql
-- Check table structure
\d ledger_entries

-- Should show:
-- profile_id UUID (nullable)
-- action VARCHAR(100)
-- No foreign key constraint
```

---

## Step 2: Verify Phase 1 Transactions (Already Working)

### Test 1: Profile Activation
```bash
# Activate a draft profile via API
curl -X POST http://localhost:3001/api/governance-profiles/{profileId}/activate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"justification": "Testing profile activation"}'
```

**Verify in Database**:
```sql
SELECT * FROM ledger_entries 
WHERE action = 'activated' 
ORDER BY timestamp DESC 
LIMIT 1;
```

**Expected**:
- `action` = 'activated'
- `profile_id` = profile ID
- `version_hash` = SHA-256 hash
- `entry_hash` = SHA-256 hash
- `metadata` contains justification and version

### Test 2: Profile Archiving
```bash
# Archive an active profile
curl -X POST http://localhost:3001/api/governance-profiles/{profileId}/archive \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"justification": "Testing profile archiving"}'
```

**Verify in Database**:
```sql
SELECT * FROM ledger_entries 
WHERE action = 'archived' 
ORDER BY timestamp DESC 
LIMIT 1;
```

### Test 3: Profile Export
```bash
# Export a profile
curl -X POST http://localhost:3001/api/governance-profiles/{profileId}/export \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "scope": "full",
    "justification": "Testing profile export"
  }'
```

**Verify in Database**:
```sql
SELECT * FROM ledger_entries 
WHERE action = 'PROFILE_EXPORTED' 
ORDER BY timestamp DESC 
LIMIT 1;
```

---

## Step 3: Test Phase 2 Transactions (New Implementation)

### Test 4: Review Approval

**Prerequisites**:
- Have a review task in 'pending' status
- Have an AI inference associated with the review task

**Test**:
```bash
# Approve a review task
curl -X POST http://localhost:3001/api/reviews/{reviewTaskId}/approve \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewNotes": "Approved after review",
    "justification": "Meets all requirements"
  }'
```

**Expected Response**:
```json
{
  "id": "...",
  "status": "approved",
  "approved_by": "...",
  "approved_at": "...",
  "ledgerEntry": {
    "decisionHash": "abc123..."
  }
}
```

**Verify in Database**:
```sql
SELECT * FROM ledger_entries 
WHERE action = 'REVIEW_APPROVED' 
ORDER BY timestamp DESC 
LIMIT 1;
```

**Check Metadata**:
```sql
SELECT 
  profile_id as review_task_id,
  action,
  metadata->>'inferenceId' as inference_id,
  metadata->>'approvedBy' as approved_by,
  metadata->>'reviewNotes' as review_notes,
  timestamp
FROM ledger_entries 
WHERE action = 'REVIEW_APPROVED' 
ORDER BY timestamp DESC 
LIMIT 1;
```

### Test 5: Review Rejection

**Test**:
```bash
# Reject a review task (requires reviewNotes)
curl -X POST http://localhost:3001/api/reviews/{reviewTaskId}/reject \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewNotes": "Does not meet quality standards. Requires additional review.",
    "justification": "Quality check failed"
  }'
```

**Expected Response**:
```json
{
  "id": "...",
  "status": "rejected",
  "review_notes": "...",
  "ledgerEntry": {
    "decisionHash": "def456..."
  }
}
```

**Verify in Database**:
```sql
SELECT * FROM ledger_entries 
WHERE action = 'REVIEW_REJECTED' 
ORDER BY timestamp DESC 
LIMIT 1;
```

**Check Metadata**:
```sql
SELECT 
  profile_id as review_task_id,
  action,
  metadata->>'rejectedBy' as rejected_by,
  metadata->>'reviewNotes' as review_notes,
  metadata->>'rejectionReason' as rejection_reason,
  timestamp
FROM ledger_entries 
WHERE action = 'REVIEW_REJECTED' 
ORDER BY timestamp DESC 
LIMIT 1;
```

### Test 6: Tokenized Data Storage

**Prerequisites**:
- Have a file uploaded to the system
- Tokenization worker must be running

**Test**:
```bash
# Upload a file (triggers tokenization)
curl -X POST http://localhost:3001/api/files/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@test-document.pdf"
```

**Wait for Tokenization**:
- Check worker logs for tokenization completion
- Or query database for tokenized_data status

**Verify in Database**:
```sql
-- Check tokenized data was created
SELECT * FROM tokenized_data 
ORDER BY created_at DESC 
LIMIT 1;

-- Check ledger entry was created
SELECT * FROM ledger_entries 
WHERE action = 'TOKENIZED_DATA_STORED' 
ORDER BY timestamp DESC 
LIMIT 1;
```

**Check Metadata**:
```sql
SELECT 
  profile_id as data_id,
  action,
  version_hash as tokenized_hash,
  metadata->>'rawDataId' as raw_data_id,
  metadata->>'tokenCount' as token_count,
  metadata->>'tokenizationMethod' as method,
  metadata->>'fileHash' as file_hash,
  timestamp
FROM ledger_entries 
WHERE action = 'TOKENIZED_DATA_STORED' 
ORDER BY timestamp DESC 
LIMIT 1;
```

---

## Step 4: Verify Hash Integrity

### Test Hash Verification

```sql
-- Get a ledger entry
SELECT 
  id,
  profile_id,
  action,
  version_hash,
  entry_hash,
  timestamp
FROM ledger_entries 
WHERE action = 'REVIEW_APPROVED' 
ORDER BY timestamp DESC 
LIMIT 1;

-- Manually verify entry_hash matches computed hash
-- (This would be done programmatically in production)
```

### Test Ledger History

```javascript
// Using ledgerService.getHistory() method
const history = await ledgerService.getHistory(profileId);
console.log('Ledger history:', history);
```

---

## Step 5: Error Handling Tests

### Test 1: Missing Review Notes on Rejection
```bash
# Should return 400 error
curl -X POST http://localhost:3001/api/reviews/{reviewTaskId}/reject \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected**: 400 Bad Request - "Review notes required for rejection"

### Test 2: Blockchain Write Failure (Simulated)
- Temporarily break database connection
- Attempt review approval
- Verify request still succeeds (non-blocking)
- Check logs for error message

---

## Step 6: Integration Tests

### Complete Workflow Test

1. **Upload File** → Triggers tokenization
   - Verify `TOKENIZED_DATA_STORED` entry created

2. **AI Inference** → Creates inference result
   - (Phase 3: Will create `AI_DECISION_RECORDED`)

3. **Create Review Task** → Assigns to reviewer
   - Review task created in database

4. **Approve Review** → Human decision
   - Verify `REVIEW_APPROVED` entry created
   - Verify decision hash in response

5. **Verify Complete Chain**:
```sql
-- Get all related ledger entries
SELECT 
  action,
  profile_id,
  version_hash,
  timestamp,
  metadata
FROM ledger_entries
WHERE 
  (action = 'TOKENIZED_DATA_STORED' AND profile_id = '{tokenizedDataId}')
  OR (action = 'REVIEW_APPROVED' AND profile_id = '{reviewTaskId}')
ORDER BY timestamp ASC;
```

---

## Step 7: Performance Tests

### Test Concurrent Transactions
```bash
# Run multiple approvals simultaneously
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/reviews/{reviewTaskId}/approve \
    -H "Authorization: Bearer {token}" \
    -H "Content-Type: application/json" \
    -d '{"reviewNotes": "Test approval '$i'"}' &
done
wait
```

**Verify**: All entries created successfully

### Test Transaction Volume
- Create 100 review approvals
- Measure time to complete
- Verify all entries in database
- Check for any duplicates or missing entries

---

## Verification Checklist

### Phase 1 (Profile Transactions)
- [ ] Profile activation creates ledger entry
- [ ] Profile archiving creates ledger entry
- [ ] Profile export creates ledger entry
- [ ] Profile version creation creates ledger entry
- [ ] All entries have correct hashes
- [ ] Metadata is properly stored

### Phase 2 (Review & Tokenized Data)
- [ ] Review approval creates `REVIEW_APPROVED` entry
- [ ] Review rejection creates `REVIEW_REJECTED` entry
- [ ] Tokenized data creates `TOKENIZED_DATA_STORED` entry
- [ ] Decision hashes are computed correctly
- [ ] Tokenized hashes match actual content
- [ ] All metadata fields populated
- [ ] Error handling works (non-blocking failures)

### Database Schema
- [ ] `profile_id` is nullable
- [ ] `action` column accepts 100 characters
- [ ] No foreign key constraint on `profile_id`
- [ ] Index on `action` exists

---

## Troubleshooting

### Issue: Foreign Key Constraint Error
**Solution**: Run the migration script again
```bash
psql -U aigov -d ai_governance -f db/update_ledger_entries_for_phase2.sql
```

### Issue: Review Approval Not Creating Entry
**Check**:
1. Backend logs for errors
2. Database connection
3. Review task exists and is in correct state
4. User has proper permissions

### Issue: Tokenized Data Not Creating Entry
**Check**:
1. Tokenization worker is running
2. Worker logs for errors
3. Database connection in worker
4. File was successfully tokenized

### Issue: Hash Mismatch
**Check**:
1. Hash computation logic
2. Data being hashed matches expected format
3. No extra whitespace or encoding issues

---

## Quick Test Script

Save as `test-blockchain.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"
TOKEN="your-auth-token"

echo "Testing Blockchain Integration..."

# Test Review Approval
echo "1. Testing Review Approval..."
curl -X POST "$BASE_URL/api/reviews/{reviewTaskId}/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reviewNotes": "Test approval", "justification": "Testing"}'

# Test Review Rejection
echo "2. Testing Review Rejection..."
curl -X POST "$BASE_URL/api/reviews/{reviewTaskId}/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reviewNotes": "Test rejection - does not meet requirements"}'

# Check Ledger Entries
echo "3. Checking Ledger Entries..."
psql -U aigov -d ai_governance -c "
SELECT action, COUNT(*) as count 
FROM ledger_entries 
WHERE action IN ('REVIEW_APPROVED', 'REVIEW_REJECTED', 'TOKENIZED_DATA_STORED')
GROUP BY action;
"

echo "Testing complete!"
```

---

## Next Steps After Testing

1. **Review Test Results**: Ensure all transactions are recorded
2. **Check Logs**: Verify no errors in backend logs
3. **Validate Hashes**: Confirm hash integrity
4. **Performance Check**: Ensure acceptable latency
5. **Document Issues**: Note any problems found
6. **Proceed to Phase 3**: Begin AI decision recording implementation

---

## Support

If you encounter issues:
1. Check backend logs: `backend/logs/combined.log`
2. Check database logs
3. Verify database migration completed
4. Ensure all services are running
5. Review error messages in API responses




