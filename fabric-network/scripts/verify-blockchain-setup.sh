#!/bin/bash
# Verify blockchain setup for backend

set -e

echo "🔍 Verifying blockchain setup for backend..."
echo ""

# Check if connection profile exists
if [ -f "connection-profile.json" ]; then
    echo "✅ Connection profile exists"
else
    echo "❌ Connection profile NOT found at: connection-profile.json"
    exit 1
fi

# Check if wallet exists
if [ -d "wallet" ]; then
    echo "✅ Wallet directory exists"
    
    # Check if Admin identity exists
    if [ -d "wallet/Admin@org1.example.com" ]; then
        echo "✅ Admin identity exists in wallet"
        
        # Check for required files
        if [ -f "wallet/Admin@org1.example.com/priv_sk" ] || [ -f "wallet/Admin@org1.example.com/identity.json" ]; then
            echo "✅ Admin identity files found"
        else
            echo "⚠️  Admin identity files missing - run setup-wallet-backend.sh"
        fi
    else
        echo "❌ Admin identity NOT found in wallet"
        echo "   Run: ./scripts/setup-wallet-backend.sh"
        exit 1
    fi
else
    echo "❌ Wallet directory NOT found"
    echo "   Run: ./scripts/setup-wallet-backend.sh"
    exit 1
fi

# Check if crypto materials exist
if [ -d "crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com" ]; then
    echo "✅ Crypto materials exist"
else
    echo "⚠️  Crypto materials not found - may need to generate"
    echo "   Run: ./scripts/generate-certs.sh"
fi

echo ""
echo "✅ Blockchain setup verification complete!"
echo ""
echo "To test from backend container:"
echo "  docker exec ai-gov-backend ls -la /app/fabric-network/wallet/"




