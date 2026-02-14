# Hybrid Setup Guide: Docker Desktop + WSL2 Ubuntu

This guide sets up a hybrid environment where:
- **Docker Desktop (Windows)**: Runs backend, frontend, postgres, pubsub, pgadmin
- **WSL2 Ubuntu**: Runs Fabric blockchain services (peer, orderer, CA, chaincode)

## Why This Setup?

- ✅ Keep using Docker Desktop for app development
- ✅ Build Docker images for GCP on Windows (no change)
- ✅ Only use Linux for Fabric chaincode deployment (fixes Windows issue)
- ✅ Services communicate over localhost (works seamlessly)

## Step 1: Install WSL2 Ubuntu

```powershell
# In PowerShell (as Administrator)
wsl --install -d Ubuntu-22.04

# Or if already installed, just open it:
wsl -d Ubuntu-22.04
```

## Step 2: Install Docker in WSL2 Ubuntu

```bash
# Inside Ubuntu terminal
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Start Docker service
sudo service docker start

# Add user to docker group (to run without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker works
docker --version
docker-compose --version
```

## Step 3: Navigate to Project in WSL2

```bash
# Your Windows files are accessible at /mnt/c/
cd /mnt/c/OneOS

# Verify you can see the files
ls -la
```

## Step 4: Start Fabric Services in WSL2

```bash
# In WSL2 Ubuntu terminal
cd /mnt/c/OneOS

# Start only Fabric services
docker-compose -f docker-compose.fabric.yml up -d

# Check status
docker-compose -f docker-compose.fabric.yml ps

# View logs
docker-compose -f docker-compose.fabric.yml logs -f
```

## Step 5: Start App Services in Docker Desktop

```powershell
# In Windows PowerShell
cd C:\OneOS

# Start app services (backend, frontend, postgres, etc.)
docker-compose up -d

# Check status
docker-compose ps
```

## Step 6: Deploy Chaincode (In WSL2)

```bash
# In WSL2 Ubuntu terminal
cd /mnt/c/OneOS

# Install chaincode (THIS WILL WORK IN LINUX!)
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger-with-deps.tar.gz"
```

## Step 7: Complete Chaincode Deployment

```bash
# Get package ID
PACKAGE_ID=$(docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled" | grep -oP 'governance-ledger_1.0:\K[^\s]+' | head -1)

echo "Package ID: $PACKAGE_ID"

# Approve
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --package-id $PACKAGE_ID --sequence 1"

# Commit
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051"
```

## Daily Workflow

### Starting Everything

1. **Start Fabric (WSL2 Ubuntu):**
   ```bash
   wsl -d Ubuntu-22.04
   cd /mnt/c/OneOS
   docker-compose -f docker-compose.fabric.yml up -d
   ```

2. **Start App Services (Windows PowerShell):**
   ```powershell
   cd C:\OneOS
   docker-compose up -d
   ```

### Stopping Everything

1. **Stop App Services (Windows):**
   ```powershell
   cd C:\OneOS
   docker-compose down
   ```

2. **Stop Fabric Services (WSL2):**
   ```bash
   cd /mnt/c/OneOS
   docker-compose -f docker-compose.fabric.yml down
   ```

## Service Access

All services are accessible from Windows:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Postgres**: localhost:5432
- **Explorer**: http://localhost:8080
- **Fabric Peer**: localhost:7051
- **Fabric Orderer**: localhost:7050

## Network Communication

- Services in Docker Desktop can reach WSL2 services via `localhost`
- Services in WSL2 can reach Docker Desktop services via `host.docker.internal` or `localhost`
- Backend connects to Fabric via `localhost:7051` (works from both)

## Building Images for GCP

**No change needed!** Build images on Windows as usual:

```powershell
# In Windows PowerShell
cd C:\OneOS\backend
docker build -t gcr.io/YOUR_PROJECT_ID/ai-gov-backend .

cd ..\frontend
docker build -t gcr.io/YOUR_PROJECT_ID/ai-gov-frontend .

# Push to GCP
docker push gcr.io/YOUR_PROJECT_ID/ai-gov-backend
docker push gcr.io/YOUR_PROJECT_ID/ai-gov-frontend
```

Images built on Windows work perfectly for GCP deployment.

## Troubleshooting

### WSL2 Docker Not Starting

```bash
# In WSL2 Ubuntu
sudo service docker start
sudo chmod 666 /var/run/docker.sock
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the port
sudo lsof -i :7051

# Stop conflicting service or change port in docker-compose.fabric.yml
```

### Services Can't Communicate

- Ensure both Docker Desktop and WSL2 Docker are running
- Check firewall settings
- Verify services are on the same network (they use `default` network)

### Chaincode Install Still Fails

```bash
# Verify you're in WSL2 Ubuntu (not Windows)
uname -a  # Should show Linux, not Windows

# Check Docker is native Linux (not Docker Desktop)
docker info | grep "Operating System"  # Should show Linux, not Docker Desktop
```

## Benefits of This Setup

✅ **Keep Docker Desktop** for app development  
✅ **Build images on Windows** for GCP (no change)  
✅ **Use Linux only for Fabric** (fixes chaincode issue)  
✅ **Minimal disruption** to existing workflow  
✅ **Best of both worlds** - Windows convenience + Linux compatibility  

## Next Steps

1. ✅ Set up WSL2 Ubuntu
2. ✅ Install Docker in WSL2
3. ✅ Start Fabric services in WSL2
4. ✅ Start app services in Docker Desktop
5. ✅ Deploy chaincode (will work!)
6. ✅ Continue development normally

Your blockchain will work perfectly! 🎉



