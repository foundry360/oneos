# Simple Chaincode Deployment Instructions

## Current Status
✅ Wallet identity fixed - Backend can connect to Fabric  
✅ Channel exists - governance-channel is ready  
❌ Chaincode needs deployment

## The Issue
The peer needs an Admin identity (OU=admin) to deploy chaincode, but the default peer MSP doesn't have admin privileges.

## Quick Solution: Run the Deployment Script

The easiest way is to use the existing deployment script. It expects the Admin user at `/etc/hyperledger/fabric/users/Admin@org1.example.com/msp`.

### Step 1: Set Up Admin User Directory in Peer

Run this command to create the Admin user MSP structure:

```powershell
docker exec fabric-peer sh -c "mkdir -p /etc/hyperledger/fabric/users/Admin@org1.example.com/msp/{signcerts,keystore,admincerts,cacerts} && cp /etc/hyperledger/fabric/msp/admincerts/Admin@org1.example.com-cert.pem /etc/hyperledger/fabric/users/Admin@org1.example.com/msp/signcerts/ && cp /etc/hyperledger/fabric/msp/admincerts/Admin@org1.example.com-cert.pem /etc/hyperledger/fabric/users/Admin@org1.example.com/msp/admincerts/ && find /etc/hyperledger/fabric/msp/keystore -name '*_sk' -exec cp {} /etc/hyperledger/fabric/users/Admin@org1.example.com/msp/keystore/ \; && cp /etc/hyperledger/fabric/msp/cacerts/*.pem /etc/hyperledger/fabric/users/Admin@org1.example.com/msp/cacerts/ && cp /etc/hyperledger/fabric/msp/config.yaml /etc/hyperledger/fabric/users/Admin@org1.example.com/msp/ && echo 'Done'"
```

### Step 2: Run Deployment Script

From the `fabric-network` directory:

```powershell
cd fabric-network
docker exec fabric-peer bash -c "cd /etc/hyperledger/fabric && bash -c 'export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger.tar.gz'"
```

### Step 3: Get Package ID

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled"
```

Copy the Package ID (looks like: `governance-ledger_1.0:abc123...`)

### Step 4: Approve Chaincode

Replace `<PACKAGE_ID>` with the ID from Step 3:

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --package-id <PACKAGE_ID> --sequence 1"
```

### Step 5: Commit Chaincode

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051"
```

### Step 6: Verify

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted -C governance-channel -n governance-ledger"
```

## Alternative: If MSP Setup Fails

If you continue getting "KeyMaterial not found" errors, the private key might not match the certificate. In that case:

1. Check if the backend's wallet identity can be used differently
2. Or modify channel policies to allow peer identity (not recommended)
3. Or use Fabric CA to enroll a new admin user

## After Successful Deployment

Once chaincode is deployed, test a transaction:

1. Export a governance profile from the frontend
2. Check backend logs - should see "Fabric transaction submitted successfully"
3. Verify in blockchain explorer (if running): http://localhost:8080



