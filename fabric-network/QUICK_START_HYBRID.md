# Quick Start: Hybrid Setup

## First Time Setup

### 1. Install WSL2 Ubuntu (if not already installed)

```powershell
# In PowerShell (as Administrator)
wsl --install -d Ubuntu-22.04
```

### 2. Install Docker in WSL2

```bash
# Open WSL2 Ubuntu
wsl -d Ubuntu-22.04

# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Start Docker
sudo service docker start

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Daily Startup

### Option A: Use Scripts

**Windows PowerShell:**
```powershell
cd C:\OneOS
.\START_HYBRID.ps1
```

**WSL2 Ubuntu:**
```bash
cd /mnt/c/OneOS
bash START_HYBRID.sh
```

### Option B: Manual Commands

**1. Start App Services (Windows PowerShell):**
```powershell
cd C:\OneOS
docker-compose up -d
```

**2. Start Fabric Services (WSL2 Ubuntu):**
```bash
wsl -d Ubuntu-22.04
cd /mnt/c/OneOS
docker-compose -f docker-compose.fabric.yml up -d
```

## Verify Everything is Running

**Check App Services (Windows):**
```powershell
docker-compose ps
```

**Check Fabric Services (WSL2):**
```bash
docker-compose -f docker-compose.fabric.yml ps
```

## Access Services

All services accessible from Windows:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Explorer: http://localhost:8080
- Postgres: localhost:5432

## Stopping Services

**Stop App Services (Windows):**
```powershell
cd C:\OneOS
docker-compose down
```

**Stop Fabric Services (WSL2):**
```bash
cd /mnt/c/OneOS
docker-compose -f docker-compose.fabric.yml down
```

## Deploy Chaincode (In WSL2)

```bash
# In WSL2 Ubuntu
cd /mnt/c/OneOS

# Install chaincode
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger-with-deps.tar.gz"
```

See `HYBRID_SETUP_GUIDE.md` for complete deployment steps.



