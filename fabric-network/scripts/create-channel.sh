#!/bin/bash
# Create and join channel on Fabric network

set -e

CHANNEL_NAME=${1:-governance-channel}

echo "📝 Creating channel: $CHANNEL_NAME"

# Set environment variables for peer
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_TLS_ENABLED=false
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051

# Create channel (if channel-artifacts exist)
if [ -f "./channel-artifacts/${CHANNEL_NAME}.tx" ]; then
    echo "Creating channel from transaction file..."
    docker exec fabric-peer peer channel create -o fabric-orderer:7050 -c $CHANNEL_NAME -f /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.tx --outputBlock /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.block
else
    echo "⚠️  Channel transaction file not found. Generating..."
    ./scripts/generate-genesis.sh
    docker exec fabric-peer peer channel create -o fabric-orderer:7050 -c $CHANNEL_NAME -f /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.tx --outputBlock /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.block
fi

# Join peer to channel
echo "Joining peer to channel..."
docker exec fabric-peer peer channel join -b /etc/hyperledger/fabric/channel-artifacts/${CHANNEL_NAME}.block

echo "✅ Channel $CHANNEL_NAME created and peer joined!"




