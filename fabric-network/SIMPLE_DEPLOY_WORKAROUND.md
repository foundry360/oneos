# Simple Workaround: Use Pre-built Docker Image

Since Docker builds are failing on Windows, here's the **simplest workaround**:

## Option 1: Use External Chaincode (Recommended - Simplest)

This bypasses Docker builds entirely by running chaincode as a separate service.

### Step 1: Start the chaincode service

```powershell
docker-compose -f docker-compose.chaincode.yml up -d
```

### Step 2: Install chaincode using external builder

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode package /tmp/governance-ledger-external.tar.gz --path /opt/gopath/src/github.com/governance-ledger --lang external --label governance-ledger_1.0"
```

### Step 3: Install the package

```powershell
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger-external.tar.gz"
```

## Option 2: Use Pre-built Image (If Option 1 doesn't work)

The Docker image `governance-ledger:1.0` is already built. We can try to use it directly, but this requires configuring the peer to use external chaincode builder.

## Why This Works

- **No Docker builds during installation** - The chaincode runs as a separate container
- **Works on Windows** - No PowerShell/Docker interaction issues
- **Simpler** - Just start a service and connect to it

## Next Steps After Installation

1. Get package ID: `peer lifecycle chaincode queryinstalled`
2. Approve: `peer lifecycle chaincode approveformyorg ...`
3. Commit: `peer lifecycle chaincode commit ...`



