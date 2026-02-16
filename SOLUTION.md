# Chaincode Explorer Fix

## Issue
Hyperledger Explorer shows 0 chaincodes even though chaincode container is running.

## Root Cause
1. Orderer is crashing (panic in logs)
2. Chaincode is not committed to the channel (querycommitted returns empty)
3. Explorer needs to sync with the blockchain to discover chaincodes

## Quick Fix Applied
1. Fixed chaincode shim interface (getArgs instead of getFunctionAndParameters)
2. Increased connection timeouts
3. Restarted Explorer to force re-sync

## If Explorer Still Shows 0

The chaincode needs to be committed to the channel. The orderer must be running for this. 

**To fix orderer:**
1. Check if genesis block exists: `docker exec fabric-orderer ls -la /var/hyperledger/orderer/channel-artifacts/`
2. If missing, regenerate channel artifacts
3. Restart orderer: `docker restart fabric-orderer`

**Then deploy chaincode:**
```bash
node backend/fix-chaincode-now.js
```

**Or manually:**
```bash
# Approve (if orderer is working)
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051 --waitForEvent=false"

# Commit
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051 --waitForEvent=false"
```

## Verify
```bash
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted --channelID governance-channel"
```

If this shows `governance-ledger`, Explorer should pick it up after restart.





