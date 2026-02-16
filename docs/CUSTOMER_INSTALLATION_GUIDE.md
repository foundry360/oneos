# Customer Installation Guide

## Quick Start (2 Minutes)

### Step 1: Get Your API Key

Contact your account manager or use the admin portal to create an API key:

1. Log into the Governance Platform admin portal
2. Navigate to **Customers** → **Your Account** → **API Keys**
3. Click **Create API Key**
4. **Copy and save the API key immediately** (it won't be shown again!)

### Step 2: Download SDK

```bash
# Option A: Download directly
curl -o govern-llm.js https://governance.yourcompany.com/sdk/govern-llm.js

# Option B: Copy from documentation
# See the govern-llm.js file in the SDK folder
```

### Step 3: Set Environment Variables

```bash
# Linux/Mac
export GOVERNANCE_API_KEY="gov_your_api_key_here"
export GOVERNANCE_API_URL="https://governance.yourcompany.com"

# Windows (PowerShell)
$env:GOVERNANCE_API_KEY="gov_your_api_key_here"
$env:GOVERNANCE_API_URL="https://governance.yourcompany.com"

# Windows (CMD)
set GOVERNANCE_API_KEY=gov_your_api_key_here
set GOVERNANCE_API_URL=https://governance.yourcompany.com
```

### Step 4: Update Your Code

**Before:**
```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${openaiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  })
});
```

**After:**
```javascript
const { governLLM } = require('./govern-llm.js');

const response = await governLLM.complete({
  prompt: prompt,
  userId: 'user123',  // REQUIRED: Your internal user identifier
  model: 'gpt-4',
  provider: 'openai'
});

if (response.status === 'pending_review') {
  // Prompt requires review - wait for approval
  const finalResponse = await response.waitForApproval();
  console.log(finalResponse.text); // LLM response after approval
} else {
  // Auto-approved
  console.log(response.text); // LLM response
  console.log(response.metadata); // Governance metadata
}
```

**That's it!** Your LLM calls are now governed.

---

## Installation Methods

### Method 1: Single File (Recommended)

**Best for:** Quick integration, minimal dependencies

1. Download `govern-llm.js` to your project
2. Set environment variables
3. Import and use

```javascript
const { governLLM } = require('./govern-llm.js');
```

### Method 2: NPM Package (Coming Soon)

```bash
npm install @governance/llm-sdk
```

```javascript
const { governLLM } = require('@governance/llm-sdk');
```

### Method 3: Browser (CDN)

```html
<script src="https://governance.yourcompany.com/sdk/govern-llm.js"></script>
<script>
  window.GOVERNANCE_API_KEY = 'your-api-key';
  const response = await window.governLLM.complete({ prompt: '...' });
</script>
```

---

## Usage Examples

### Basic Usage

```javascript
const { governLLM } = require('./govern-llm.js');

try {
  const response = await governLLM.complete({
    prompt: 'What is artificial intelligence?',
    userId: 'user123',
    model: 'gpt-4',
    provider: 'openai'
  });
  
  if (response.status === 'pending_review') {
    console.log('Prompt requires review. Request ID:', response.requestId);
    // Wait for approval
    const finalResponse = await response.waitForApproval();
    console.log('Response:', finalResponse.text);
  } else {
    console.log('Response:', response.text);
    console.log('Risk Level:', response.metadata.riskLevel);
  }
} catch (error) {
  if (error.status === 'rejected') {
    console.error('Prompt rejected:', error.message);
  } else {
    console.error('Error:', error.message);
  }
}
```

### With Custom Domain

```javascript
const { GovernLLM } = require('./govern-llm.js');

const llm = new GovernLLM({
  apiKey: 'your-api-key',
  apiUrl: 'https://governance.yourcompany.com',
  domain: 'financial' // For domain-specific governance profiles
});

const response = await llm.complete({
  prompt: 'Analyze this financial document...',
  userId: 'user123',
  model: 'gpt-4'
});

if (response.status === 'pending_review') {
  // Handle review required
  const finalResponse = await response.waitForApproval();
  console.log(finalResponse.text);
} else {
  console.log(response.text);
}
```

### With LLM Options

```javascript
const response = await governLLM.complete({
  prompt: 'Generate a summary...',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 500
});
```

### Handling Review Required Status

When a prompt requires review, the SDK returns a structured response instead of throwing an error:

```javascript
const response = await governLLM.complete({
  prompt: 'Analyze sensitive financial data...',
  userId: 'user123',
  model: 'gpt-4'
});

if (response.status === 'pending_review') {
  // Show "Under Review" message to user
  console.log('Your prompt is under review. Request ID:', response.requestId);
  console.log('Risk Level:', response.riskLevel);
  
  // Option 1: Poll manually
  const checkStatus = async () => {
    const status = await governLLM.checkStatus(response.requestId);
    console.log('Current status:', status.status);
    return status;
  };
  
  // Option 2: Wait automatically (recommended)
  try {
    const finalResponse = await response.waitForApproval({
      interval: 2000,        // Check every 2 seconds
      timeout: 300000,        // Wait up to 5 minutes
      onStatusChange: (status) => {
        console.log('Status update:', status.status);
        // Update UI with current status
      }
    });
    
    // Prompt was approved and processed
    console.log('Response:', finalResponse.text);
  } catch (error) {
    if (error.status === 'rejected') {
      console.error('Prompt was rejected:', error.message);
    } else {
      console.error('Error waiting for approval:', error.message);
    }
  }
} else if (response.status === 'completed') {
  // Prompt was auto-approved
  console.log('Response:', response.text);
}
```

### Error Handling

```javascript
try {
  const response = await governLLM.complete({ prompt: '...', userId: 'user123' });
  
  if (response.status === 'pending_review') {
    // Handle review required (see above)
  } else {
    // Auto-approved
    console.log('Response:', response.text);
  }
} catch (error) {
  if (error.status === 'rejected') {
    // Prompt was rejected by governance
    console.error('Prompt rejected:', error.message);
  } else {
    // Network or other error
    console.error('Error:', error.message);
  }
}
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOVERNANCE_API_KEY` | Yes | - | Your API key |
| `GOVERNANCE_API_URL` | No | `https://governance.yourcompany.com` | API endpoint URL |

### Constructor Options

```javascript
const llm = new GovernLLM({
  apiKey: 'your-api-key',        // Override env var
  apiUrl: 'https://custom-url',  // Override env var
  domain: 'financial'            // Default domain for governance
});
```

---

## Response Format

### Success Response (Auto-Approved)

```javascript
{
  status: "completed",
  text: "LLM response text...",
  requestId: "uuid-here",
  metadata: {
    riskLevel: "low" | "medium" | "high",
    riskScore: 0.35,
    governanceProfile: "financial-compliance",
    inputTokens: 150,
    outputTokens: 200,
    totalTokens: 350
  }
}
```

### Review Required Response

```javascript
{
  status: "pending_review",
  requestId: "uuid-here",
  message: "Prompt submitted for human review",
  riskLevel: "high",
  riskScore: 0.85,
  checkStatus: Function,      // Helper: await response.checkStatus()
  waitForApproval: Function    // Helper: await response.waitForApproval(options)
}
```

### Rejected Error

```javascript
{
  message: "Prompt was rejected by governance",
  status: "rejected",
  requestId: "uuid-here"
}
```

---

## Status Polling Methods

### `checkStatus(requestId)`

Manually check the status of a prompt request:

```javascript
const status = await governLLM.checkStatus('request-id-here');
console.log('Status:', status.status); // 'pending_review', 'completed', 'rejected'
console.log('Response:', status.responseText); // Available when completed
```

### `waitForApproval(requestId, options)`

Automatically poll until the prompt is approved or rejected:

```javascript
const response = await governLLM.complete({
  prompt: '...',
  userId: 'user123'
});

if (response.status === 'pending_review') {
  try {
    const finalResponse = await response.waitForApproval({
      interval: 2000,        // Poll every 2 seconds (default)
      timeout: 300000,        // Wait up to 5 minutes (default)
      onStatusChange: (status) => {
        // Called on each poll
        updateUI(status);
      }
    });
    
    // Prompt approved and processed
    console.log('Response:', finalResponse.text);
  } catch (error) {
    if (error.status === 'rejected') {
      console.error('Rejected:', error.message);
    } else {
      console.error('Timeout or error:', error.message);
    }
  }
}
```

## Supported Providers

- `openai` - OpenAI API (GPT-4, GPT-3.5, etc.)
- `anthropic` - Anthropic Claude API
- `custom` - Custom LLM endpoints (VPC, air-gapped)

---

## Troubleshooting

### "GOVERNANCE_API_KEY is required"

**Solution:** Set the environment variable:
```bash
export GOVERNANCE_API_KEY="your-key"
```

### "Fetch is not available"

**Solution (Node.js < 18):** Install node-fetch:
```bash
npm install node-fetch
```

### "Invalid or inactive API key"

**Solution:** 
1. Verify your API key is correct
2. Check if the key has expired
3. Contact support to verify key status

### Network Errors

**Solution:**
1. Verify `GOVERNANCE_API_URL` is correct
2. Check network connectivity
3. Verify firewall rules allow outbound HTTPS

---

## Security Best Practices

1. **Never commit API keys to version control**
   - Use environment variables
   - Use secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)

2. **Rotate API keys regularly**
   - Create new keys via admin portal
   - Update environment variables
   - Revoke old keys

3. **Use different keys for different environments**
   - Separate keys for dev/staging/production
   - Different keys for different services

4. **Monitor key usage**
   - Check last used timestamp
   - Set up alerts for unusual activity

---

## Support

- **Documentation:** https://docs.governance.yourcompany.com
- **Support Email:** support@governance.yourcompany.com
- **Admin Portal:** https://admin.governance.yourcompany.com

---

## Next Steps

1. ✅ Install SDK
2. ✅ Set API key
3. ✅ Update code
4. 📊 Monitor usage in admin portal
5. 🔒 Review governance policies
6. 📈 Optimize based on risk metrics

