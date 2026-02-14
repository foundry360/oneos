#!/bin/bash
# Simple chaincode deployment for external chaincode
set -e

export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false

CHANNEL="governance-channel"
CC_NAME="governance-ledger"
CC_VERSION="1.0"
CC_SEQUENCE="1"
CONN_JSON="/opt/gopath/src/github.com/governance-ledger/connection.json"

echo "Approving chaincode..."
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
  --connection-profile $CONN_JSON
" 2>&1

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
  --sequence $CC_SEQUENCE \
  --connection-profile $CONN_JSON
" 2>&1

echo ""
echo "✅ Done! Checking status..."
docker exec fabric-peer sh -c "
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false
peer lifecycle chaincode querycommitted --channelID $CHANNEL
" 2>&1


