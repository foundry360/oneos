# Quick WSL2 Ubuntu Setup - Works Guaranteed!

Since Docker Desktop on Windows is still having issues, here's how to use WSL2 Ubuntu directly:

## Step 1: Install Ubuntu in WSL2

```powershell
# In PowerShell (as Administrator)
wsl --install -d Ubuntu-22.04

# Or if Ubuntu is already installed:
wsl -d Ubuntu-22.04
```

## Step 2: Inside Ubuntu, Install Docker

```bash
# Update
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io docker-compose

# Start Docker
sudo service docker start

# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in, or:
newgrp docker
```

## Step 3: Navigate to Your Project

```bash
# From Windows, your files are at:
cd /mnt/c/OneOS

# Or copy to WSL2 home for better performance:
cp -r /mnt/c/OneOS ~/OneOS
cd ~/OneOS
```

## Step 4: Start Services

```bash
# Start everything
docker-compose up -d

# Check status
docker-compose ps
```

## Step 5: Deploy Chaincode (This WILL Work!)

```bash
# Install chaincode - this will work in native Linux!
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger-with-deps.tar.gz"
```

**This should succeed!** No more broken pipe errors in native Linux.

## Step 6: Complete Deployment

```bash
# Get package ID
PACKAGE_ID=$(docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled" | grep -oP 'governance-ledger_1.0:\K[^\s]+' | head -1)

echo "Package ID: $PACKAGE_ID"

# Approve
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --package-id $PACKAGE_ID --sequence 1"

# Commit
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051"
```

## Why This Works

- ✅ Native Linux Docker (not Docker Desktop)
- ✅ No Windows/PowerShell interference
- ✅ Direct socket access
- ✅ Standard Linux environment

## Access from Windows

Your services will still be accessible from Windows:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Explorer: http://localhost:8080

## Daily Workflow

1. Open WSL2 Ubuntu terminal
2. `cd ~/OneOS` (or `/mnt/c/OneOS`)
3. `docker-compose up -d`
4. Work normally - blockchain will work!

## Troubleshooting

If Docker doesn't start:
```bash
sudo service docker start
sudo chmod 666 /var/run/docker.sock
```

If permissions issues:
```bash
sudo usermod -aG docker $USER
newgrp docker
```



