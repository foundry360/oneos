# Complete Chaincode Deployment Steps

## Current Status

✅ **Chaincode installed** - Package ID: `governance-ledger_1.0:ac34f12ef3bdc15262c1da43313a5364f8d9eae2e857e857bc3bd8d6267e9932`  
✅ **Channel created** - `governance-channel` exists  
✅ **Peer joined** - Peer is on the channel  
✅ **Orderer running** - Orderer is up  
⏳ **Approval/Commit** - Transactions timing out, need to complete  

## Complete Deployment Commands

Run these in **WSL2 Ubuntu**:

```bash
# 1. Open WSL2
wsl -d Ubuntu-22.04
cd /mnt/c/OneOS

# 2. Approve chaincode (with longer timeout)
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --ordererTLSHostnameOverride orderer.example.com --channelID governance-channel --name governance-ledger --version 1.0 --package-id governance-ledger_1.0:ac34f12ef3bdc15262c1da43313a5364f8d9eae2e857e857bc3bd8d6267e9932 --sequence 1 --tls --cafile /etc/hyperledger/fabric/tls/orderer-tls-ca.crt --waitForEventTimeout 120s"

# 3. Check approval status
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode checkcommitreadiness -C governance-channel -n governance-ledger --version 1.0 --sequence 1"

# 4. Commit chaincode (once approval shows true)
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --ordererTLSHostnameOverride orderer.example.com --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051 --tls --cafile /etc/hyperledger/fabric/tls/orderer-tls-ca.crt --waitForEventTimeout 120s"

# 5. Verify deployment
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted -C governance-channel -n governance-ledger"
```

## How to Access Blockchain

### From Windows (Your Main Environment)

1. **Web UI (Explorer)**: http://localhost:8080
2. **Backend API**: http://localhost:3001 (connects to Fabric at localhost:7051)
3. **Frontend**: http://localhost:3000

### From WSL2 Ubuntu (For CLI Operations)

```bash
# Query chaincode
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer chaincode query -C governance-channel -n governance-ledger -c '{\"function\":\"GetAllEntries\",\"Args\":[\"entity-id\"]}'"

# Invoke chaincode
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer chaincode invoke -o fabric-orderer:7050 --ordererTLSHostnameOverride orderer.example.com -C governance-channel -n governance-ledger -c '{\"function\":\"StoreLedgerEntry\",\"Args\":[\"test-id\",\"TEST_ACTION\",\"hash123\",\"{}\"]}' --tls --cafile /etc/hyperledger/fabric/tls/orderer-tls-ca.crt"
```

## Troubleshooting

If approval/commit times out:
1. Check orderer logs: `docker logs fabric-orderer --tail 50`
2. Check peer logs: `docker logs fabric-peer --tail 50`
3. Verify channel height: `peer channel getinfo -c governance-channel`
4. Try with longer timeout: `--waitForEventTimeout 120s`

## Summary

- ✅ **Chaincode installed** - Main achievement!
- ✅ **Services running** - All Fabric services up
- ⏳ **Final steps** - Just need approval/commit to complete

The hardest part (installation) is done! 🎉



