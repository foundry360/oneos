#!/bin/bash
# Generate genesis block and channel artifacts

set -e

echo "Generating channel artifacts..."

# Check if configtxgen exists
if ! command -v configtxgen &> /dev/null; then
    echo "configtxgen not found. Downloading Fabric binaries..."
    curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/bootstrap.sh | bash -s -- 2.5.7 1.5.7
    export PATH=$PATH:./fabric-samples/bin
fi

# Set FABRIC_CFG_PATH to current directory
export FABRIC_CFG_PATH=$PWD

# Generate genesis block
echo "Generating orderer genesis block..."
configtxgen -profile OrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/orderer.genesis.block

# Generate channel configuration transaction
echo "Generating channel configuration transaction..."
configtxgen -profile GovernanceChannel -outputCreateChannelTx ./channel-artifacts/governance-channel.tx -channelID governance-channel

# Generate anchor peer update
echo "Generating anchor peer update..."
configtxgen -profile GovernanceChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID governance-channel -asOrg Org1MSP

echo "✅ Channel artifacts generated successfully!"
echo "📁 Output directory: channel-artifacts/"




