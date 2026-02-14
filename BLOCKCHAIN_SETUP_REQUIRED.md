# Blockchain Setup Required

## Issue

Profile exports are not being written to the blockchain because the Fabric network is not fully set up.

## Current Status

- ✅ Fabric containers are running (fabric-ca, fabric-orderer, fabric-peer)
- ❌ Crypto materials not generated
- ❌ Wallet not set up
- ❌ Chaincode not deployed

## Quick Fix - Run Setup Scripts

### Option 1: Use the Master Deployment Script (Recommended)

```bash
cd fabric-network
chmod +x scripts/*.sh
./scripts/deploy-all.sh
```

### Option 2: Manual Setup

1. **Generate Crypto Materials**:
   ```bash
   cd fabric-network
   ./scripts/generate-certs.sh
   ```

2. **Generate Channel Artifacts**:
   ```bash
   ./scripts/generate-genesis.sh
   ```

3. **Create Channel**:
   ```bash
   ./scripts/create-channel.sh governance-channel
   ```

4. **Setup Wallet**:
   ```bash
   ./scripts/setup-wallet-backend.sh
   ```

5. **Deploy Chaincode**:
   ```bash
   ./scripts/deploy-chaincode.sh
   ```

6. **Restart Backend**:
   ```bash
   docker-compose restart backend
   ```

## Verify Setup

After setup, verify:

```bash
# Check wallet exists
docker exec ai-gov-backend ls -la /app/fabric-network/wallet/Admin@org1.example.com/

# Check connection profile
docker exec ai-gov-backend cat /app/fabric-network/connection-profile.json

# Test export again - should see "Export ledger entry stored on blockchain" in logs
docker logs ai-gov-backend -f | grep blockchain
```

## Expected Log Messages

After setup, when you export a profile, you should see:
- ✅ `Export ledger entry stored in database`
- ✅ `Export ledger entry stored on blockchain` (NEW - this is what's missing)

Instead of:
- ❌ `Fabric blockchain not available, entry stored in database only`

## Troubleshooting

### If wallet setup fails:
- Make sure crypto materials exist: `ls -la fabric-network/crypto-config/`
- If missing, run: `./scripts/generate-certs.sh`

### If chaincode deployment fails:
- Check channel exists: `docker exec fabric-peer peer channel list`
- If missing, run: `./scripts/create-channel.sh governance-channel`

### If backend still can't connect:
- Check environment variables: `docker exec ai-gov-backend printenv | grep FABRIC`
- Verify volume mount: `docker inspect ai-gov-backend | grep fabric-network`
- Restart backend: `docker-compose restart backend`




