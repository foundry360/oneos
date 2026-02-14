# Complete Linux Deployment Guide

## Why Linux?

Windows + Docker Desktop + Hyperledger Fabric = Broken pipe errors  
Linux + Docker = **Works perfectly** ✅

## Option 1: WSL2 Ubuntu (Easiest - On Your Machine)

See `QUICK_WSL2_SETUP.md` for step-by-step instructions.

**Time:** 10 minutes  
**Difficulty:** Easy  
**Result:** Blockchain works!

## Option 2: Linux VM (VirtualBox/VMware)

### Setup VirtualBox

1. Download VirtualBox: https://www.virtualbox.org/
2. Download Ubuntu 22.04 ISO: https://ubuntu.com/download
3. Create VM:
   - RAM: 4GB minimum
   - Disk: 20GB minimum
   - Network: NAT or Bridged
4. Install Ubuntu
5. Install Docker (see Step 2 in QUICK_WSL2_SETUP.md)
6. Transfer project files (shared folder or SCP)

### Transfer Files

```bash
# From Windows PowerShell
scp -r C:\OneOS user@vm-ip:/home/user/OneOS

# Or use shared folder in VirtualBox
```

## Option 3: Cloud Linux Server (AWS/GCP/Azure)

### AWS EC2

```bash
# 1. Launch EC2 instance (Ubuntu 22.04, t2.medium or larger)
# 2. SSH into instance
ssh -i key.pem ubuntu@ec2-ip

# 3. Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
newgrp docker

# 4. Clone/transfer project
git clone <your-repo> || scp -r OneOS ubuntu@ec2-ip:/home/ubuntu/

# 5. Start services
cd OneOS
docker-compose up -d
```

### Google Cloud Platform

```bash
# 1. Create VM instance (Ubuntu 22.04, e2-medium or larger)
# 2. SSH via browser or gcloud
gcloud compute ssh instance-name --zone=us-central1-a

# 3. Install Docker (same as AWS)
# 4. Deploy (same as AWS)
```

### Azure

```bash
# 1. Create VM (Ubuntu 22.04, Standard_B2s or larger)
# 2. SSH
ssh user@azure-vm-ip

# 3. Install Docker (same as others)
# 4. Deploy (same as others)
```

## Option 4: Docker on Linux (Native Install)

If you have a Linux machine already:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Clone/transfer project
cd ~
git clone <your-repo> || scp -r OneOS user@server:/home/user/

# Start services
cd OneOS
docker-compose up -d
```

## Deployment Steps (Same for All Linux Options)

### 1. Verify Setup

```bash
# Check Docker
docker --version
docker-compose --version

# Check project
cd OneOS
ls -la
```

### 2. Start Services

```bash
docker-compose up -d

# Wait for services to start
docker-compose ps

# Check logs
docker-compose logs -f
```

### 3. Deploy Chaincode

```bash
# Install (THIS WILL WORK ON LINUX!)
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger-with-deps.tar.gz"
```

**Expected output:** `Package ID: governance-ledger_1.0:abc123...` ✅

### 4. Get Package ID

```bash
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled"
```

Copy the Package ID (looks like: `governance-ledger_1.0:abc123def456...`)

### 5. Approve Chaincode

```bash
# Replace <PACKAGE_ID> with actual ID
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --package-id <PACKAGE_ID> --sequence 1"
```

### 6. Commit Chaincode

```bash
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --channelID governance-channel --name governance-ledger --version 1.0 --sequence 1 --peerAddresses fabric-peer:7051"
```

### 7. Verify

```bash
# Check committed
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted -C governance-channel -n governance-ledger"

# Test transaction
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer chaincode invoke -o fabric-orderer:7050 -C governance-channel -n governance-ledger -c '{\"function\":\"InitLedger\",\"Args\":[]}'"
```

## System Requirements

- **RAM:** 4GB minimum (8GB recommended)
- **Disk:** 20GB free space
- **CPU:** 2 cores minimum
- **OS:** Ubuntu 20.04+ or similar Linux

## Network Access

If deploying on remote server:

```bash
# Open firewall ports (if needed)
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 3001/tcp  # Backend
sudo ufw allow 8080/tcp  # Explorer
sudo ufw allow 7051/tcp  # Peer
sudo ufw allow 7050/tcp  # Orderer
```

## Performance Tips

1. **Use SSD** for better Docker performance
2. **Allocate enough RAM** to Docker (4GB+)
3. **Use native Linux** (not WSL2 if possible) for best performance
4. **Close other applications** during deployment

## Troubleshooting

### Docker Permission Denied

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :3000
# Kill it
sudo kill -9 <PID>
```

### Chaincode Install Still Fails

```bash
# Check Docker logs
docker logs fabric-peer --tail 100

# Verify MSP structure
docker exec fabric-peer ls -la /etc/hyperledger/fabric/users/Admin@org1.example.com/msp/

# Rebuild package
docker exec fabric-peer sh -c "cd /opt/gopath/src/github.com/governance-ledger && npm install && peer lifecycle chaincode package /tmp/governance-ledger-fresh.tar.gz --path /opt/gopath/src/github.com/governance-ledger --lang node --label governance-ledger_1.0"
```

## Success Indicators

✅ Chaincode install returns Package ID  
✅ Chaincode approval succeeds  
✅ Chaincode commit succeeds  
✅ Test transaction works  
✅ Explorer shows chaincode  
✅ Backend can write to blockchain  

## Next Steps

Once deployed on Linux:
1. ✅ Blockchain fully functional
2. ✅ All transactions work
3. ✅ Explorer shows data
4. ✅ Continue development normally

**The blockchain will work perfectly on Linux!** 🎉



