#!/bin/bash
# Script to create a customer account and API key
# Usage: ./create-customer.sh

set -e

# Configuration
ADMIN_TOKEN="${GOVERNANCE_ADMIN_TOKEN}"
API_URL="${GOVERNANCE_API_URL:-https://governance.yourcompany.com}"

if [ -z "$ADMIN_TOKEN" ]; then
    echo "Error: GOVERNANCE_ADMIN_TOKEN environment variable not set"
    exit 1
fi

echo "🏢 Creating Customer Account..."
echo ""

# Get customer information
read -p "Customer Name: " CUSTOMER_NAME
read -p "Customer Code (short unique identifier): " CUSTOMER_CODE
read -p "Contact Email: " CONTACT_EMAIL
read -p "Contact Name (optional): " CONTACT_NAME
read -p "Domain (optional, for governance profile): " DOMAIN

# Create customer account
echo ""
echo "Creating customer account..."
CUSTOMER_RESPONSE=$(curl -s -X POST "$API_URL/api/customers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customerName\": \"$CUSTOMER_NAME\",
    \"customerCode\": \"$CUSTOMER_CODE\",
    \"contactEmail\": \"$CONTACT_EMAIL\",
    \"contactName\": \"$CONTACT_NAME\",
    \"domain\": \"$DOMAIN\"
  }")

CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CUSTOMER_ID" ]; then
    echo "Error: Failed to create customer account"
    echo "Response: $CUSTOMER_RESPONSE"
    exit 1
fi

echo "✅ Customer account created: $CUSTOMER_ID"
echo ""

# Create API key
read -p "API Key Name (optional): " KEY_NAME
KEY_NAME=${KEY_NAME:-"Default Key"}

echo ""
echo "Creating API key..."
API_KEY_RESPONSE=$(curl -s -X POST "$API_URL/api/customers/$CUSTOMER_ID/api-keys" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"keyName\": \"$KEY_NAME\"
  }")

API_KEY=$(echo "$API_KEY_RESPONSE" | grep -o '"apiKey":"[^"]*' | cut -d'"' -f4)

if [ -z "$API_KEY" ]; then
    echo "Error: Failed to create API key"
    echo "Response: $API_KEY_RESPONSE"
    exit 1
fi

echo "✅ API key created!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CUSTOMER CREDENTIALS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Customer ID: $CUSTOMER_ID"
echo "Customer Code: $CUSTOMER_CODE"
echo ""
echo "API Key: $API_KEY"
echo ""
echo "⚠️  IMPORTANT: Save this API key now - it won't be shown again!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📧 Send to customer:"
echo "   - API Key: $API_KEY"
echo "   - API URL: $API_URL"
echo "   - Installation Guide: https://docs.governance.yourcompany.com/install"
echo ""

