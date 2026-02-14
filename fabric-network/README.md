# Hyperledger Fabric Network Setup

This directory contains the configuration and scripts for running a Hyperledger Fabric network with Hyperledger Explorer.

## Prerequisites

1. **Docker and Docker Compose** - Already installed
2. **Fabric Binaries** - Will be downloaded automatically by scripts
3. **Network Name** - Ensure Docker network name matches (default: `oneos_default`)

## Quick Start

### Option 1: Use Main Docker Compose (Recommended)

The Fabric network is integrated into the main `docker-compose.yml`. Start everything together:

```bash
# From project root
docker-compose up -d
```

### Option 2: Use Separate Fabric Network Compose

If you want to run Fabric network separately:

```bash
cd fabric-network
docker-compose -f docker-compose.yaml up -d
```

## Setup Steps

### Step 1: Generate Cryptographic Materials

```bash
cd fabric-network
./scripts/generate-certs.sh
```

This creates:
- Certificate Authority certificates
- Peer certificates
- Orderer certificates
- User certificates

**Output**: `crypto-config/` directory

### Step 2: Generate Channel Artifacts

```bash
cd fabric-network
./scripts/generate-genesis.sh
```

This creates:
- Orderer genesis block
- Channel configuration transaction
- Anchor peer updates

**Output**: `channel-artifacts/` directory

### Step 3: Start Network

```bash
# From project root (uses main docker-compose.yml)
docker-compose up -d fabric-ca fabric-orderer fabric-peer explorer-db explorer

# Or from fabric-network directory
cd fabric-network
./scripts/start-network.sh
```

### Step 4: Create Channel

```bash
cd fabric-network
./scripts/create-channel.sh governance-channel
```

## Access Points

- **Hyperledger Explorer**: http://localhost:8080
- **Fabric CA**: http://localhost:7054
- **Orderer**: localhost:7050
- **Peer**: localhost:7051
- **Explorer Database**: localhost:5433

## Network Structure

```
┌─────────────────────────────────────────┐
│  Hyperledger Fabric Network             │
│                                          │
│  ┌──────────┐  ┌──────────┐            │
│  │ Fabric   │  │ Orderer  │            │
│  │ CA       │  │ (Raft)   │            │
│  │ :7054    │  │ :7050    │            │
│  └──────────┘  └──────────┘            │
│                                          │
│  ┌──────────┐                          │
│  │ Peer     │                          │
│  │ Org1     │                          │
│  │ :7051    │                          │
│  └──────────┘                          │
│                                          │
│  ┌──────────────────────────┐           │
│  │ Hyperledger Explorer    │           │
│  │ :8080                    │           │
│  └──────────────────────────┘           │
└─────────────────────────────────────────┘
```

## Configuration Files

- `crypto-config.yaml` - Certificate structure definition
- `configtx.yaml` - Channel and network configuration
- `explorer/config.json` - Explorer network configuration
- `explorer/connection-profile.json` - Fabric connection profile
- `explorer/explorerconfig.json` - Explorer application config

## Scripts

- `generate-certs.sh` - Generate cryptographic materials
- `generate-genesis.sh` - Generate channel artifacts
- `start-network.sh` - Start Fabric network
- `stop-network.sh` - Stop Fabric network
- `create-channel.sh` - Create and join channel

## Troubleshooting

### Issue: Certificates Not Found
**Solution**: Run `./scripts/generate-certs.sh` first

### Issue: Genesis Block Not Found
**Solution**: Run `./scripts/generate-genesis.sh` first

### Issue: Explorer Not Connecting
**Check**:
1. Explorer database is running
2. Connection profile paths are correct
3. Crypto materials are mounted correctly
4. Network name matches in docker-compose

### Issue: Peer Cannot Connect to Orderer
**Check**:
1. Orderer is running and healthy
2. Network connectivity (same Docker network)
3. Ports are not conflicting

## Next Steps

1. **Deploy Chaincode**: Once network is running, deploy governance-ledger chaincode
2. **Integrate Backend**: Update `ledgerService.js` to use Fabric SDK
3. **Test Transactions**: Submit test transactions and view in Explorer

## Notes

- Network uses TLS disabled for development (enable in production)
- Single organization setup (can expand to multi-org)
- Explorer uses separate PostgreSQL database
- All data persists in Docker volumes




