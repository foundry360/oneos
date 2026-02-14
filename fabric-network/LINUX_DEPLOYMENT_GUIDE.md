# Linux Deployment Guide - Complete Setup

Since Windows has Docker build issues, here's how to deploy on Linux (works perfectly).

## Prerequisites

- Linux system (Ubuntu 20.04+ recommended)
- Docker and Docker Compose installed
- Git installed
- 4GB+ RAM available

## Step 1: Install Docker on Linux

```bash
# Update system
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
# Log out and back in for this to take effect
```

## Step 2: Clone/Transfer Your Project

```bash
# If using git
git clone <your-repo-url>
cd OneOS

# Or transfer files via SCP/SFTP
# scp -r OneOS user@linux-server:/path/to/
```

## Step 3: Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

## Step 4: Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Step 5: Deploy Chaincode (This Will Work on Linux!)

```bash
# Install chaincode
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger-with-deps.tar.gz"

# Get package ID
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled"

# Approve (replace <PACKAGE_ID> with actual ID)
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --package-id <PACKAGE_ID> --sequence 1"

# Commit
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051"
```

## Step 6: Verify

```bash
# Check chaincode is committed
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted -C governance-channel -n governance-ledger"

# Test transaction
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer chaincode invoke -o fabric-orderer:7050 -C governance-channel -n governance-ledger -c '{\"function\":\"InitLedger\",\"Args\":[]}'"
```

## Why Linux Works

- ✅ Native Docker support (no WSL2 layer)
- ✅ No PowerShell interference
- ✅ Direct socket access
- ✅ Standard Linux environment Fabric expects

## Quick Linux Options

### Option A: WSL2 Ubuntu (On Your Windows Machine)

```powershell
# Install WSL2 Ubuntu
wsl --install -d Ubuntu

# Then inside Ubuntu:
cd /mnt/c/OneOS
docker-compose up -d
# Chaincode install will work!
```

### Option B: Linux VM (VirtualBox/VMware)

1. Install Ubuntu VM
2. Install Docker
3. Transfer project files
4. Run docker-compose

### Option C: Cloud Linux Server (AWS/GCP/Azure)

1. Create Linux VM instance
2. Install Docker
3. Clone/transfer project
4. Deploy

### Option D: Docker Desktop Linux Mode (If Available)

Some newer Docker Desktop versions have a "Linux containers" mode that might work better.

## Troubleshooting on Linux

If chaincode install still fails on Linux:

```bash
# Check Docker is running
sudo systemctl status docker

# Check peer logs
docker logs fabric-peer --tail 50

# Verify MSP structure
docker exec fabric-peer ls -la /etc/hyperledger/fabric/users/Admin@org1.example.com/msp/

# Rebuild chaincode package if needed
docker exec fabric-peer sh -c "cd /opt/gopath/src/github.com/governance-ledger && npm install && peer lifecycle chaincode package /tmp/governance-ledger-new.tar.gz --path /opt/gopath/src/github.com/governance-ledger --lang node --label governance-ledger_1.0"
```

## Next Steps After Deployment

1. ✅ Chaincode deployed
2. ✅ Test blockchain transactions
3. ✅ Verify in Explorer (http://localhost:8080)
4. ✅ Continue development

The blockchain will work perfectly on Linux! 🐧



