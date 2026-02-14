# Windows Setup Issue - Certificate Generation

## Issue

`cryptogen.exe` on Windows appears to generate the directory structure but not the actual certificate files. This is a known issue with some Windows environments.

## Solutions

### Option 1: Use WSL (Recommended)

Run cryptogen from WSL where it works reliably:

```bash
# In WSL
cd /mnt/c/OneOS/fabric-network
export PATH=$PATH:/mnt/c/OneOS/fabric-network/fabric-samples/bin
cryptogen generate --config=./crypto-config.yaml --output=./crypto-config
```

### Option 2: Use Docker to Generate Certificates

Use a Fabric container to run cryptogen:

```powershell
docker run --rm -v ${PWD}:/work -w /work hyperledger/fabric-tools:2.5.7 cryptogen generate --config=./crypto-config.yaml --output=./crypto-config
```

### Option 3: Use Fabric CA (More Complex)

Instead of cryptogen, use the Fabric CA container to generate certificates dynamically. This requires additional configuration.

## Current Status

- ✅ Fabric binaries downloaded
- ✅ Channel artifacts generated (genesis block, channel tx, anchor tx)
- ⚠️  Certificates directory structure created but files missing
- ⚠️  Network services configured but cannot start without certificates

## Next Steps

1. Generate certificates using one of the options above
2. Restart network services
3. Create channel
4. Access Explorer




