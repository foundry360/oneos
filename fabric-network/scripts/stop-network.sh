#!/bin/bash
# Stop Hyperledger Fabric network

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🛑 Stopping Hyperledger Fabric Network..."

docker-compose -f docker-compose.yaml down

echo "✅ Fabric network stopped!"




