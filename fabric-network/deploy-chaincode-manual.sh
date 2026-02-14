#!/bin/bash
# Manual chaincode deployment script
# This script deploys governance-ledger chaincode to governance-channel

set -e

CHANNEL_NAME="governance-channel"
CHAINCODE_NAME="governance-ledger"
CHAINCODE_VERSION="1.0"
PACKAGE_FILE="/tmp/governance-ledger.tar.gz"

echo "🚀 Deploying $CHAINCODE_NAME chaincode to $CHANNEL_NAME..."
echo ""

# Step 1: Install chaincode
echo "📦 Step 1: Installing chaincode package..."
echo "   Package: $PACKAGE_FILE"

# Use the Admin identity from crypto-config (mounted in peer container)
# We'll need to set up the MSP path properly
docker exec fabric-peer sh -c "
  # Create temporary admin MSP structure
  mkdir -p /tmp/admin-msp/{signcerts,keystore,cacerts}
  
  # Copy Admin certificate
  cp /etc/hyperledger/fabric/msp/admincerts/Admin@org1.example.com-cert.pem /tmp/admin-msp/signcerts/
  
  # Copy private key
  cp /etc/hyperledger/fabric/msp/keystore/priv_sk /tmp/admin-msp/keystore/
  
  # Copy CA certificate
  cp /etc/hyperledger/fabric/msp/cacerts/*.pem /tmp/admin-msp/cacerts/
  
  # Copy config.yaml
  cp /etc/hyperledger/fabric/msp/config.yaml /tmp/admin-msp/
  
  # Install chaincode
  export CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp
  export CORE_PEER_LOCALMSPID=Org1MSP
  export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
  export CORE_PEER_TLS_ENABLED=false
  
  peer lifecycle chaincode install $PACKAGE_FILE 2>&1
"

# Step 2: Get Package ID
echo ""
echo "🔍 Step 2: Getting package ID..."
PACKAGE_ID=$(docker exec fabric-peer sh -c "
  export CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp
  export CORE_PEER_LOCALMSPID=Org1MSP
  export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
  export CORE_PEER_TLS_ENABLED=false
  
  peer lifecycle chaincode queryinstalled 2>&1 | grep -oP 'Package ID: \K[^,]+' | head -1
" || echo "")

if [ -z "$PACKAGE_ID" ]; then
  echo "❌ Error: Could not get package ID"
  echo "   Trying alternative method..."
  PACKAGE_ID=$(docker exec fabric-peer sh -c "
    export CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp
    export CORE_PEER_LOCALMSPID=Org1MSP
    export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
    export CORE_PEER_TLS_ENABLED=false
    
    peer lifecycle chaincode queryinstalled 2>&1 | grep -A 1 'governance-ledger' | grep -oP '[a-f0-9]{64}' | head -1
  " || echo "")
fi

if [ -z "$PACKAGE_ID" ]; then
  echo "❌ Error: Could not extract package ID. Please check installation output above."
  exit 1
fi

echo "   ✅ Package ID: $PACKAGE_ID"

# Step 3: Approve chaincode
echo ""
echo "✅ Step 3: Approving chaincode definition..."
docker exec fabric-peer sh -c "
  export CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp
  export CORE_PEER_LOCALMSPID=Org1MSP
  export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
  export CORE_PEER_TLS_ENABLED=false
  
  peer lifecycle chaincode approveformyorg \
    -o fabric-orderer:7050 \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --package-id $PACKAGE_ID \
    --sequence 1 \
    --waitForEvent 2>&1
" || {
  echo "⚠️  Warning: Approval may have failed. Continuing..."
}

# Step 4: Commit chaincode
echo ""
echo "📝 Step 4: Committing chaincode to channel..."
docker exec fabric-peer sh -c "
  export CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp
  export CORE_PEER_LOCALMSPID=Org1MSP
  export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
  export CORE_PEER_TLS_ENABLED=false
  
  peer lifecycle chaincode commit \
    -o fabric-orderer:7050 \
    --channelID $CHANNEL_NAME \
    --name $CHAINCODE_NAME \
    --version $CHAINCODE_VERSION \
    --sequence 1 \
    --peerAddresses fabric-peer:7051 \
    --waitForEvent 2>&1
" || {
  echo "❌ Error: Commit failed"
  exit 1
}

# Step 5: Verify
echo ""
echo "🔍 Step 5: Verifying deployment..."
docker exec fabric-peer sh -c "
  export CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp
  export CORE_PEER_LOCALMSPID=Org1MSP
  export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
  export CORE_PEER_TLS_ENABLED=false
  
  peer lifecycle chaincode querycommitted -C $CHANNEL_NAME -n $CHAINCODE_NAME 2>&1
"

echo ""
echo "✅ Chaincode deployment complete!"
echo "   Name: $CHAINCODE_NAME"
echo "   Version: $CHAINCODE_VERSION"
echo "   Channel: $CHANNEL_NAME"
echo "   Package ID: $PACKAGE_ID"



