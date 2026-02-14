#!/bin/bash
# Start Hyperledger Fabric network

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🚀 Starting Hyperledger Fabric Network..."

# Check if crypto materials exist
if [ ! -d "crypto-config" ] || [ -z "$(ls -A crypto-config)" ]; then
    echo "⚠️  Crypto materials not found. Generating..."
    ./scripts/generate-certs.sh
fi

# Check if channel artifacts exist
if [ ! -d "channel-artifacts" ] || [ -z "$(ls -A channel-artifacts)" ]; then
    echo "⚠️  Channel artifacts not found. Generating..."
    ./scripts/generate-genesis.sh
fi

# Start Docker Compose
echo "Starting Docker containers..."
docker-compose -f docker-compose.yaml up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "Checking service status..."
docker-compose -f docker-compose.yaml ps

echo ""
echo "✅ Fabric network started!"
echo ""
echo "📊 Access Hyperledger Explorer at: http://localhost:8080"
echo "🔗 Fabric CA: http://localhost:7054"
echo "🔗 Orderer: localhost:7050"
echo "🔗 Peer: localhost:7051"
echo ""
echo "To view logs: docker-compose -f docker-compose.yaml logs -f"




