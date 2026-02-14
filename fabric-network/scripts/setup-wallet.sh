#!/bin/bash
# Setup wallet with Admin user identity for backend

set -e

WALLET_PATH="../wallet"
CRYPTO_PATH="../crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"

echo "Setting up Fabric wallet..."

# Create wallet directory if it doesn't exist
mkdir -p "$WALLET_PATH"

# Find the private key
PRIV_KEY=$(find "$CRYPTO_PATH/keystore" -name "*_sk" | head -1)
if [ -z "$PRIV_KEY" ]; then
    echo "Error: Private key not found in $CRYPTO_PATH/keystore"
    exit 1
fi

# Find the certificate
CERT=$(find "$CRYPTO_PATH/signcerts" -name "*.pem" | head -1)
if [ -z "$CERT" ]; then
    echo "Error: Certificate not found in $CRYPTO_PATH/signcerts"
    exit 1
fi

# Create Admin identity in wallet format
ADMIN_DIR="$WALLET_PATH/Admin@org1.example.com"
mkdir -p "$ADMIN_DIR"

# Copy private key
cp "$PRIV_KEY" "$ADMIN_DIR/priv_sk"

# Copy certificate
cp "$CERT" "$ADMIN_DIR/cert.pem"

# Create msp directory structure
mkdir -p "$ADMIN_DIR/msp/keystore"
mkdir -p "$ADMIN_DIR/msp/signcerts"
mkdir -p "$ADMIN_DIR/msp/admincerts"

# Copy to msp structure
cp "$PRIV_KEY" "$ADMIN_DIR/msp/keystore/"
cp "$CERT" "$ADMIN_DIR/msp/signcerts/"
cp "$CERT" "$ADMIN_DIR/msp/admincerts/"

echo "✅ Wallet setup complete!"
echo "   Admin identity: $ADMIN_DIR"
echo "   Private key: $(basename $PRIV_KEY)"
echo "   Certificate: $(basename $CERT)"




