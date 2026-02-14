# Check Chaincode Status

## Current Status

**Fabric Services:** Not running in WSL2
**Chaincode:** Unknown (need to start services first)

## Steps to Check Chaincode Status

### 1. Start Fabric Services (WSL2 Ubuntu)

```bash
# In WSL2 Ubuntu
wsl -d Ubuntu-22.04
cd /mnt/c/OneOS
docker-compose -f docker-compose.fabric.yml up -d
```

Wait 30-60 seconds for services to start, then check:

```bash
docker-compose -f docker-compose.fabric.yml ps
```

You should see:
- `fabric-ca` - Running
- `fabric-orderer` - Running  
- `fabric-peer` - Running
- `chaincode-governance-ledger` - Running (if chaincode is deployed)

### 2. Check Chaincode Installation

```bash
# In WSL2 Ubuntu
docker exec fabric-peer peer lifecycle chaincode queryinstalled
```

This will show if chaincode is installed. Look for `governance-ledger`.

### 3. Check Chaincode Committed to Channel

```bash
# In WSL2 Ubuntu
docker exec fabric-peer peer lifecycle chaincode querycommitted --channelID governance-channel
```

This will show if chaincode is committed to the channel.

### 4. Check from Backend

Once services are running, check from the backend:

```bash
# From Windows PowerShell
cd C:\OneOS\backend
node check-chaincode-status.js
```

Or access the UI:
- Open http://localhost:3000/blockchain
- The transactions table will show if chaincode is active

### 5. Test a Transaction

If chaincode is active, you can test by exporting a profile (which creates a blockchain transaction).

## Troubleshooting

### If Services Won't Start

1. Check Docker is running in WSL2:
   ```bash
   sudo service docker status
   ```

2. Start Docker if needed:
   ```bash
   sudo service docker start
   ```

3. Check for port conflicts:
   ```bash
   netstat -tuln | grep -E '7050|7051|7054|8080'
   ```

### If Chaincode Not Found

The chaincode needs to be:
1. **Installed** on the peer
2. **Approved** by the organization
3. **Committed** to the channel

See `fabric-network/HYBRID_SETUP_GUIDE.md` for deployment steps.


