#!/bin/bash
# Complete deployment script for Hyperledger Fabric network and chaincode
# This script sets up everything needed for blockchain integration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🚀 Starting complete Fabric deployment..."
echo ""

# Step 1: Generate crypto materials if needed
if [ ! -d "crypto-config" ] || [ -z "$(ls -A crypto-config)" ]; then
    echo "📝 Step 1: Generating crypto materials..."
    ./scripts/generate-certs.sh
else
    echo "✅ Step 1: Crypto materials already exist"
fi

# Step 2: Generate channel artifacts if needed
if [ ! -d "channel-artifacts" ] || [ -z "$(ls -A channel-artifacts)" ]; then
    echo "📝 Step 2: Generating channel artifacts..."
    ./scripts/generate-genesis.sh
else
    echo "✅ Step 2: Channel artifacts already exist"
fi

# Step 3: Start Fabric network
echo ""
echo "📝 Step 3: Starting Fabric network..."
if [ -f "../docker-compose.yml" ]; then
    cd ..
    docker-compose up -d fabric-ca fabric-orderer fabric-peer
    cd fabric-network
else
    docker-compose -f docker-compose.yaml up -d
fi

echo "⏳ Waiting for services to be ready..."
sleep 15

# Step 4: Create channel
echo ""
echo "📝 Step 4: Creating governance-channel..."
./scripts/create-channel.sh governance-channel || {
    echo "⚠️  Channel may already exist, continuing..."
}

# Step 5: Setup wallet
echo ""
echo "📝 Step 5: Setting up wallet for backend..."
./scripts/setup-wallet-backend.sh

# Step 6: Deploy chaincode
echo ""
echo "📝 Step 6: Deploying chaincode..."
./scripts/deploy-chaincode.sh

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "   1. Verify network is running: docker ps | grep fabric"
echo "   2. Check chaincode status: docker exec fabric-peer peer lifecycle chaincode querycommitted -C governance-channel -n governance-ledger"
echo "   3. View logs: docker-compose -f docker-compose.yaml logs -f"
echo "   4. Access Explorer: http://localhost:8080"
echo ""
echo "🔗 Backend should now be able to connect to the blockchain!"




