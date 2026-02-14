# How to Access Blockchain on Linux (WSL2)

## Services Running in WSL2

All Fabric blockchain services run in WSL2 Ubuntu and are accessible from Windows:

### Service Endpoints

- **Fabric Peer**: `localhost:7051` (from Windows) or `fabric-peer:7051` (from within WSL2)
- **Fabric Orderer**: `localhost:7050` (from Windows) or `fabric-orderer:7050` (from within WSL2)
- **Fabric CA**: `localhost:7054` (from Windows) or `fabric-ca:7054` (from within WSL2)
- **Explorer**: `http://localhost:8080` (from Windows browser)

## Accessing from Windows

### 1. Custom Visualization (Recommended)

**You don't need Explorer!** Build your own visualization using your backend API.

See `CUSTOM_VISUALIZATION_GUIDE.md` for complete instructions.

**Quick Example:**
```typescript
// Frontend component
const entries = await fetch('/api/governance-profiles/{id}/blockchain')
  .then(res => res.json());

// Backend endpoint (add to your routes)
router.get('/:id/blockchain', async (req, res) => {
  const entries = await fabricService.queryChaincode('GetAllEntries', [req.params.id]);
  res.json({ entries });
});
```

### 2. Hyperledger Explorer (Optional - Pre-built UI)

Open in your Windows browser:
```
http://localhost:8080
```

**Note:** Explorer requires additional wallet setup. If you're building a custom visualization, you don't need it!

This shows:
- All channels
- All chaincodes
- All transactions
- Block details
- Chaincode invocations

### 2. Backend API (Connects to Blockchain)

Your backend running in Docker Desktop connects to Fabric via:
```
localhost:7051  (Fabric Peer)
```

The backend uses the Fabric SDK to:
- Submit transactions
- Query ledger
- Store governance profile exports

### 3. Direct Peer CLI Access (From WSL2)

```bash
# Open WSL2 Ubuntu
wsl -d Ubuntu-22.04

# Query chaincode
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer chaincode query -C governance-channel -n governance-ledger -c '{\"function\":\"GetAllEntries\",\"Args\":[\"profile-123\"]}'"

# Invoke chaincode
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer chaincode invoke -o fabric-orderer:7050 -C governance-channel -n governance-ledger -c '{\"function\":\"StoreLedgerEntry\",\"Args\":[\"test-id\",\"TEST_ACTION\",\"hash123\",\"{}\"]}'"
```

## Accessing from Your Application

### Backend Connection

Your backend (running in Docker Desktop) connects to Fabric using:

**Connection Profile**: `/app/fabric-network/connection-profile.json`

This file points to:
```json
{
  "peers": {
    "peer0.org1.example.com": {
      "url": "grpc://localhost:7051"
    }
  },
  "orderers": {
    "orderer.example.com": {
      "url": "grpc://localhost:7050"
    }
  }
}
```

### Testing Blockchain from Backend

1. **Export a profile** - This triggers a blockchain transaction
2. **Check Explorer** - See the transaction at http://localhost:8080
3. **Check logs** - Backend logs show blockchain operations

## Network Architecture

```
┌─────────────────────────────────┐
│   Windows Browser               │
│   http://localhost:8080         │  ← Explorer UI
└─────────────────────────────────┘
              │
              │ localhost
              │
┌─────────────────────────────────┐
│   Docker Desktop (Windows)      │
│   ┌──────────────────────────┐  │
│   │ Backend (Node.js)         │  │
│   │ Connects to:               │  │
│   │ localhost:7051 (Peer)     │  │
│   └──────────────────────────┘  │
└─────────────────────────────────┘
              │
              │ localhost:7051
              │
┌─────────────────────────────────┐
│   WSL2 Ubuntu (Linux)            │
│   ┌──────────────────────────┐  │
│   │ Fabric Peer :7051        │  │
│   │ Fabric Orderer :7050     │  │
│   │ Fabric CA :7054         │  │
│   │ Explorer :8080          │  │
│   └──────────────────────────┘  │
└─────────────────────────────────┘
```

## Quick Access Commands

### View All Channels
```bash
wsl -d Ubuntu-22.04
docker exec fabric-peer peer channel list
```

### View Installed Chaincodes
```bash
wsl -d Ubuntu-22.04
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled"
```

### View Committed Chaincodes
```bash
wsl -d Ubuntu-22.04
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted -C governance-channel"
```

### Query Ledger
```bash
wsl -d Ubuntu-22.04
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer chaincode query -C governance-channel -n governance-ledger -c '{\"function\":\"GetAllEntries\",\"Args\":[\"entity-id\"]}'"
```

## Viewing Logs

### Peer Logs
```bash
wsl -d Ubuntu-22.04
docker logs fabric-peer --tail 50 -f
```

### Orderer Logs
```bash
wsl -d Ubuntu-22.04
docker logs fabric-orderer --tail 50 -f
```

### Explorer Logs
```bash
wsl -d Ubuntu-22.04
docker logs explorer --tail 50 -f
```

## Summary

- **Web UI**: http://localhost:8080 (Explorer)
- **Backend**: Connects via `localhost:7051` (automatic)
- **CLI**: Use `docker exec` commands in WSL2
- **All services**: Accessible from Windows via `localhost`

The blockchain is fully accessible from Windows - you just run Fabric services in WSL2 for the chaincode deployment fix!

