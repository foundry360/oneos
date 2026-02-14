# Chaincode Deployment Status

## Current Progress

✅ **Completed:**
- Fabric services are running in WSL2 (CA, Orderer, Peer)
- Channel `governance-channel` exists
- Peer is joined to the channel
- Chaincode Docker image built successfully
- Backend can connect to Fabric services via `host.docker.internal`
- Connection profile updated for hybrid setup

⚠️ **In Progress:**
- Chaincode service container needs to start properly
- Chaincode needs to be approved and committed to channel

## Next Steps to Complete Deployment

### Option 1: Fix Chaincode Service and Deploy as External Chaincode

1. **Start all services:**
```bash
wsl -d Ubuntu-22.04
cd /mnt/c/OneOS
docker-compose -f docker-compose.fabric.yml down
docker-compose -f docker-compose.fabric.yml up -d
```

2. **Verify chaincode service is running:**
```bash
docker logs chaincode-governance-ledger
docker ps | grep chaincode
```

3. **If chaincode service is running, approve and commit:**
```bash
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false

# Approve
peer lifecycle chaincode approveformyorg \
  -o fabric-orderer:7050 \
  --channelID governance-channel \
  --name governance-ledger \
  --version 1.0 \
  --sequence 1 \
  --package-id governance-ledger_1.0:external

# Commit
peer lifecycle chaincode commit \
  -o fabric-orderer:7050 \
  --channelID governance-channel \
  --name governance-ledger \
  --version 1.0 \
  --sequence 1
"
```

### Option 2: Use Regular Node Chaincode (Simpler)

Since we're in WSL2 now, the Docker build should work. Try installing as regular node chaincode:

```bash
# Package chaincode
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false
peer lifecycle chaincode package /tmp/governance-ledger.tar.gz \
  --path /opt/gopath/src/github.com/governance-ledger \
  --lang node \
  --label governance-ledger_1.0
"

# Install
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false
peer lifecycle chaincode install /tmp/governance-ledger.tar.gz
"

# Get package ID from install output, then approve and commit
```

## Verification

Once deployed, verify with:

```bash
# Check from backend
cd C:\OneOS\backend
node check-chaincode-status.js

# Or check in UI
# Open http://localhost:3000/blockchain
```

## Files Created

- `fabric-network/deploy-chaincode.sh` - Full deployment script
- `fabric-network/deploy-external-chaincode.sh` - External chaincode deployment
- `fabric-network/simple-deploy.sh` - Simplified deployment
- `fabric-network/final-deploy.sh` - Final deployment attempt
- `backend/check-chaincode-status.js` - Status checking script

## Current Blockers

1. **Chaincode service container** - Needs to start and stay running
2. **Package ID** - Need to get the correct package ID for approval
3. **Channel verification** - Channel may need to be recreated after service restarts

## Quick Test

After deployment, test with a transaction:

```bash
# From backend container or locally
# This will create a blockchain transaction
curl -X POST http://localhost:3001/api/governance-profiles/{profileId}/export
```

Then check transactions at: http://localhost:3000/blockchain


