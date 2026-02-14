#!/bin/bash
# Generate cryptographic materials for Hyperledger Fabric network

set -e

echo "Generating cryptographic materials..."

# Check if cryptogen exists, if not download it
if ! command -v cryptogen &> /dev/null; then
    echo "cryptogen not found. Downloading Fabric binaries..."
    curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/bootstrap.sh | bash -s -- 2.5.7 1.5.7
    export PATH=$PATH:./fabric-samples/bin
fi

# Generate crypto materials
cryptogen generate --config=./crypto-config.yaml --output="crypto-config"

echo "✅ Cryptographic materials generated successfully!"
echo "📁 Output directory: crypto-config/"




