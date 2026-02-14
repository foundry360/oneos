# Manual Chaincode Deployment Guide

This guide explains how to manually deploy the `governance-ledger` chaincode to the `governance-channel`.

## Prerequisites

- Chaincode package exists at `/tmp/governance-ledger.tar.gz` in the peer container
- Channel `governance-channel` exists and peer has joined
- Admin identity with OU=admin is available

## Step-by-Step Deployment

### Step 1: Install Chaincode on Peer

Install the chaincode package on the peer:

```bash
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger.tar.gz"
```

**Note:** This may fail with "identity is not an admin" error. If so, you need to use an admin identity.

### Step 2: Get Package ID

After installation, get the package ID:

```bash
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled"
```

Look for a line like: `governance-ledger_1.0:abc123def456...`

### Step 3: Approve Chaincode Definition

Approve the chaincode definition for your organization:

```bash
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --package-id <PACKAGE_ID> --sequence 1"
```

Replace `<PACKAGE_ID>` with the actual package ID from Step 2.

### Step 4: Commit Chaincode Definition

Commit the chaincode definition to the channel:

```bash
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051"
```

### Step 5: Verify Deployment

Verify the chaincode is committed:

```bash
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted -C governance-channel -n governance-ledger"
```

## Troubleshooting

### "identity is not an admin" Error

If you get this error, you need to use an admin identity. The peer's default MSP doesn't have admin privileges. You may need to:

1. Copy the Admin certificate and key to a temporary MSP directory
2. Use that MSP path instead of `/etc/hyperledger/fabric/msp`

### "chaincode already installed"

If the chaincode is already installed, skip Step 1 and proceed to Step 2 to get the package ID.

### Orderer Connection Issues

If you get connection timeout errors to the orderer, check:
- Orderer is running: `docker ps | grep fabric-orderer`
- Orderer is accessible from peer: `docker exec fabric-peer ping -c 1 fabric-orderer`

## Alternative: Use Deployment Script

If manual deployment fails, try using the automated script:

```bash
cd fabric-network
./scripts/deploy-chaincode.sh
```



