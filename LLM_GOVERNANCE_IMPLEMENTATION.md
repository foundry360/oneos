# LLM Governance Implementation

## Overview

The LLM governance functionality has been fully implemented to enforce governance policies on LLM prompts before they are processed. This includes risk assessment, pre-processing controls, human review workflows, and comprehensive audit logging.

## Components Implemented

### 1. Database Schema (`db/llm_governance_migration.sql`)

**Tables Created:**
- `llm_prompt_requests` - Stores prompt requests with governance evaluation
- `llm_prompt_responses` - Stores LLM responses linked to requests
- `llm_provider_configs` - Stores LLM provider configurations

**Key Features:**
- Prompt hashing for deduplication
- Risk level and score tracking
- Governance profile linkage
- Pre-processing metadata storage
- Review workflow integration

### 2. Governance Service (`backend/src/services/governanceService.js`)

**Capabilities:**
- **Prompt Evaluation**: Evaluates prompts against governance profiles
- **Risk Assessment**: 
  - PII detection (SSN, email, phone, credit card)
  - Sensitive keyword detection
  - Harmful content detection
  - Domain-specific risk rules
- **Pre-Processing Controls**:
  - PII redaction
  - Tokenization
- **Review Requirement Logic**: Determines if human review is needed

### 3. LLM Adapter System (`backend/src/services/llmAdapters/`)

**Adapters Implemented:**
- `BaseLLMAdapter` - Base class for all adapters
- `OpenAIAdapter` - OpenAI API integration
- `AnthropicAdapter` - Anthropic/Claude API integration
- `CustomLLMAdapter` - Custom LLM endpoints (VPC/air-gapped)
- `AdapterFactory` - Factory for creating adapters

**Features:**
- Provider-agnostic interface
- Network-aware configuration (VPC/air-gapped support)
- Self-signed certificate handling
- Flexible response parsing

### 4. LLM Gateway Service (`backend/src/services/llmGatewayService.js`)

**Core Functionality:**
- **Governance Enforcement**: Applies governance before LLM calls
- **Request Management**: Creates and tracks prompt requests
- **Review Integration**: Creates review tasks for high-risk prompts
- **Response Processing**: Handles LLM responses and post-processing
- **Ledger Logging**: Logs all operations to immutable ledger

**Workflow:**
1. Receive prompt
2. Evaluate against governance
3. Apply pre-processing controls
4. Create request record
5. Check if review required → create review task OR proceed
6. Call LLM via adapter
7. Store response
8. Apply post-processing
9. Log to ledger
10. Return result

### 5. API Routes (`backend/src/routes/llm.js`)

**Endpoints:**
- `POST /api/llm/prompt` - Submit prompt with governance
- `GET /api/llm/prompt/:id` - Get prompt request status
- `GET /api/llm/prompts` - List user's prompt requests
- `POST /api/llm/prompt/:id/approve` - Approve prompt (reviewer)
- `POST /api/llm/prompt/:id/reject` - Reject prompt (reviewer)
- `GET /api/llm/stats` - Get prompt statistics

### 6. Ledger Integration (`backend/src/services/ledgerService.js`)

**New Method:**
- `storeLLMPromptEntry()` - Logs LLM prompts to immutable ledger

**Logged Information:**
- Prompt hash
- Response hash
- Model and provider
- Risk level
- Token usage
- Governance profile

## Usage Examples

### Basic Prompt Submission

```javascript
// Frontend or API client
const response = await fetch('/api/llm/prompt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    prompt: 'What is the capital of France?',
    modelName: 'gpt-4',
    provider: 'openai',
    domain: 'general' // Optional: for governance profile selection
  })
});

const result = await response.json();
// Result: { requestId, status, response, metadata }
```

### Handling Review-Required Prompts

```javascript
// If status is 'pending_review'
if (result.status === 'pending_review') {
  // Prompt requires human review
  // Reviewer can approve/reject via:
  // POST /api/llm/prompt/:id/approve
  // POST /api/llm/prompt/:id/reject
}
```

### Custom LLM Configuration (VPC/Air-Gapped)

```javascript
const response = await fetch('/api/llm/prompt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    prompt: 'Analyze this document...',
    modelName: 'custom-model',
    provider: 'custom',
    llmConfig: {
      endpoint: 'http://llm-service.internal:8080/v1/completions',
      apiKey: 'internal-key',
      allowSelfSigned: true
    }
  })
});
```

## Governance Profile Integration

The system automatically:
1. Finds applicable governance profile based on domain
2. Evaluates prompt risk level
3. Applies pre-processing controls (PII redaction, tokenization)
4. Determines if human review is required
5. Blocks or allows prompt based on risk thresholds

## Risk Assessment Factors

**PII Detection:**
- Social Security Numbers
- Email addresses
- Phone numbers
- Credit card numbers
- Dates (potential DOB)

**Content Analysis:**
- Sensitive keywords (from governance profile rules)
- Harmful content patterns
- Prompt length/complexity
- Domain-specific risk rules

**Risk Levels:**
- **Low** (0.0-0.4): Auto-approved, minimal controls
- **Medium** (0.4-0.7): Conditional review, standard controls
- **High** (0.7-1.0): Required review, strict controls

## Review Workflow

1. High-risk prompts automatically create review tasks
2. Reviewers can approve/reject via API
3. Approved prompts are processed immediately
4. Rejected prompts are logged and blocked
5. All decisions are logged to immutable ledger

## Database Migration

Run the migration to create the necessary tables:

```bash
psql -h localhost -U your_user -d your_database -f db/llm_governance_migration.sql
```

## Environment Variables

For LLM provider configuration:

```env
# OpenAI
LLM_OPENAI_ENDPOINT=https://api.openai.com/v1
LLM_OPENAI_API_KEY=sk-...
LLM_OPENAI_MODEL=gpt-4

# Anthropic
LLM_ANTHROPIC_ENDPOINT=https://api.anthropic.com/v1
LLM_ANTHROPIC_API_KEY=sk-ant-...
LLM_ANTHROPIC_MODEL=claude-3-opus-20240229

# Custom/VPC
LLM_ENDPOINT=http://llm-service.internal:8080
LLM_API_KEY=internal-key
LLM_MODEL=custom-model
LLM_TIMEOUT=60000
LLM_ALLOW_SELF_SIGNED=true

# Network configuration
INTERNAL_NETWORK=true  # For VPC deployments
AIR_GAPPED=true        # For air-gapped deployments
```

## Next Steps: Gateway Connectivity

The LLM governance functionality is complete. The next phase will focus on:

1. **Customer Frontend Integration**
   - API Gateway pattern
   - Customer identification
   - CORS configuration
   - Rate limiting

2. **LLM Provider Configuration**
   - Database-driven configs
   - Multi-tenant support
   - VPC endpoint resolution
   - Air-gapped deployment support

3. **Network Architecture**
   - Reverse proxy setup
   - Service mesh integration
   - Load balancing
   - Health checks

## Testing

### Test Prompt Submission

```bash
curl -X POST http://localhost:3001/api/llm/prompt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "What is artificial intelligence?",
    "modelName": "gpt-4",
    "provider": "openai"
  }'
```

### Test Review Approval

```bash
curl -X POST http://localhost:3001/api/llm/prompt/REQUEST_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer REVIEWER_TOKEN" \
  -d '{
    "notes": "Approved after review"
  }'
```

## Security Considerations

1. **API Key Management**: Store LLM API keys encrypted in database
2. **Network Isolation**: Use internal endpoints for VPC deployments
3. **Certificate Validation**: Disable only for internal networks
4. **Access Control**: Review endpoints require reviewer/governance role
5. **Audit Trail**: All operations logged to immutable ledger

## Monitoring

Monitor the following:
- Prompt rejection rate
- Review queue length
- Average risk scores
- Token usage
- LLM API errors
- Governance profile effectiveness

