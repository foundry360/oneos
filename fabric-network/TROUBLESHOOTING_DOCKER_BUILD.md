# Troubleshooting Docker Build "Broken Pipe" Error

## The Problem

Chaincode installation fails with:
```
Error: chaincode install failed with status: 500 - failed to invoke backing implementation of 'InstallChaincode': could not build chaincode: docker build failed: docker image build failed: write unix @->/var/run/docker.sock: write: broken pipe
```

## Root Cause

The peer is trying to build a Docker image for the Node.js chaincode, but the Docker connection is being interrupted during the build process. The logs show "System.Management.Automation.RemoteException" which suggests a Windows/PowerShell interaction issue.

## Solutions to Try

### Solution 1: Increase Docker Resources

1. Open Docker Desktop
2. Go to Settings > Resources
3. Increase:
   - Memory (try 4GB+)
   - CPUs (try 2+)
4. Click "Apply & Restart"
5. Retry chaincode installation

### Solution 2: Check Docker Desktop Logs

1. Open Docker Desktop
2. Go to Troubleshoot > View logs
3. Look for errors related to:
   - Docker daemon
   - Build processes
   - Socket connections

### Solution 3: Restart All Fabric Containers

```powershell
docker restart fabric-peer fabric-orderer fabric-ca
```

Wait 30 seconds, then retry installation.

### Solution 4: Use External Chaincode Builder (Advanced)

If Docker builds continue to fail, you can configure the peer to use external chaincode launcher instead of Docker builds. This requires modifying the peer configuration.

### Solution 5: Manual Docker Image Build

Try building the chaincode Docker image manually to see the actual error:

```powershell
# This would help identify the specific Docker build issue
docker build -t test-chaincode /tmp/governance-ledger
```

## Current Status

✅ Admin MSP structure: **FIXED**  
✅ Wallet identity: **WORKING**  
✅ Channel setup: **COMPLETE**  
❌ Chaincode deployment: **BLOCKED by Docker build issue**

## Workaround

While we troubleshoot the Docker build, blockchain transactions will fail with "chaincode not found". The application will still work, but blockchain writes won't succeed until chaincode is deployed.

## Next Steps

1. Try increasing Docker Desktop resources (Solution 1)
2. Check Docker Desktop logs for errors
3. If still failing, we may need to configure external chaincode launcher



