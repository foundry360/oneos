# Timeboxed License Key System

## Overview

The license system uses timeboxed license keys that expire 12 months from activation. License keys are validated against an internal hash list stored in the database (managed from UI) or environment variables (for initial setup). No external API calls are required, making it suitable for VPC and air-gapped deployments.

## How It Works

### 1. License Key Generation (Internal System)

In your internal license management system:
1. Generate a license key (e.g., `LIC-ABC-123-XYZ-789`)
2. Hash it using SHA-256: `57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498`
3. Store the hash in your internal system

### 2. Adding License Keys (Two Methods)

#### Method 1: UI Management (Recommended - No Restart Required)

**From the Settings UI (Admin only):**
1. Open Settings drawer
2. Scroll to "Manage License Keys" section
3. Click "Show" to expand
4. Click "Add License Key"
5. Enter the plain text license key (e.g., `LIC-ABC-123-XYZ-789`)
6. Optionally add a description
7. Click "Add"

The license key will be hashed and stored in the database immediately. **No restart required!**

#### Method 2: Environment Variables (Initial Setup)

Before deploying to VPC/localhost, you can optionally add license key hashes to environment variables:

**Localhost (.env file):**
```env
VALID_LICENSE_KEY_HASHES=57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498,another_hash_here
```

**VPC (Environment Variables):**
- Kubernetes: ConfigMap or Secret
- Docker: Environment variable in deployment config
- Cloud platforms: Environment variables in deployment settings

**Note:** Environment variables are checked first, then the database. Both methods work together.

### 3. Activation (UI)

1. Admin user opens Settings drawer
2. Clicks "Activate License Key" button
3. Enters the **plain text license key** (e.g., `LIC-ABC-123-XYZ-789`)
4. Backend validates:
   - Hashes the entered key
   - Checks if hash exists in `VALID_LICENSE_KEY_HASHES`
   - If valid: Sets `activated_at = NOW()` and `expires_at = activated_at + 12 months`
   - Stores in database

### 4. Managing License Keys (Admin UI)

Admins can manage license keys from the Settings UI:

**View All License Keys:**
- Open Settings → "Manage License Keys" → Click "Show"
- See all configured license key hashes with descriptions and creation dates

**Add New License Key:**
- Click "Add License Key" button
- Enter plain text license key
- Optionally add description
- Click "Add" - hash is calculated and stored immediately

**Remove License Key:**
- Click "Remove" button next to any license key
- Confirm removal
- License key will no longer be valid for activation

**Benefits:**
- ✅ No restart required
- ✅ Works in VPC/air-gapped environments
- ✅ No need to modify environment variables
- ✅ Can be managed by non-technical admins

### 5. License Check

The middleware checks on every API request:
- If `expires_at < NOW()` → Block access with "License expired" error
- If `expires_at >= NOW()` → Allow access

## Database Schema

### customer_api_keys table
- `activated_at` (TIMESTAMP) - When license was activated
- `expires_at` (TIMESTAMP) - 12 months from activation
- `api_key_hash` (VARCHAR) - SHA-256 hash of the license key
- `is_active` (BOOLEAN) - Whether license is active

### valid_license_keys table (NEW)
- `id` (UUID) - Primary key
- `license_key_hash` (VARCHAR(64)) - SHA-256 hash of the license key
- `description` (TEXT) - Optional description
- `is_active` (BOOLEAN) - Whether the hash is active
- `created_at` (TIMESTAMP) - When it was added
- `created_by` (UUID) - User who added it (optional)

## Helper Scripts

### Generate License Key Hash

```bash
node scripts/generate-license-key-hash.js "LIC-ABC-123-XYZ-789"
```

Output:
```
License Key Hash Generator
============================================================

License Key 1:
  Key:    LIC-ABC-123-XYZ-789
  Hash:   57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498

============================================================

Add to VALID_LICENSE_KEY_HASHES environment variable:
VALID_LICENSE_KEY_HASHES=57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498
```

## API Endpoints

### GET /api/license-keys (Admin only)
Get all valid license key hashes from the database.

**Response:**
```json
{
  "success": true,
  "licenseKeys": [
    {
      "id": "uuid",
      "hash": "57f508f3f5a3087e45c75cb364dcb69f79ca1d7307130c756e104f037e8da498",
      "hashPrefix": "57f508f3f5a3087...",
      "description": "Customer ABC License",
      "createdAt": "2026-02-16T20:00:00.000Z"
    }
  ],
  "count": 1
}
```

### POST /api/license-keys (Admin only)
Add a new license key hash to the database.

**Request:**
```json
{
  "licenseKey": "LIC-ABC-123-XYZ-789",
  "description": "Customer ABC License"
}
```

**Response:**
```json
{
  "success": true,
  "message": "License key hash added successfully",
  "hashPrefix": "57f508f3f5a3087...",
  "id": "uuid"
}
```

### DELETE /api/license-keys/:hash (Admin only)
Remove/deactivate a license key hash.

**Response:**
```json
{
  "success": true,
  "message": "License key hash removed successfully"
}
```

### POST /api/installation/validate-key
Activates a license key.

**Request:**
```json
{
  "apiKey": "LIC-ABC-123-XYZ-789"
}
```

**Response:**
```json
{
  "valid": true,
  "customerId": "uuid",
  "customerCode": "CUSTOMER-XXXX",
  "customerName": "Customer",
  "installationId": "inst_xxxxx",
  "activatedAt": "2026-02-16T20:00:00.000Z",
  "expiresAt": "2027-02-16T20:00:00.000Z",
  "message": "License key activated successfully. Valid for 12 months."
}
```

### GET /api/installation/status
Gets current license status.

**Response:**
```json
{
  "installed": true,
  "hasApiKey": true,
  "customer": {
    "id": "uuid",
    "customerName": "Customer",
    "customerCode": "CUSTOMER-XXXX",
    "status": "active",
    "installationId": "inst_xxxxx"
  },
  "license": {
    "activatedAt": "2026-02-16T20:00:00.000Z",
    "expiresAt": "2027-02-16T20:00:00.000Z",
    "isExpired": false,
    "daysRemaining": 365,
    "licenseType": "timeboxed"
  }
}
```

## Migrations

Run both database migrations:

**1. Add activated_at column:**
```bash
psql -h localhost -U aigov -d ai_governance -f db/migrations/add_activated_at_to_customer_api_keys.sql
```

**2. Create valid_license_keys table:**
```bash
psql -h localhost -U aigov -d ai_governance -f db/migrations/create_valid_license_keys_table.sql
```

Or for Docker:
```bash
docker exec -i ai-gov-postgres psql -U aigov -d ai_governance < db/migrations/add_activated_at_to_customer_api_keys.sql
docker exec -i ai-gov-postgres psql -U aigov -d ai_governance < db/migrations/create_valid_license_keys_table.sql
```

## Security Notes

- Only license key **hashes** are stored in environment variables (never plain keys)
- License keys are hashed before validation (never stored in plain text)
- Works offline - no external API calls required
- Suitable for VPC and air-gapped deployments

## Troubleshooting

### "License key not found in valid keys list"
- Check that `VALID_LICENSE_KEY_HASHES` is set in environment variables
- Verify the hash matches the license key (use `generate-license-key-hash.js`)
- Ensure hashes are comma-separated with no spaces

### "License expired"
- License has passed its 12-month expiration date
- Contact support to generate a new license key

### License not activating
- Check backend logs for validation errors
- Verify database migration was run (`activated_at` column exists)
- Ensure `VALID_LICENSE_KEY_HASHES` contains the correct hash

