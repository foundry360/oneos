# Customer Installation Guide

This guide explains how customers install and configure the AI Governance Platform using their vendor-provided API key.

## Prerequisites

- Vendor API key (provided during onboarding)
- Backend server running
- Database configured and accessible
- Node.js and npm installed

## Installation Process

### Step 1: Receive Vendor API Key

You will receive your vendor API key via:
- Email from vendor
- Vendor portal
- Secure delivery method

**Example API key format:** `gov_abc123def4567890abcdef1234567890`

⚠️ **Important:** Save this API key securely. You'll need it during installation.

### Step 2: Run Installation Script

#### Option A: Linux/Mac (Bash)

```bash
# Make script executable
chmod +x scripts/install.sh

# Run installation
./scripts/install.sh
```

#### Option B: Windows (PowerShell)

```powershell
# Run installation
.\scripts\install.ps1
```

#### Option C: Manual Installation

If you prefer to install manually:

```bash
# Validate API key
curl -X POST http://localhost:3001/api/installation/validate-key \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "gov_your_api_key_here"
  }'
```

### Step 3: Installation Script Process

The installation script will:

1. **Check API connectivity** - Verifies backend is running
2. **Prompt for API key** - Enter your vendor API key
3. **Validate with vendor** - Validates key against vendor records
4. **Create customer account** - Sets up your account in the database
5. **Store API key** - Saves validated key securely
6. **Generate installation ID** - Creates unique installation identifier
7. **Save configuration** - Updates `.env` file with credentials

### Step 4: Verify Installation

Check installation status:

```bash
curl http://localhost:3001/api/installation/status
```

**Expected Response:**
```json
{
  "installed": true,
  "hasApiKey": true,
  "customer": {
    "id": "customer-uuid",
    "customerName": "Your Company",
    "customerCode": "YOUR-CODE",
    "status": "active",
    "installationId": "inst_abc123..."
  }
}
```

## Configuration

After installation, your `.env` file will contain:

```env
# Vendor API Key (validated during installation)
VENDOR_API_KEY=gov_abc123def4567890abcdef1234567890

# Installation ID
INSTALLATION_ID=inst_abc123...

# Customer Code
CUSTOMER_CODE=YOUR-CODE
```

## Using the API Key

### With SDK

Your end-users will use the API key with the SDK:

```javascript
const { governLLM } = require('./govern-llm.js');

// SDK uses VENDOR_API_KEY from environment
const response = await governLLM.complete({
  prompt: 'Your prompt here',
  userId: 'employee-123',  // Your internal user ID
  model: 'gpt-4'
});
```

### With Direct API Calls

```bash
curl -X POST http://localhost:3001/api/llm/prompt \
  -H "X-API-Key: gov_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Your prompt",
    "userId": "employee-123",
    "modelName": "gpt-4"
  }'
```

## Troubleshooting

### "API key is required"

**Solution:** Ensure `VENDOR_API_KEY` is set in your `.env` file or provided in the request.

### "Invalid API key"

**Possible causes:**
- API key is incorrect
- API key has been revoked
- API key has expired
- Vendor API is unreachable

**Solution:**
1. Verify API key is correct (check for typos)
2. Contact vendor to verify key status
3. Check network connectivity to vendor API

### "Vendor API unavailable"

**Possible causes:**
- Vendor API server is down
- Network connectivity issues
- Firewall blocking requests

**Solution:**
1. Check vendor API status page
2. Verify network connectivity
3. Check firewall rules
4. Contact vendor support

### "API key already registered"

**Solution:** This means the API key was already validated. Your installation is complete. You can check status with:

```bash
curl http://localhost:3001/api/installation/status
```

## Environment Variables

### Required

- `VENDOR_API_URL` - Vendor API endpoint (default: Supabase URL)
- `VENDOR_API_KEY` - Vendor API authentication key (for validation)

### Optional

- `INSTALLATION_URL` - Your installation URL (for vendor tracking)
- `API_URL` - Your backend API URL (default: http://localhost:3001)

## Security Best Practices

1. **Never commit API keys to version control**
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Rotate keys if compromised**
   - Contact vendor to revoke old key
   - Request new key
   - Re-run installation with new key

3. **Use secure storage**
   - Store keys in secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Use encrypted environment variables in production

4. **Monitor key usage**
   - Check logs for unauthorized access
   - Set up alerts for unusual activity

## Next Steps

After installation:

1. ✅ Verify installation status
2. ✅ Test API key with SDK
3. ✅ Configure governance profiles
4. ✅ Set up end-user authentication
5. ✅ Deploy to production

## Support

If you encounter issues during installation:

- **Email:** support@yourcompany.com
- **Documentation:** https://docs.yourcompany.com
- **Vendor Portal:** https://portal.yourcompany.com


