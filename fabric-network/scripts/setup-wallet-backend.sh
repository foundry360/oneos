#!/bin/bash
# Setup wallet with Admin user identity for backend
# This script creates a wallet in the format expected by fabric-network SDK

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

WALLET_PATH="./wallet"
CRYPTO_PATH="./crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
USER_ID="Admin@org1.example.com"

echo "🔐 Setting up Fabric wallet for backend..."

# Create wallet directory if it doesn't exist
mkdir -p "$WALLET_PATH"

# Check if crypto materials exist
if [ ! -d "$CRYPTO_PATH" ]; then
    echo "❌ Error: Crypto materials not found at $CRYPTO_PATH"
    echo "   Please run: ./scripts/generate-certs.sh"
    exit 1
fi

# Find the private key
PRIV_KEY=$(find "$CRYPTO_PATH/keystore" -name "*_sk" | head -1)
if [ -z "$PRIV_KEY" ]; then
    echo "❌ Error: Private key not found in $CRYPTO_PATH/keystore"
    exit 1
fi

# Find the certificate
CERT=$(find "$CRYPTO_PATH/signcerts" -name "*.pem" | head -1)
if [ -z "$CERT" ]; then
    echo "❌ Error: Certificate not found in $CRYPTO_PATH/signcerts"
    exit 1
fi

# Create user identity directory in wallet
USER_DIR="$WALLET_PATH/$USER_ID"
mkdir -p "$USER_DIR"

# Copy private key (fabric-network SDK expects it in the user directory)
cp "$PRIV_KEY" "$USER_DIR/priv_sk"

# Copy certificate
cp "$CERT" "$USER_DIR/cert.pem"

# Create msp directory structure (for compatibility)
mkdir -p "$USER_DIR/msp/keystore"
mkdir -p "$USER_DIR/msp/signcerts"
mkdir -p "$USER_DIR/msp/admincerts"

# Copy to msp structure
cp "$PRIV_KEY" "$USER_DIR/msp/keystore/"
cp "$CERT" "$USER_DIR/msp/signcerts/"
cp "$CERT" "$USER_DIR/msp/admincerts/"

# Create identity JSON file (fabric-network SDK format)
IDENTITY_JSON=$(cat <<EOF
{
  "credentials": {
    "certificate": "$(cat $CERT | sed ':a;N;$!ba;s/\n/\\n/g')",
    "privateKey": "$(cat $PRIV_KEY | sed ':a;N;$!ba;s/\n/\\n/g')"
  },
  "mspId": "Org1MSP",
  "type": "X.509"
}
EOF
)

echo "$IDENTITY_JSON" > "$USER_DIR/identity.json"

echo ""
echo "✅ Wallet setup complete!"
echo "   Wallet path: $WALLET_PATH"
echo "   User identity: $USER_ID"
echo "   Private key: $(basename $PRIV_KEY)"
echo "   Certificate: $(basename $CERT)"
echo "   MSP ID: Org1MSP"
echo ""
echo "The wallet is now ready for use by the backend service."




