# Customer Installation - Quick Start

## Overview

Customers receive a vendor API key during onboarding and enter it during installation. The key is validated against vendor records (Supabase) and stored in the customer's database.

## Installation Process

### 1. Receive Vendor API Key

You will receive your API key from the vendor:
- Format: `gov_abc123def4567890abcdef1234567890`
- Delivered via: Email, vendor portal, or secure channel

### 2. Run Installation Script

**Linux/Mac:**
```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

**Windows:**
```powershell
.\scripts\install.ps1
```

### 3. Enter API Key

When prompted, enter your vendor API key:
```
Enter your vendor API key: gov_abc123...
```

### 4. Installation Completes

The script will:
- ✅ Validate API key with vendor
- ✅ Create customer account
- ✅ Store API key securely
- ✅ Generate installation ID
- ✅ Save configuration to `.env`

## Configuration

After installation, your `.env` file contains:

```env
VENDOR_API_KEY=gov_abc123...
INSTALLATION_ID=inst_abc123...
CUSTOMER_CODE=YOUR-CODE
```

## Using the API Key

All of your end-users will use the same API key via the SDK:

```javascript
const { governLLM } = require('./govern-llm.js');

const response = await governLLM.complete({
  prompt: 'Your prompt',
  userId: 'employee-123',  // Your internal user ID
  model: 'gpt-4'
});
```

The SDK automatically uses `VENDOR_API_KEY` from your environment.

## Verification

Check installation status:

```bash
curl http://localhost:3001/api/installation/status
```

## Troubleshooting

**"Invalid API key"**
- Verify key is correct
- Check key hasn't been revoked
- Ensure vendor API is accessible

**"Vendor API unavailable"**
- Check network connectivity
- Verify `VENDOR_API_URL` is correct
- Contact vendor support

## Support

For installation issues:
- Email: support@yourcompany.com
- Documentation: https://docs.yourcompany.com


