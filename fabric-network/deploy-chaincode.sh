#!/bin/bash
# Script to create channel and deploy chaincode
# Run this in WSL2 Ubuntu

set -e

echo "🚀 Starting Chaincode Deployment"
echo ""

# Set environment variables
export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
export CORE_PEER_TLS_ENABLED=false

CHANNEL_NAME="governance-channel"
CHAINCODE_NAME="governance-ledger"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="1"

# Step 1: Check if channel exists
echo "Step 1: Checking if channel exists..."
CHANNEL_EXISTS=$(docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer channel list" 2>&1 | grep -c "$CHANNEL_NAME" || echo "0")

if [ "$CHANNEL_EXISTS" = "0" ]; then
    echo "   Channel does not exist. Creating channel..."
    
    # Create channel
    docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer channel create -o fabric-orderer:7050 -c $CHANNEL_NAME -f /etc/hyperledger/fabric/channel-artifacts/$CHANNEL_NAME.tx" 2>&1 | tail -5
    
    echo "   ✅ Channel created"
    
    # Join peer to channel
    echo "   Joining peer to channel..."
    docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer channel join -b $CHANNEL_NAME.block" 2>&1 | tail -3
    
    echo "   ✅ Peer joined channel"
else
    echo "   ✅ Channel already exists"
    
    # Make sure peer is joined
    echo "   Verifying peer is joined to channel..."
    docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer channel join -b /etc/hyperledger/fabric/channel-artifacts/$CHANNEL_NAME.block" 2>&1 | tail -3 || echo "   (Already joined or block not found)"
fi

# Step 2: Check if chaincode is installed
echo ""
echo "Step 2: Checking if chaincode is installed..."
INSTALLED=$(docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled" 2>&1 | grep -c "$CHAINCODE_NAME" || echo "0")

if [ "$INSTALLED" = "0" ]; then
    echo "   Chaincode not installed. Installing..."
    
    # Check if chaincode package exists
    if [ ! -f "/mnt/c/OneOS/fabric-network/chaincode/governance-ledger/governance-ledger-with-deps.tar.gz" ]; then
        echo "   ⚠️  Chaincode package not found. Building..."
        cd /mnt/c/OneOS/fabric-network/chaincode/governance-ledger
        tar -czf governance-ledger-with-deps.tar.gz .
        cd /mnt/c/OneOS
    fi
    
    # Copy package to peer
    docker cp /mnt/c/OneOS/fabric-network/chaincode/governance-ledger/governance-ledger-with-deps.tar.gz fabric-peer:/tmp/
    
    # Install chaincode
    docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode install /tmp/governance-ledger-with-deps.tar.gz" 2>&1 | tail -5
    
    echo "   ✅ Chaincode installed"
else
    echo "   ✅ Chaincode already installed"
fi

# Step 3: Get package ID
echo ""
echo "Step 3: Getting package ID..."
PACKAGE_ID=$(docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode queryinstalled" 2>&1 | grep "$CHAINCODE_NAME" | sed -n 's/.*Package ID: \([^,]*\).*/\1/p' | head -1)

if [ -z "$PACKAGE_ID" ]; then
    echo "   ❌ Could not find package ID"
    exit 1
fi

echo "   Package ID: $PACKAGE_ID"

# Step 4: Check if chaincode is approved
echo ""
echo "Step 4: Checking if chaincode is approved..."
APPROVED=$(docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME" 2>&1 | grep -c "$CHAINCODE_NAME" || echo "0")

if [ "$APPROVED" = "0" ]; then
    echo "   Approving chaincode..."
    
    # Approve chaincode
    docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode approveformyorg -o fabric-orderer:7050 --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $CHAINCODE_VERSION --package-id $PACKAGE_ID --sequence $CHAINCODE_SEQUENCE" 2>&1 | tail -5
    
    echo "   ✅ Chaincode approved"
    
    # Step 5: Commit chaincode
    echo ""
    echo "Step 5: Committing chaincode to channel..."
    docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode commit -o fabric-orderer:7050 --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $CHAINCODE_VERSION --sequence $CHAINCODE_SEQUENCE" 2>&1 | tail -5
    
    echo "   ✅ Chaincode committed"
else
    echo "   ✅ Chaincode already approved and committed"
fi

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "Chaincode Status:"
docker exec fabric-peer sh -c "export CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/users/Admin@org1.example.com/msp && export CORE_PEER_LOCALMSPID=Org1MSP && export CORE_PEER_ADDRESS=peer0.org1.example.com:7051 && export CORE_PEER_TLS_ENABLED=false && peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME" 2>&1 | grep -A 5 "$CHAINCODE_NAME" || echo "   (Query failed, but deployment may have succeeded)"


