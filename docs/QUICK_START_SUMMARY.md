# Quick Start Summary

## For Customers: 2-Minute Installation

### 1. Get API Key
Contact your account manager or use the admin portal to get your API key.

### 2. Install SDK
```bash
curl -o govern-llm.js https://governance.yourcompany.com/sdk/govern-llm.js
```

### 3. Set Environment Variable
```bash
export GOVERNANCE_API_KEY="gov_your_key_here"
```

### 4. Update Code
```javascript
// OLD
const response = await openai.chat.completions.create({...});

// NEW
const { governLLM } = require('./govern-llm.js');
const response = await governLLM.complete({
  prompt: 'Your prompt',
  model: 'gpt-4'
});
```

**That's it!** Your LLM calls are now governed.

---

## For Admins: Customer Management

### Create Customer Account

```bash
curl -X POST https://governance.yourcompany.com/api/customers \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Acme Corp",
    "customerCode": "ACME",
    "contactEmail": "admin@acme.com",
    "domain": "financial"
  }'
```

### Create API Key

```bash
curl -X POST https://governance.yourcompany.com/api/customers/CUSTOMER_ID/api-keys \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyName": "Production Key"}'
```

**Save the API key - it's only shown once!**

### Or Use Script

```bash
chmod +x scripts/create-customer.sh
./scripts/create-customer.sh
```

---

## Database Setup

Run migrations in order:

1. `db/customer_management_migration.sql` - Customer accounts and API keys
2. `db/llm_governance_migration.sql` - LLM prompt tables

```bash
psql -h localhost -U your_user -d your_database -f db/customer_management_migration.sql
psql -h localhost -U your_user -d your_database -f db/llm_governance_migration.sql
```

---

## Architecture

```
Customer Code
    ↓
[govern-llm.js SDK]
    ↓
POST /api/llm/prompt
    ↓
[customerApiKeyAuth] → Validates API key
    ↓
[llmGatewayService] → Governance evaluation
    ↓
[LLM Adapter] → Customer's LLM
    ↓
Response with governance metadata
```

---

## Key Features

✅ **Lightweight**: Single file, zero dependencies  
✅ **Quick Install**: 2 minutes  
✅ **Secure**: API key authentication  
✅ **Flexible**: Works with any LLM provider  
✅ **Governed**: Automatic risk assessment  
✅ **Audited**: All calls logged to immutable ledger  

---

## Documentation

- **Customer Installation**: `docs/CUSTOMER_INSTALLATION_GUIDE.md`
- **Customer Management**: `docs/CUSTOMER_MANAGEMENT_GUIDE.md`
- **LLM Governance**: `LLM_GOVERNANCE_IMPLEMENTATION.md`

