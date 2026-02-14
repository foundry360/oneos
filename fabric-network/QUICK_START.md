# Hyperledger Fabric Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Docker Desktop running
- ✅ Docker Compose installed
- ✅ Git Bash or WSL (for running .sh scripts on Windows)

## Quick Start (5 Steps)

### Step 1: Download Fabric Binaries

You need Fabric binaries (`cryptogen` and `configtxgen`) to generate certificates and channel artifacts.

**Option A: Using Git Bash or WSL** (Recommended)
```bash
# Download and install Fabric binaries
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/bootstrap.sh | bash -s -- 2.5.7 1.5.7

# Add to PATH (add to ~/.bashrc for persistence)
export PATH=$PATH:$(pwd)/fabric-samples/bin
```

**Option B: Manual Download**
1. Download from: https://github.com/hyperledger/fabric/releases
2. Extract and add `bin/` directory to PATH

### Step 2: Generate Certificates

```bash
cd fabric-network

# Using Git Bash/WSL
./scripts/generate-certs.sh

# Or using PowerShell (requires binaries in PATH)
.\scripts\generate-certs.ps1
```

**Expected Output**: `crypto-config/` directory created

### Step 3: Generate Channel Artifacts

```bash
cd fabric-network

# Using Git Bash/WSL
./scripts/generate-genesis.sh

# Or using PowerShell
.\scripts\generate-genesis.ps1
```

**Expected Output**: `channel-artifacts/` directory with:
- `orderer.genesis.block`
- `governance-channel.tx`
- `Org1MSPanchors.tx`

### Step 4: Start Network

```bash
# From project root
docker-compose up -d fabric-ca fabric-orderer fabric-peer explorer-db explorer

# Or using script
cd fabric-network
.\scripts\start-network.ps1
```

**Wait 2-3 minutes** for all services to initialize.

### Step 5: Create Channel

```bash
cd fabric-network

# Using Git Bash/WSL
./scripts/create-channel.sh governance-channel

# Or manually
docker exec fabric-peer peer channel create -o fabric-orderer:7050 -c governance-channel -f /etc/hyperledger/fabric/channel-artifacts/governance-channel.tx --outputBlock /etc/hyperledger/fabric/channel-artifacts/governance-channel.block
docker exec fabric-peer peer channel join -b /etc/hyperledger/fabric/channel-artifacts/governance-channel.block
```

## Verify Installation

### Check Services
```bash
docker-compose ps
```

All services should show "Up" status.

### Access Explorer
Open browser: **http://localhost:8080**

You should see the Hyperledger Explorer dashboard.

### Check Logs
```bash
# View all Fabric logs
docker-compose logs -f fabric-peer

# View Explorer logs
docker-compose logs -f explorer
```

## Troubleshooting

### "cryptogen: command not found"
**Solution**: Download Fabric binaries (Step 1)

### "genesis block not found"
**Solution**: Run `generate-genesis.sh` (Step 3)

### Explorer shows "No network found"
**Solution**: 
1. Wait 2-3 minutes for Explorer to sync
2. Check connection profile path
3. Verify crypto-config is mounted correctly

### Port conflicts
**Solution**: Check if ports 7050, 7051, 7054, 8080 are already in use:
```bash
netstat -ano | findstr "7050 7051 7054 8080"
```

## Next Steps

1. ✅ Network is running
2. 📋 Deploy chaincode (governance-ledger)
3. 📋 Integrate with backend
4. 📋 Start using Fabric for transactions

## Useful Commands

```bash
# Stop network
docker-compose stop fabric-ca fabric-orderer fabric-peer explorer-db explorer

# Start network
docker-compose start fabric-ca fabric-orderer fabric-peer explorer-db explorer

# View logs
docker-compose logs -f explorer

# Restart Explorer
docker-compose restart explorer

# Clean up (removes all data)
docker-compose down -v
```




