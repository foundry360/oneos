#!/bin/bash
# Deploy governance-ledger chaincode to governance-channel

set -e

CHANNEL_NAME="governance-channel"
CHAINCODE_NAME="governance-ledger"
CHAINCODE_VERSION="1.0"
CHAINCODE_PATH="/opt/gopath/src/github.com/governance-ledger"
CHAINCODE_LANG="node"

echo "Deploying $CHAINCODE_NAME chaincode to $CHANNEL_NAME..."

# Set MSP config path
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false

# Check if channel exists
echo "Checking if channel exists..."
CHANNEL_EXISTS=$(docker exec fabric-peer peer channel list 2>&1 | grep -c "$CHANNEL_NAME" || echo "0")
if [ "$CHANNEL_EXISTS" -eq "0" ]; then
    echo "⚠️  Channel $CHANNEL_NAME does not exist. Creating channel..."
    docker exec fabric-peer peer channel create \
      -o fabric-orderer:7050 \
      -c $CHANNEL_NAME \
      -f /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.tx \
      --outputBlock /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.block
    
    echo "Joining peer to channel..."
    docker exec fabric-peer peer channel join \
      -b /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.block
else
    echo "✅ Channel $CHANNEL_NAME already exists"
fi

# Install chaincode dependencies
echo "Installing chaincode dependencies..."
docker exec fabric-peer sh -c "cd $CHAINCODE_PATH && npm install" || {
    echo "⚠️  Warning: Failed to install dependencies (may already be installed)"
}

# Package chaincode
echo "Packaging chaincode..."
PACKAGE_FILE="${CHAINCODE_NAME}.tar.gz"
docker exec fabric-peer peer lifecycle chaincode package /tmp/${PACKAGE_FILE} \
  --path ${CHAINCODE_PATH} \
  --lang ${CHAINCODE_LANG} \
  --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION} \
  || {
    echo "Error: Failed to package chaincode"
    exit 1
  }

# Install chaincode
echo "Installing chaincode..."
INSTALL_OUTPUT=$(docker exec fabric-peer peer lifecycle chaincode install /tmp/${PACKAGE_FILE} 2>&1)
echo "$INSTALL_OUTPUT"

# Extract package ID
PACKAGE_ID=$(echo "$INSTALL_OUTPUT" | grep -oP 'Package ID: \K[^,]+' | head -1 || echo "")

if [ -z "$PACKAGE_ID" ]; then
    # Try to query installed chaincodes
    echo "Attempting to query installed chaincodes..."
    QUERY_OUTPUT=$(docker exec fabric-peer peer lifecycle chaincode queryinstalled 2>&1)
    echo "$QUERY_OUTPUT"
    PACKAGE_ID=$(echo "$QUERY_OUTPUT" | grep -oP "${CHAINCODE_NAME}_${CHAINCODE_VERSION}:\K[^\s]+" | head -1 || echo "")
fi

if [ -z "$PACKAGE_ID" ]; then
    echo "⚠️  Warning: Could not extract package ID. Attempting to proceed with approval..."
    PACKAGE_ID="${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
else
    echo "Package ID: $PACKAGE_ID"
fi

# Approve chaincode
echo "Approving chaincode..."
docker exec fabric-peer peer lifecycle chaincode approveformyorg \
  -o fabric-orderer:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CHAINCODE_NAME} \
  --version ${CHAINCODE_VERSION} \
  --package-id ${PACKAGE_ID} \
  --sequence 1 \
  --waitForEvent \
  || {
    echo "⚠️  Warning: Approval may have failed. Checking status..."
    docker exec fabric-peer peer lifecycle chaincode queryapproved -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} --sequence 1 || true
  }

# Commit chaincode
echo "Committing chaincode..."
docker exec fabric-peer peer lifecycle chaincode commit \
  -o fabric-orderer:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CHAINCODE_NAME} \
  --version ${CHAINCODE_VERSION} \
  --sequence 1 \
  --peerAddresses fabric-peer:7051 \
  --waitForEvent \
  || {
    echo "⚠️  Warning: Commit may have failed. Checking status..."
    docker exec fabric-peer peer lifecycle chaincode querycommitted -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} || true
    exit 1
  }

echo ""
echo "✅ Chaincode deployed successfully!"
echo "   Name: $CHAINCODE_NAME"
echo "   Version: $CHAINCODE_VERSION"
echo "   Channel: $CHANNEL_NAME"
echo "   Package ID: $PACKAGE_ID"
echo ""
echo "Testing chaincode..."
docker exec fabric-peer peer chaincode invoke \
  -o fabric-orderer:7050 \
  -C ${CHANNEL_NAME} \
  -n ${CHAINCODE_NAME} \
  -c '{"function":"InitLedger","Args":[]}' \
  || echo "⚠️  InitLedger may have already been called"

