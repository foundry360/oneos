# Blockchain Integration - Phase 3 Implementation Plan

## Overview

Phase 3 extends blockchain integration to capture AI decision-making, override decisions, and sensitive data access events. These transactions are critical for complete audit trails and regulatory compliance.

---

## Phase 3 Transactions

### 1. AI Decision Recording

#### 1.1 Transaction: `AI_DECISION_RECORDED`

**Purpose**: Record immutable AI decisions (approve/reject/escalate) before human review

**When Triggered**:
- After AI inference completes
- When AI model makes a decision based on governance profile rules
- Before creating review task (if human review required)

**Integration Point**: `backend/src/workers/inferenceWorker.js` or `backend/src/services/aiService.js`

**Data Structure**:
```javascript
{
  entryId: UUID,
  inferenceId: UUID,
  action: 'AI_DECISION_RECORDED',
  decisionHash: SHA-256,  // Hash of decision + context
  entryHash: SHA-256,
  timestamp: ISO8601,
  metadata: {
    decision: 'approve' | 'reject' | 'escalate',
    confidence: number,        // 0.0 - 1.0
    modelName: string,
    profileName: string,       // Governance profile used
    riskLevel: 'low' | 'medium' | 'high',
    tokenizedDataId: UUID,
    reasoning: string,         // AI explanation (if available)
    governanceRules: object    // Rules that influenced decision
  }
}
```

**Implementation Steps**:
1. Add `storeAIDecision()` method to `ledgerService.js`
2. Integrate into inference worker after AI decision is made
3. Store decision before creating review task
4. Link decision hash to review task for traceability

**File Changes**:
- `backend/src/services/ledgerService.js` - Add `storeAIDecision()` method
- `backend/src/workers/inferenceWorker.js` - Call ledger service after AI decision
- `backend/src/services/aiService.js` - Pass decision context to worker

---

### 2. Override Decision Recording

#### 2.1 Transaction: `OVERRIDE_DECISION`

**Purpose**: Record when admin/governance overrides AI or reviewer decision

**When Triggered**:
- Admin overrides AI decision
- Admin overrides reviewer decision
- Governance overrides automated workflow
- Emergency override scenarios

**Integration Point**: New endpoint `POST /api/reviews/:id/override` or existing override functionality

**Data Structure**:
```javascript
{
  entryId: UUID,
  decisionId: UUID,           // Original decision ID (AI or review)
  action: 'OVERRIDE_DECISION',
  overrideHash: SHA-256,
  entryHash: SHA-256,
  timestamp: ISO8601,
  metadata: {
    originalDecision: 'approved' | 'rejected' | 'escalated',
    originalDecisionType: 'ai' | 'review',
    overrideDecision: 'approved' | 'rejected' | 'escalated',
    overriddenBy: userId,
    justification: string,    // REQUIRED - must be provided
    profileName: string,
    riskLevel: string,
    originalDecisionHash: SHA-256,  // Link to original decision
    emergencyOverride: boolean
  }
}
```

**Implementation Steps**:
1. Add `storeOverrideDecision()` method to `ledgerService.js`
2. Create override endpoint in `backend/src/routes/review.js`
3. Add RBAC check (admin/governance only)
4. Require mandatory justification
5. Link to original decision via hash

**File Changes**:
- `backend/src/services/ledgerService.js` - Add `storeOverrideDecision()` method
- `backend/src/routes/review.js` - Add `POST /:id/override` endpoint
- `backend/src/middleware/rbac.js` - Add override permission check

**Security Requirements**:
- Only admin and governance roles can override
- Justification is mandatory (minimum 50 characters)
- Original decision must exist
- Override must be logged in audit trail

---

### 3. Sensitive Data Access Logging

#### 3.1 Transaction: `SENSITIVE_DATA_ACCESSED`

**Purpose**: Record immutable log of PHI/PII data access for HIPAA compliance

**When Triggered**:
- PHI (Protected Health Information) accessed
- PII (Personally Identifiable Information) accessed
- Tokenized data decrypted for viewing
- Raw file content accessed
- Export of sensitive data

**Integration Points**:
- File download endpoints
- Tokenized data retrieval
- Data export functionality
- Review task data access

**Data Structure**:
```javascript
{
  entryId: UUID,
  dataId: UUID,                // File, tokenized data, or inference ID
  action: 'SENSITIVE_DATA_ACCESSED',
  accessHash: SHA-256,
  entryHash: SHA-256,
  timestamp: ISO8601,
  metadata: {
    accessedBy: userId,
    dataType: 'PHI' | 'PII' | 'TOKENIZED' | 'RAW',
    accessReason: string,     // Why data was accessed
    profileName: string,       // Governance profile that allowed access
    accessMethod: 'download' | 'view' | 'export' | 'api',
    ipAddress: string,
    userAgent: string,
    dataHash: SHA-256,        // Hash of accessed data
    accessDuration: number,   // Seconds (if applicable)
    redactionLevel: string    // If data was redacted
  }
}
```

**Implementation Steps**:
1. Add `storeDataAccess()` method to `ledgerService.js`
2. Create middleware for sensitive data access tracking
3. Integrate into file download routes
4. Integrate into tokenized data retrieval
5. Add to review task data access
6. Track access duration and method

**File Changes**:
- `backend/src/services/ledgerService.js` - Add `storeDataAccess()` method
- `backend/src/middleware/dataAccess.js` - New middleware for tracking
- `backend/src/routes/files.js` - Add access logging to download
- `backend/src/routes/tokenization.js` - Add access logging
- `backend/src/routes/review.js` - Add access logging when viewing data

**Compliance Requirements**:
- All PHI access must be logged
- Access reason must be provided
- Link to governance profile that authorized access
- IP address and user agent captured
- Access cannot be deleted (immutable)

---

## Implementation Architecture

### Chaincode Functions (Future Hyperledger Fabric)

```go
// AI Decision Recording
StoreAIDecision(entryId, inferenceId, decision, decisionHash, metadata)

// Override Decision Recording
StoreOverrideDecision(entryId, decisionId, overrideHash, metadata)

// Data Access Logging
StoreDataAccess(entryId, dataId, accessHash, metadata)
```

### Service Layer Methods

```javascript
// ledgerService.js additions
async storeAIDecision(inferenceId, decision, decisionHash, metadata)
async storeOverrideDecision(decisionId, overrideHash, metadata)
async storeDataAccess(dataId, accessHash, metadata)
```

---

## Integration Points

### 1. AI Decision Integration

**Location**: `backend/src/workers/inferenceWorker.js`

```javascript
// After AI makes decision
const aiDecision = await aiService.makeDecision(inferenceData);
const decisionHash = computeDecisionHash(aiDecision);

// Store in blockchain
await ledgerService.storeAIDecision(
  inferenceId,
  aiDecision.decision,
  decisionHash,
  {
    confidence: aiDecision.confidence,
    modelName: aiDecision.modelName,
    profileName: resolvedProfile.name,
    riskLevel: aiDecision.riskLevel,
    // ... other metadata
  }
);

// Then create review task if needed
if (requiresHumanReview) {
  await createReviewTask(inferenceId, aiDecision);
}
```

### 2. Override Integration

**Location**: `backend/src/routes/review.js`

```javascript
// New endpoint: POST /api/reviews/:id/override
router.post('/:id/override', authenticate, requireRole(['admin', 'governance']), async (req, res) => {
  const { overrideDecision, justification } = req.body;
  
  // Validate justification
  if (!justification || justification.length < 50) {
    return res.status(400).json({ error: 'Justification required (min 50 characters)' });
  }
  
  // Get original decision
  const originalDecision = await getOriginalDecision(req.params.id);
  
  // Create override hash
  const overrideHash = computeOverrideHash(originalDecision, overrideDecision, justification);
  
  // Store in blockchain
  await ledgerService.storeOverrideDecision(
    originalDecision.id,
    overrideHash,
    {
      originalDecision: originalDecision.decision,
      overrideDecision: overrideDecision,
      overriddenBy: req.user.id,
      justification: justification,
      // ... other metadata
    }
  );
  
  // Update decision in database
  // ...
});
```

### 3. Data Access Integration

**Location**: `backend/src/middleware/dataAccess.js` (new file)

```javascript
// Middleware to track sensitive data access
async function trackDataAccess(req, res, next) {
  const originalSend = res.send;
  
  res.send = async function(data) {
    // Check if response contains sensitive data
    if (isSensitiveData(req.path, data)) {
      const dataType = determineDataType(req.path);
      const accessHash = computeAccessHash(req, data);
      
      // Store in blockchain
      await ledgerService.storeDataAccess(
        req.params.id || req.body.dataId,
        accessHash,
        {
          accessedBy: req.user.id,
          dataType: dataType,
          accessReason: req.body.accessReason || 'Not provided',
          accessMethod: req.method.toLowerCase(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          // ... other metadata
        }
      );
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}
```

---

## Database Schema Updates

### New Ledger Entry Types

The existing `ledger_entries` table supports all transaction types via the `action` field:

```sql
-- Action types for Phase 3:
-- 'AI_DECISION_RECORDED'
-- 'OVERRIDE_DECISION'
-- 'SENSITIVE_DATA_ACCESSED'

-- No schema changes needed - existing table supports all types
-- profile_id field is used flexibly:
--   - For AI decisions: inferenceId
--   - For overrides: decisionId
--   - For data access: dataId
```

---

## Security & Compliance

### HIPAA Compliance
- All PHI access logged immutably
- Access reason required
- User identity tracked
- Timestamped for audit

### Audit Requirements
- Complete chain of custody
- Decision traceability (AI → Review → Override)
- Data access history
- Immutable records

### Access Control
- Override: Admin/Governance only
- Data Access: Role-based with logging
- AI Decisions: Automatic logging

---

## Testing Strategy

### Unit Tests
- Test ledger service methods
- Test hash computation
- Test metadata validation

### Integration Tests
- Test AI decision → blockchain
- Test override → blockchain
- Test data access → blockchain
- Test error handling

### End-to-End Tests
- Complete workflow: AI decision → Review → Override
- Data access tracking across routes
- Verify blockchain entries

---

## Rollout Plan

### Step 1: AI Decision Recording (Week 1)
1. Add `storeAIDecision()` to ledgerService
2. Integrate into inference worker
3. Test with sample inferences
4. Deploy to staging

### Step 2: Override Decision Recording (Week 2)
1. Add `storeOverrideDecision()` to ledgerService
2. Create override endpoint
3. Add RBAC checks
4. Test override scenarios
5. Deploy to staging

### Step 3: Data Access Logging (Week 3)
1. Add `storeDataAccess()` to ledgerService
2. Create data access middleware
3. Integrate into file/tokenized data routes
4. Test access logging
5. Deploy to staging

### Step 4: Production Deployment (Week 4)
1. Final testing
2. Documentation
3. Production deployment
4. Monitor and validate

---

## Monitoring & Metrics

### Key Metrics
- AI decisions recorded per day
- Override frequency
- Data access events
- Blockchain write success rate
- Blockchain write latency

### Alerts
- Failed blockchain writes
- High override frequency
- Unusual data access patterns
- Blockchain connectivity issues

---

## Future Enhancements

1. **Real-time Blockchain Sync**: WebSocket updates when transactions are confirmed
2. **Blockchain Query API**: Direct query endpoints for blockchain data
3. **Multi-Channel Support**: Separate channels for different data types
4. **Private Data Collections**: Enhanced privacy for sensitive fields
5. **Blockchain Analytics**: Dashboard for blockchain transaction analysis

---

## Dependencies

- Phase 1 & 2 must be complete
- Hyperledger Fabric network must be operational
- Chaincode must support new transaction types
- Database ledger_entries table must exist

---

## Estimated Timeline

- **AI Decision Recording**: 1 week
- **Override Decision Recording**: 1 week
- **Data Access Logging**: 1 week
- **Testing & Deployment**: 1 week

**Total**: 4 weeks

---

## Success Criteria

✅ All AI decisions are recorded in blockchain  
✅ All override decisions are recorded with justification  
✅ All sensitive data access is logged immutably  
✅ Complete audit trail from AI decision to final outcome  
✅ HIPAA compliance requirements met  
✅ Zero data loss in blockchain writes  
✅ Sub-second blockchain write latency (95th percentile)




