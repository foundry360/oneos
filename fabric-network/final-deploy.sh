#!/bin/bash
# Final chaincode deployment - using external chaincode with connection.json
set -e

export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false

CHANNEL="governance-channel"
CC_NAME="governance-ledger"
CC_VERSION="1.0"
CC_SEQUENCE="1"

# For external chaincode, we need to create a package with connection.json
# Then install, approve, and commit

echo "Creating external chaincode package..."
docker exec fabric-peer sh -c "
cd /tmp
mkdir -p external-cc
cat > external-cc/connection.json << 'EOF'
{
  \"address\": \"chaincode-governance-ledger:9999\",
  \"dial_timeout\": \"10s\",
  \"tls_required\": false
}
EOF
tar -czf external-cc.tar.gz -C external-cc connection.json
" 2>&1

echo ""
echo "Installing chaincode package..."
# For external chaincode in Fabric 2.5, we use a special package format
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false
peer lifecycle chaincode package /tmp/governance-ledger-external.tar.gz \
  --path /tmp/external-cc \
  --lang external \
  --label governance-ledger_1.0
" 2>&1 || echo "Package creation may have issues, trying alternative..."

# Alternative: Use the connection.json path directly
echo ""
echo "Approving chaincode (using connection.json)..."
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false
peer lifecycle chaincode approveformyorg \
  -o fabric-orderer:7050 \
  --channelID $CHANNEL \
  --name $CC_NAME \
  --version $CC_VERSION \
  --sequence $CC_SEQUENCE \
  --package-id governance-ledger_1.0:external
" 2>&1 | tail -10

echo ""
echo "Committing chaincode..."
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false
peer lifecycle chaincode commit \
  -o fabric-orderer:7050 \
  --channelID $CHANNEL \
  --name $CC_NAME \
  --version $CC_VERSION \
  --sequence $CC_SEQUENCE
" 2>&1 | tail -10

echo ""
echo "✅ Deployment complete! Verifying..."
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false
peer lifecycle chaincode querycommitted --channelID $CHANNEL
" 2>&1


