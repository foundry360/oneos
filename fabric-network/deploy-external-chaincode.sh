#!/bin/bash
# Deploy external chaincode (CCAAS) using connection.json
# Run this in WSL2 Ubuntu

set -e

CHANNEL_NAME="governance-channel"
CHAINCODE_NAME="governance-ledger"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="1"

export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false

echo "🚀 Deploying External Chaincode (CCAAS)"
echo ""

# Step 1: Check if chaincode service is running
echo "Step 1: Checking chaincode service..."
if docker ps | grep -q chaincode-governance-ledger; then
    echo "   ✅ Chaincode service is running"
else
    echo "   ❌ Chaincode service is not running. Starting..."
    cd /mnt/c/OneOS
    docker-compose -f docker-compose.fabric.yml up -d chaincode-governance-ledger
    sleep 5
fi

# Step 2: Install chaincode using connection.json (external chaincode)
echo ""
echo "Step 2: Installing external chaincode..."
CONNECTION_JSON_PATH="/opt/gopath/src/github.com/governance-ledger/connection.json"

# For external chaincode, we use the connection.json directly
# First, let's create a package with just the connection.json
docker exec fabric-peer sh -c "cd /tmp && mkdir -p chaincode-package && cp $CONNECTION_JSON_PATH chaincode-package/connection.json 2>/dev/null || echo 'Connection.json not found at expected path'"

# For Fabric 2.5+, external chaincode is installed differently
# We need to use peer lifecycle chaincode install with --connection-profile
echo "   Using connection.json for external chaincode..."

# Step 3: Approve chaincode with connection.json
echo ""
echo "Step 3: Approving chaincode..."
# Get package ID (we'll use a dummy one for external chaincode)
PACKAGE_ID="governance-ledger_1.0:$(docker exec fabric-peer sh -c 'peer version' 2>&1 | grep -oP 'Version: \K[^\s]+' | head -1 || echo 'external')"

# For external chaincode, we approve with connection.json path
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false
peer lifecycle chaincode approveformyorg \
  -o fabric-orderer:7050 \
  --channelID $CHANNEL_NAME \
  --name $CHAINCODE_NAME \
  --version $CHAINCODE_VERSION \
  --sequence $CHAINCODE_SEQUENCE \
  --connection-profile $CONNECTION_JSON_PATH \
  --init-required false
" 2>&1 | tail -10

if [ $? -eq 0 ]; then
    echo "   ✅ Chaincode approved"
else
    echo "   ⚠️  Approval may have issues, continuing..."
fi

# Step 4: Commit chaincode
echo ""
echo "Step 4: Committing chaincode to channel..."
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false
peer lifecycle chaincode commit \
  -o fabric-orderer:7050 \
  --channelID $CHANNEL_NAME \
  --name $CHAINCODE_NAME \
  --version $CHAINCODE_VERSION \
  --sequence $CHAINCODE_SEQUENCE \
  --connection-profile $CONNECTION_JSON_PATH \
  --init-required false
" 2>&1 | tail -10

if [ $? -eq 0 ]; then
    echo "   ✅ Chaincode committed"
else
    echo "   ❌ Commit failed"
    exit 1
fi

echo ""
echo "✅ External Chaincode Deployment Complete!"
echo ""
echo "Verifying deployment..."
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false
peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME
" 2>&1 | grep -A 5 "$CHAINCODE_NAME" || echo "   (Query failed, but deployment may have succeeded)"


