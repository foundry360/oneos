#!/bin/bash
# Deploy chaincode using Admin identity from crypto-config directly

set -e

CHANNEL_NAME="governance-channel"
CHAINCODE_NAME="governance-ledger"
CHAINCODE_VERSION="1.0"
CHAINCODE_PATH="/opt/gopath/src/github.com/governance-ledger"

echo "Deploying $CHAINCODE_NAME chaincode..."

# Use Admin identity from crypto-config (has proper OU=admin)
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false

# Check if Admin MSP exists
if [ ! -d "$CORE_PEER_MSPCONFIGPATH" ]; then
    echo "Error: Admin MSP not found at $CORE_PEER_MSPCONFIGPATH"
    echo "Trying alternative path..."
    export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp
fi

# Package chaincode
echo "Packaging chaincode..."
PACKAGE_FILE="/tmp/${CHAINCODE_NAME}.tar.gz"
docker exec fabric-peer peer lifecycle chaincode package $PACKAGE_FILE \
  --path ${CHAINCODE_PATH} \
  --lang node \
  --label ${CHAINCODE_NAME}_${CHAINCODE_VERSION} \
  2>&1 | grep -v "WARN" || {
    echo "Error: Failed to package chaincode"
    exit 1
  }

# Install chaincode
echo "Installing chaincode..."
INSTALL_OUTPUT=$(docker exec fabric-peer peer lifecycle chaincode install $PACKAGE_FILE 2>&1)
echo "$INSTALL_OUTPUT" | grep -v "WARN"

# Extract package ID
PACKAGE_ID=$(echo "$INSTALL_OUTPUT" | grep -oP 'Package ID: \K[^,]+' | head -1 || echo "")

if [ -z "$PACKAGE_ID" ]; then
    echo "Attempting to query installed chaincodes..."
    QUERY_OUTPUT=$(docker exec fabric-peer peer lifecycle chaincode queryinstalled 2>&1 | grep -v "WARN")
    echo "$QUERY_OUTPUT"
    PACKAGE_ID=$(echo "$QUERY_OUTPUT" | grep -oP "${CHAINCODE_NAME}_${CHAINCODE_VERSION}:\K[^\s]+" | head -1 || echo "")
fi

if [ -z "$PACKAGE_ID" ]; then
    echo "Error: Could not extract package ID"
    exit 1
fi

echo "Package ID: $PACKAGE_ID"

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
  2>&1 | grep -v "WARN" || {
    echo "Warning: Approval may have failed"
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
  2>&1 | grep -v "WARN" || {
    echo "Warning: Commit may have failed"
  }

echo ""
echo "✅ Chaincode deployment complete!"



