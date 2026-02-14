# How to Deploy Chaincode Manually

## Quick Summary

The chaincode needs to be:
1. **Installed** on the peer
2. **Approved** by your organization
3. **Committed** to the channel

## The Problem

The peer's default MSP identity doesn't have admin privileges (OU=admin). You need to use an Admin identity to deploy chaincode.

## Solution: Use the Backend's Working Identity

Since we've successfully set up the Admin identity in the backend wallet, here are your options:

### Option 1: Use the Deployment Script (Recommended)

The script at `fabric-network/scripts/deploy-chaincode.sh` should handle this, but it expects the Admin user directory at `/etc/hyperledger/fabric/users/Admin@org1.example.com/msp` which doesn't exist in the peer container.

### Option 2: Manual Steps Using Docker Exec

Run these commands one at a time:

#### Step 1: Install Chaincode

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger.tar.gz"
```

**Note:** This will likely fail with "identity is not an admin". This is expected.

#### Step 2: Get Package ID (if installation succeeded)

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled"
```

Look for: `governance-ledger_1.0:<PACKAGE_ID>`

#### Step 3: Approve Chaincode (replace <PACKAGE_ID>)

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --package-id <PACKAGE_ID> --sequence 1"
```

#### Step 4: Commit Chaincode

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051"
```

### Option 3: Fix the Admin MSP Structure

The issue is that the peer needs a properly structured Admin MSP. You need to:

1. Copy the Admin certificate from crypto-config to the peer
2. Copy the Admin private key
3. Set up the MSP directory structure correctly

The backend has this working at `/app/fabric-network/wallet/Admin@org1.example.com/`. You could:
- Copy those files to the peer container
- Or modify the channel policies to allow non-admin identities (not recommended for production)

### Option 4: Use Fabric CA to Enroll Admin

If Fabric CA is running, you can enroll an admin user:

```powershell
# This would need to be done from a container with fabric-ca-client
docker exec fabric-ca fabric-ca-client enroll -u http://admin:adminpw@localhost:7054
```

## Current Status

✅ **Wallet identity is working** - The backend can now connect to Fabric
✅ **Channel exists** - governance-channel is created and peer has joined  
❌ **Chaincode not deployed** - This is the remaining step

## Next Steps

1. Try Option 1 (deployment script) first
2. If that fails, try Option 3 (fix Admin MSP structure)
3. Once chaincode is deployed, blockchain transactions should work!

## Verification

After deployment, verify with:

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted -C governance-channel -n governance-ledger"
```

You should see the chaincode listed with version 1.0.



