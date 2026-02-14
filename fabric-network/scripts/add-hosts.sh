#!/bin/sh
# Add hostname mappings for Fabric network
# This script adds orderer.example.com and peer0.org1.example.com to /etc/hosts

# Get orderer IP from environment or use default
ORDERER_IP=${ORDERER_IP:-fabric-orderer}
PEER_IP=${PEER_IP:-fabric-peer}

# Add entries to /etc/hosts if they don't exist
if ! grep -q "orderer.example.com" /etc/hosts; then
    echo "$ORDERER_IP orderer.example.com" >> /etc/hosts
fi

if ! grep -q "peer0.org1.example.com" /etc/hosts; then
    echo "$PEER_IP peer0.org1.example.com" >> /etc/hosts
fi

# Execute the original command
exec "$@"




