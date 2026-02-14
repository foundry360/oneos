# Blockchain Export Integration

## Status

✅ **Fabric Service Created**: `backend/src/services/fabricService.js`
✅ **Ledger Service Updated**: Now calls Fabric service for blockchain writes
✅ **Connection Profile Created**: `fabric-network/connection-profile.json`

## What Was Fixed

The export function was only saving to the PostgreSQL database, not to the blockchain. Now it:

1. **Saves to Database** (as before) - for quick queries
2. **Saves to Blockchain** (NEW) - for immutable audit trail

## Next Steps to Enable Blockchain

### 1. Install Fabric SDK Dependencies

```bash
docker exec ai-gov-backend npm install fabric-network fabric-ca-client
```

Or rebuild the backend container:

```bash
docker-compose build backend
docker-compose restart backend
```

### 2. Deploy Chaincode

You need to deploy a chaincode (smart contract) to the `governance-channel`. The chaincode should have:

- `StoreLedgerEntry(entityId, action, hashValue, metadataJson)` - Store a ledger entry
- `QueryLedgerEntry(entityId, action)` - Query a ledger entry

**Quick Deploy Script** (create `fabric-network/scripts/deploy-chaincode.sh`):

```bash
#!/bin/bash
CHANNEL_NAME=governance-channel
CHAINCODE_NAME=governance-ledger
CHAINCODE_VERSION=1.0
CHAINCODE_PATH=github.com/governance-ledger

# Package chaincode
peer lifecycle chaincode package ${CHAINCODE_NAME}.tar.gz \
  --path ${CHAINCODE_PATH} \
  --lang node \
  --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION}

# Install chaincode
peer lifecycle chaincode install ${CHAINCODE_NAME}.tar.gz

# Approve chaincode
peer lifecycle chaincode approveformyorg \
  -o fabric-orderer:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CHAINCODE_NAME} \
  --version ${CHAINCODE_VERSION} \
  --package-id <PACKAGE_ID> \
  --sequence 1

# Commit chaincode
peer lifecycle chaincode commit \
  -o fabric-orderer:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CHAINCODE_NAME} \
  --version ${CHAINCODE_VERSION} \
  --sequence 1 \
  --peerAddresses fabric-peer:7051
```

### 3. Set Environment Variables

Add to `docker-compose.yml` backend service:

```yaml
environment:
  - FABRIC_ENABLED=true
  - FABRIC_CHANNEL_NAME=governance-channel
  - FABRIC_CHAINCODE_NAME=governance-ledger
  - FABRIC_CONNECTION_PROFILE=/app/fabric-network/connection-profile.json
  - FABRIC_WALLET_PATH=/app/fabric-network/wallet
  - FABRIC_USER_ID=Admin@org1.example.com
```

### 4. Create Wallet

The wallet needs to contain the Admin user's identity. You can:

1. **Use existing crypto materials** (if already generated)
2. **Enroll Admin user** via Fabric CA

**Enroll Admin**:

```bash
docker exec fabric-ca fabric-ca-client enroll \
  -u http://admin:adminpw@fabric-ca:7054 \
  -M /tmp/wallet/Admin@org1.example.com
```

### 5. Test Export

Once everything is set up:

1. Export a profile from the UI
2. Check backend logs for: `"Export ledger entry stored on blockchain"`
3. View transaction in Hyperledger Explorer: http://localhost:8080

## Current Behavior

- ✅ **Database**: Always saves (works now)
- ⚠️ **Blockchain**: Only saves if `FABRIC_ENABLED=true` AND chaincode is deployed
- ⚠️ **If blockchain fails**: Export still succeeds (non-fatal error)

## Troubleshooting

### Error: "Fabric is not available or not enabled"
- Check `FABRIC_ENABLED=true` in environment
- Check connection profile path is correct

### Error: "User does not exist in wallet"
- Create wallet directory: `mkdir -p fabric-network/wallet`
- Enroll Admin user via Fabric CA
- Copy Admin certificates to wallet

### Error: "Chaincode not found"
- Deploy chaincode to `governance-channel`
- Check chaincode name matches `FABRIC_CHAINCODE_NAME`

### Error: "Channel not found"
- Ensure `governance-channel` exists
- Run: `./fabric-network/scripts/create-channel.sh governance-channel`

## Files Modified

1. `backend/src/services/fabricService.js` - NEW: Fabric SDK integration
2. `backend/src/services/ledgerService.js` - UPDATED: Calls Fabric service
3. `backend/package.json` - UPDATED: Added Fabric SDK dependencies
4. `fabric-network/connection-profile.json` - NEW: Backend connection profile




