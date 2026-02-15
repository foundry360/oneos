# Hyperledger Explorer Fix Summary

## Issues Found and Fixed

### 1. **Critical JavaScript Syntax Error** ✅ FIXED
- **Problem**: The Docker image `ghcr.io/hyperledger-labs/explorer:latest` had a corrupted compiled JavaScript file
- **Error**: `SyntaxError: Invalid or unexpected token` in `/opt/explorer/app/platform/fabric/gateway/FabricGateway.js:153`
- **Root Cause**: Line 153 had malformed code: `logger.error(\: \);` instead of proper error logging
- **Fix**: Created a Node.js script to patch the file inside the container, replacing the corrupted line with: `logger.error(\`\${explorerError.ERROR_1010}: \${JSON.stringify(error, null, 2)}\`);`
- **Note**: This fix needs to be reapplied if the container is recreated. Consider using a custom Docker image or a different image tag.

### 2. **Database Credentials Mismatch** ✅ FIXED
- **Problem**: `explorerconfig.json` had wrong database credentials
  - Old: `host: 127.0.0.1`, `database: fabricexplorer`, `username: hppoc`, `password: password`
  - Docker service uses: `host: explorer-db`, `database: explorer`, `username: explorer`, `password: explorerpw`
- **Fix**: Updated `blockchain-explorer/app/explorerconfig.json` to match docker-compose.yml database settings

### 3. **Wrong Configuration File Paths** ✅ FIXED
- **Problem**: docker-compose.yml was mounting incorrect config files
  - Mounted: `./fabric-explorer/examples/net1/config.json` (wrong directory)
  - Should mount: `./fabric-network/explorer/config.json`
- **Fix**: Updated docker-compose.yml to mount correct configuration files:
  - `./fabric-network/explorer/config.json` → `/opt/explorer/app/platform/fabric/config.json`
  - `./fabric-network/explorer/connection-profile.json` → `/opt/explorer/app/platform/fabric/connection-profile.json`
  - `./blockchain-explorer/app/explorerconfig.json` → `/opt/explorer/app/explorerconfig.json`

### 4. **Incomplete Connection Profile** ✅ FIXED
- **Problem**: Connection profile was missing critical fields:
  - Missing wallet path configuration
  - Missing admin credentials
  - Missing channel configuration
  - Missing TLS configuration
- **Fix**: Updated `fabric-network/explorer/connection-profile.json` with complete configuration including:
  - Wallet paths
  - Admin credentials
  - Channel configuration (governance-channel)
  - TLS settings matching the Fabric network (TLS enabled)

### 5. **TLS Configuration Mismatch** ✅ FIXED
- **Problem**: Connection profile had `tlsEnable: false` but Fabric network has TLS enabled
- **Fix**: Updated connection profile to:
  - Set `tlsEnable: true`
  - Use `grpcs://` URLs for peers and orderers
  - Include proper TLS certificate paths
  - Add `ssl-target-name-override` for proper TLS handshake

### 6. **Hostname Resolution Issue** ✅ FIXED
- **Problem**: Explorer discovery returns peer hostname `peer0.org1.example.com` but Docker networking requires service name `fabric-peer`
- **Fix**: Added entrypoint script in docker-compose.yml to map hostnames to Docker service IPs in `/etc/hosts`:
  ```yaml
  entrypoint: ["/bin/sh", "-c"]
  command:
    - |
      PEER_IP=$$(getent hosts fabric-peer | awk '{print $$1}')
      ORDERER_IP=$$(getent hosts fabric-orderer | awk '{print $$1}')
      echo "$$PEER_IP peer0.org1.example.com" >> /etc/hosts
      echo "$$ORDERER_IP orderer.example.com" >> /etc/hosts
      exec npm run app-start
  ```

## Current Status

✅ **Explorer is now running and functional:**
- Container is up and healthy
- Database connection working
- Successfully connecting to Fabric network
- Discovering peers and channels
- Syncing blocks (1 block recorded)
- Recording transactions (1 transaction recorded)
- Web interface accessible at http://localhost:8080

## Files Modified

1. `docker-compose.yml` - Fixed explorer service configuration
2. `blockchain-explorer/app/explorerconfig.json` - Fixed database credentials
3. `fabric-network/explorer/connection-profile.json` - Complete rewrite with proper configuration
4. `fabric-network/explorer/config.json` - Added missing fields

## Important Notes

1. **JavaScript Fix Persistence**: The JavaScript syntax error fix is applied to the running container. If you recreate the container, you'll need to reapply the fix. Consider:
   - Using a different Docker image tag
   - Building a custom Docker image with the fix
   - Creating an init script that applies the fix on container start

2. **Chaincode Discovery**: If chaincodes don't appear in Explorer:
   - Ensure chaincode is properly installed and instantiated on the peer
   - Wait a few minutes for Explorer to discover and sync
   - Check Explorer logs: `docker logs explorer`

3. **Transaction Recording**: Explorer will automatically record new transactions as they occur on the blockchain. The sync process runs continuously.

## Verification Commands

```bash
# Check explorer status
docker ps --filter "name=explorer"

# Check explorer logs
docker logs explorer --tail 50

# Check database
docker exec explorer-db psql -U explorer -d explorer -c "SELECT COUNT(*) FROM blocks;"
docker exec explorer-db psql -U explorer -d explorer -c "SELECT COUNT(*) FROM transactions;"

# Access web interface
# Open browser: http://localhost:8080
```

## Next Steps

1. Monitor Explorer logs to ensure it continues syncing
2. Test by submitting transactions and verifying they appear in Explorer
3. If the JavaScript fix needs to be permanent, consider building a custom Docker image
4. Verify chaincode discovery after deploying new chaincodes


