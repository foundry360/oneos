# Supabase Realtime Subscription Setup

## Overview

The application now uses Supabase Realtime subscriptions to receive license status updates from your internal license management system. This replaces the unreliable webhook approach and provides real-time synchronization.

## How It Works

1. **Realtime Subscription**: Listens to `vendor_api_keys` table changes in Supabase
2. **Status Updates**: When `status` changes, the subscription receives the update
3. **Database Sync**: Updates local PostgreSQL `customer_accounts` and `customer_api_keys` tables
4. **Automatic Reconnection**: Handles connection errors and reconnects automatically

## Configuration

### Required Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration (Internal License System)
SUPABASE_VENDOR_URL=https://your-internal-license-system.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Or use these if already configured:
SUPABASE_URL=https://your-internal-license-system.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

**Note**: The service uses `SUPABASE_VENDOR_URL` first, then falls back to `SUPABASE_URL`. The key can be either `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_KEY` (anon key is sufficient for read-only Realtime subscriptions).

### Supabase Setup

1. **Enable Realtime** on `vendor_api_keys` table:

   **Method 1: Using Supabase Dashboard (Recommended)**
   - Go to Supabase Dashboard → Database → Replication
   - Find `vendor_api_keys` table in the list
   - Toggle "Enable Realtime" to ON" (toggle switch)
   - Or click the table name and enable Realtime in the table settings

   **Method 2: Using SQL (if publication exists)**
   ```sql
   -- First, check if the publication exists
   SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
   
   -- If it exists, add the table
   ALTER PUBLICATION supabase_realtime ADD TABLE vendor_api_keys;
   ```

   **Method 3: Create publication if it doesn't exist**
   ```sql
   -- Create the publication if it doesn't exist
   CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
   
   -- Or create it just for specific tables
   CREATE PUBLICATION supabase_realtime FOR TABLE vendor_api_keys;
   ```

   **Note**: The Dashboard method is preferred as it handles all the necessary setup automatically.

2. **Verify Table Structure**:
   - Table: `vendor_api_keys`
   - Required columns: `id`, `api_key_hash`, `status`
   - Status values: `active`, `inactive`, `revoked`, `expired`

## Status Mapping

| Supabase Status | `customer_accounts.status` | `customer_api_keys.is_active` |
|----------------|---------------------------|------------------------------|
| `active`       | `active`                  | `true`                        |
| `inactive`    | `inactive`                | `false`                       |
| `revoked`     | `inactive`                | `false`                       |
| `expired`     | `inactive`                | `false`                       |

## How to Test

1. **Start the backend server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Check logs** for subscription status:
   - Look for: `✅ Realtime subscription active - listening for license status changes`
   - If you see: `Realtime subscription not started - Supabase not configured`, check your environment variables

3. **Test status change**:
   - In Supabase, update `vendor_api_keys.status` from `inactive` to `active`
   - Check backend logs - you should see:
     ```
     Received Realtime update
     License status updated via Realtime subscription
     ```
   - Verify database:
     ```bash
     cd backend
     node scripts/check-api-key-hash.js
     ```
     Should show: `Status: active`, `Is Active: true`

4. **Test all status values**:
   - Change to `active` → should update to active
   - Change to `inactive` → should update to inactive
   - Change to `revoked` → should update to inactive
   - Change to `expired` → should update to inactive

## Monitoring

### Check Subscription Status

The subscription automatically:
- Reconnects on connection errors
- Logs all status changes
- Handles errors gracefully (won't crash the app)

### Log Messages

**Success**:
- `✅ Realtime subscription active - listening for license status changes`
- `License status updated via Realtime subscription`

**Warnings**:
- `Realtime subscription not started - Supabase not configured`
- `Customer not found for license key hash`
- `Status unchanged, skipping update`

**Errors**:
- `Failed to start Realtime subscription`
- `Error processing Realtime update`
- `Failed to update license status`

## Troubleshooting

### Subscription Not Starting

1. **Check environment variables**:
   ```bash
   # Verify they're set
   echo $SUPABASE_VENDOR_URL
   echo $SUPABASE_ANON_KEY
   ```

2. **Check Supabase Realtime is enabled**:
   - Dashboard → Database → Replication
   - Ensure `vendor_api_keys` is enabled

3. **Check logs** for specific error messages

### Updates Not Processing

1. **Verify `api_key_hash` matches**:
   - The hash in Supabase must match the hash in your local `customer_api_keys` table
   - Check: `node scripts/check-api-key-hash.js`

2. **Check subscription is active**:
   - Look for `✅ Realtime subscription active` in logs

3. **Verify status actually changed**:
   - The subscription only processes updates where status changes
   - If status is the same, it will skip the update

### Connection Issues

The service automatically:
- Attempts reconnection up to 10 times
- Waits 5 seconds between attempts
- Logs all reconnection attempts

If reconnection fails:
- Check Supabase URL and key are correct
- Verify network connectivity
- Check Supabase service status

## Architecture

```
┌─────────────────────┐
│  Supabase Database  │
│  vendor_api_keys    │
│  (Internal System)  │
└──────────┬──────────┘
           │
           │ Realtime Subscription
           │ (WebSocket)
           ▼
┌─────────────────────┐
│  Control Plane App  │
│  Realtime Service   │
└──────────┬──────────┘
           │
           │ Update
           ▼
┌─────────────────────┐
│  PostgreSQL         │
│  customer_accounts  │
│  customer_api_keys  │
└─────────────────────┘
```

## Benefits Over Webhooks

✅ **More Reliable**: WebSocket connection is persistent  
✅ **Real-time**: Updates received immediately  
✅ **Automatic Reconnection**: Handles network issues  
✅ **No Tunnel Required**: Direct connection to Supabase  
✅ **Works for All Status Changes**: Not dependent on webhook configuration  

## Migration from Webhooks

The webhook endpoint (`/api/webhooks/license-status`) is still available but the Realtime subscription is the primary method. You can:
- Keep webhooks as a backup
- Remove webhooks once Realtime is confirmed working
- Use both simultaneously (updates will be idempotent)

