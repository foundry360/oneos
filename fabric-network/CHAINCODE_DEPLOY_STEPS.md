# Step-by-Step Chaincode Deployment

## ✅ Step 1: Fix Admin MSP (COMPLETED)
The Admin MSP structure has been set up at `/etc/hyperledger/fabric/users/Admin@org1.example.com/msp/`

## Step 2: Install Chaincode

Run this command:

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger.tar.gz"
```

**If you get "broken pipe" error:**
- This is a Docker connectivity issue
- Try: Restart Docker Desktop (if on Windows)
- Or: Restart the peer container: `docker restart fabric-peer`
- Then retry the install command

**If installation succeeds**, you'll see: `Package ID: governance-ledger_1.0:abc123...`

## Step 3: Get Package ID

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled"
```

Copy the Package ID (looks like: `governance-ledger_1.0:abc123def456...`)

## Step 4: Approve Chaincode

Replace `<PACKAGE_ID>` with the actual ID from Step 3:

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --package-id <PACKAGE_ID> --sequence 1"
```

## Step 5: Commit Chaincode

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051"
```

## Step 6: Verify

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted -C governance-channel -n governance-ledger"
```

## Troubleshooting Docker "Broken Pipe" Error

If Step 2 keeps failing with "broken pipe":

1. **Check Docker is running:**
   ```powershell
   docker ps
   ```

2. **Restart Docker Desktop** (if on Windows)

3. **Restart peer container:**
   ```powershell
   docker restart fabric-peer
   ```

4. **Wait 10 seconds**, then retry Step 2

5. **Check Docker logs:**
   ```powershell
   docker logs fabric-peer --tail 50
   ```

The MSP structure is now correct - the issue is just the Docker build process.



