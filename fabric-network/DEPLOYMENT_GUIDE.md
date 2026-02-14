# Blockchain Deployment Guide

This guide walks you through deploying the Hyperledger Fabric network and chaincode for the AI Governance Platform.

## Prerequisites

- Docker and Docker Compose installed
- Hyperledger Fabric images (will be pulled automatically)
- Node.js 18+ (for chaincode)

## Quick Deployment

Run the complete deployment script:

```bash
cd fabric-network
chmod +x scripts/*.sh
./scripts/deploy-all.sh
```

This script will:
1. Generate crypto materials (if needed)
2. Generate channel artifacts (if needed)
3. Start the Fabric network
4. Create the governance-channel
5. Setup the wallet for backend
6. Deploy the chaincode

## Manual Deployment Steps

### Step 1: Generate Crypto Materials

```bash
cd fabric-network
./scripts/generate-certs.sh
```

### Step 2: Generate Channel Artifacts

```bash
./scripts/generate-genesis.sh
```

### Step 3: Start Fabric Network

From the project root:

```bash
docker-compose up -d fabric-ca fabric-orderer fabric-peer
```

Or from fabric-network directory:

```bash
docker-compose -f docker-compose.yaml up -d
```

Wait for services to be ready (about 15 seconds).

### Step 4: Create Channel

```bash
cd fabric-network
./scripts/create-channel.sh governance-channel
```

### Step 5: Setup Wallet

```bash
./scripts/setup-wallet-backend.sh
```

This creates a wallet in `fabric-network/wallet/` that the backend can use.

### Step 6: Deploy Chaincode

```bash
./scripts/deploy-chaincode.sh
```

## Verification

### Check Network Status

```bash
docker ps | grep fabric
```

You should see:
- `fabric-ca`
- `fabric-orderer`
- `fabric-peer`

### Check Channel

```bash
docker exec fabric-peer peer channel list
```

Should show `governance-channel`.

### Check Chaincode

```bash
docker exec fabric-peer peer lifecycle chaincode querycommitted -C governance-channel -n governance-ledger
```

Should show the chaincode is committed.

### Test Chaincode

```bash
docker exec fabric-peer peer chaincode invoke \
  -o fabric-orderer:7050 \
  -C governance-channel \
  -n governance-ledger \
  -c '{"function":"InitLedger","Args":[]}'
```

## Backend Integration

The backend is already configured to use the blockchain:

1. **Environment Variables** (in `docker-compose.yml`):
   - `FABRIC_ENABLED=true`
   - `FABRIC_CHANNEL_NAME=governance-channel`
   - `FABRIC_CHAINCODE_NAME=governance-ledger`
   - `FABRIC_CONNECTION_PROFILE=/app/fabric-network/connection-profile.json`
   - `FABRIC_WALLET_PATH=/app/fabric-network/wallet`
   - `FABRIC_USER_ID=Admin@org1.example.com`

2. **Volume Mounts**:
   - `./fabric-network:/app/fabric-network` - Mounts the entire fabric-network directory

3. **What Gets Sent to Blockchain**:
   - ✅ Profile activations (`PROFILE_ACTIVATED`)
   - ✅ Profile archiving (`PROFILE_ARCHIVED`)
   - ✅ Profile exports (`PROFILE_EXPORTED`)
   - ✅ Profile version creation (`PROFILE_VERSION_CREATED`)
   - ✅ Review approvals (`REVIEW_APPROVED`)
   - ✅ Review rejections (`REVIEW_REJECTED`)
   - ✅ Tokenized data storage (`TOKENIZED_DATA_STORED`)

## Troubleshooting

### Chaincode Deployment Fails

1. Check if channel exists:
   ```bash
   docker exec fabric-peer peer channel list
   ```

2. Check if chaincode is already installed:
   ```bash
   docker exec fabric-peer peer lifecycle chaincode queryinstalled
   ```

3. If chaincode is already installed, you may need to increment the version:
   ```bash
   # Edit deploy-chaincode.sh and change CHAINCODE_VERSION to 1.1
   ```

### Backend Can't Connect

1. Check if wallet exists:
   ```bash
   ls -la fabric-network/wallet/Admin@org1.example.com/
   ```

2. Check backend logs:
   ```bash
   docker logs ai-gov-backend | grep -i fabric
   ```

3. Verify connection profile path:
   ```bash
   docker exec ai-gov-backend ls -la /app/fabric-network/connection-profile.json
   ```

### Channel Doesn't Exist

Create it manually:
```bash
cd fabric-network
./scripts/create-channel.sh governance-channel
```

## Accessing Hyperledger Explorer

Once the network is running, access the explorer at:
- URL: http://localhost:8080
- Default credentials: (check explorer configuration)

## Chaincode Functions

The `governance-ledger` chaincode provides:

- `InitLedger()` - Initialize the chaincode
- `StoreLedgerEntry(entityId, action, hashValue, metadataJson)` - Store a ledger entry
- `QueryLedgerEntry(entityId, action)` - Query ledger entries
- `GetAllEntries(entityId)` - Get all entries for an entity

## Next Steps

After deployment:

1. **Test the Integration**:
   - Upload a file (creates tokenized data entry)
   - Approve a review (creates review entry)
   - Export a profile (creates export entry)

2. **Monitor Blockchain**:
   - Check backend logs for blockchain transactions
   - Use Hyperledger Explorer to view transactions
   - Query chaincode to verify entries

3. **Production Considerations**:
   - Use TLS for production
   - Set up proper certificate management
   - Configure multiple peers for redundancy
   - Set up proper backup and recovery

## Files Modified

- `backend/src/services/ledgerService.js` - Now sends ALL entries to blockchain
- `backend/src/services/fabricService.js` - Fabric SDK integration
- `fabric-network/chaincode/governance-ledger/` - Chaincode implementation
- `fabric-network/scripts/deploy-chaincode.sh` - Deployment script
- `fabric-network/scripts/setup-wallet-backend.sh` - Wallet setup script




