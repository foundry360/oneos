# Hyperledger Fabric Network Setup Guide

## Overview

This guide walks you through setting up a complete Hyperledger Fabric network with Hyperledger Explorer for the AI Governance Platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Fabric CA    │  │   Orderer    │  │    Peer      │     │
│  │ Port: 7054   │  │  Port: 7050  │  │ Port: 7051   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Hyperledger Explorer                                 │  │
│  │  Port: 8080                                            │  │
│  │  Database: explorer-db (Port: 5433)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Docker & Docker Compose** ✅ (Already installed)
2. **Git** (for downloading Fabric binaries)
3. **curl** (for downloading scripts)

## Step-by-Step Setup

### Step 1: Generate Cryptographic Materials

The Fabric network requires cryptographic certificates for all components.

```bash
cd fabric-network
./scripts/generate-certs.sh
```

**What this does**:
- Downloads Fabric binaries if needed
- Generates CA certificates
- Generates peer certificates
- Generates orderer certificates
- Creates user certificates

**Output**: `crypto-config/` directory with all certificates

### Step 2: Generate Channel Artifacts

Create the genesis block and channel configuration.

```bash
cd fabric-network
./scripts/generate-genesis.sh
```

**What this does**:
- Generates orderer genesis block
- Creates channel configuration transaction
- Creates anchor peer update transaction

**Output**: `channel-artifacts/` directory with:
- `orderer.genesis.block`
- `governance-channel.tx`
- `Org1MSPanchors.tx`

### Step 3: Start Fabric Network

Start all Fabric services using Docker Compose.

**Option A: Start with main docker-compose.yml** (Recommended)
```bash
# From project root
docker-compose up -d fabric-ca fabric-orderer fabric-peer explorer-db explorer
```

**Option B: Start separately**
```bash
cd fabric-network
docker-compose -f docker-compose.yaml up -d
```

**Verify services are running**:
```bash
docker-compose ps
```

You should see:
- `fabric-ca` - Running
- `fabric-orderer` - Running
- `fabric-peer` - Running
- `explorer-db` - Running
- `explorer` - Running

### Step 4: Create Channel

Create the governance channel and join the peer.

```bash
cd fabric-network
./scripts/create-channel.sh governance-channel
```

**What this does**:
- Creates the `governance-channel` channel
- Joins peer0.org1.example.com to the channel
- Creates channel block file

### Step 5: Access Hyperledger Explorer

Open your browser and navigate to:
```
http://localhost:8080
```

**Default Login** (if required):
- Username: `exploreradmin`
- Password: `exploreradminpw`

## Verification

### Check Fabric Services

```bash
# Check CA
curl http://localhost:7054/api/v1/cainfo

# Check Orderer (via peer)
docker exec fabric-peer peer channel list

# Check Peer
docker exec fabric-peer peer node status
```

### Check Explorer

```bash
# Health check
curl http://localhost:8080/api/health

# View blocks
curl http://localhost:8080/api/blocks
```

## Integration with Your Application

### Current State
Your application currently uses PostgreSQL (`ledger_entries` table) as a blockchain simulator.

### Future Integration
When ready to use Fabric:

1. **Update ledgerService.js** to use Fabric SDK instead of PostgreSQL
2. **Deploy Chaincode** - Deploy `governance-ledger` chaincode to the channel
3. **Update Connection** - Point to Fabric network instead of PostgreSQL

The interface remains the same - only the backend changes.

## Network Configuration

### Channel: `governance-channel`
- Organization: Org1
- MSP ID: Org1MSP
- Consensus: Raft (etcdraft)

### Ports
- **7054**: Fabric CA
- **7050**: Orderer
- **7051**: Peer (gRPC)
- **7052**: Peer (Chaincode)
- **7053**: Peer (Events)
- **8080**: Explorer
- **5433**: Explorer Database

## Troubleshooting

### Problem: Scripts won't run
**Solution**: Make scripts executable (Linux/Mac):
```bash
chmod +x fabric-network/scripts/*.sh
```

On Windows, use Git Bash or WSL to run `.sh` scripts.

### Problem: Certificates not generating
**Solution**: 
1. Check internet connection (downloads Fabric binaries)
2. Ensure Docker has enough resources
3. Check script output for errors

### Problem: Explorer not loading
**Solution**:
1. Check explorer-db is running: `docker-compose ps explorer-db`
2. Check explorer logs: `docker-compose logs explorer`
3. Wait 2-3 minutes for Explorer to initialize
4. Verify connection profile path is correct

### Problem: Peer cannot join channel
**Solution**:
1. Ensure orderer is running
2. Check channel artifacts exist
3. Verify network connectivity
4. Check peer logs: `docker-compose logs fabric-peer`

## Next Steps

1. ✅ Network is running
2. ✅ Explorer is accessible
3. 📋 Deploy chaincode (governance-ledger)
4. 📋 Integrate with backend (update ledgerService.js)
5. 📋 Test transactions
6. 📋 View transactions in Explorer

## Useful Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f fabric-peer
docker-compose logs -f explorer

# Stop network
docker-compose down

# Restart network
docker-compose restart

# Clean up (removes volumes)
docker-compose down -v
```

## Production Considerations

For production deployment:

1. **Enable TLS** - Set `TLS_ENABLED=true` in all services
2. **Use Raft with 3+ nodes** - For high availability
3. **Multiple Organizations** - Add Org2, Org3, etc.
4. **Separate Networks** - Use Docker networks for isolation
5. **Certificate Management** - Use proper CA infrastructure
6. **Monitoring** - Add Prometheus/Grafana
7. **Backup** - Regular backup of ledger and state

## Support

For issues:
1. Check service logs
2. Verify all prerequisites
3. Review Hyperledger Fabric documentation
4. Check Explorer GitHub issues




