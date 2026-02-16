#!/bin/bash

# Customer Installation Script
# This script validates the vendor API key and completes installation

set -e

echo "=========================================="
echo "  AI Governance Platform Installation"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get API URL from environment or use default
API_URL="${API_URL:-http://localhost:3001}"

# Check if API URL is accessible
echo "Checking API connectivity..."
if ! curl -s -f "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to API at ${API_URL}${NC}"
    echo "Please ensure the backend server is running."
    exit 1
fi
echo -e "${GREEN}✓ API is accessible${NC}"
echo ""

# Prompt for vendor API key
echo "Please enter your vendor API key."
echo "This key was provided to you during onboarding."
echo ""
read -sp "Vendor API Key: " VENDOR_API_KEY
echo ""
echo ""

if [ -z "$VENDOR_API_KEY" ]; then
    echo -e "${RED}Error: API key is required${NC}"
    exit 1
fi

# Optional: Prompt for customer info (if not auto-detected)
echo "Optional: Provide additional customer information"
read -p "Customer Name (optional): " CUSTOMER_NAME
read -p "Contact Email (optional): " CONTACT_EMAIL
echo ""

# Validate API key
echo "Validating API key with vendor..."
VALIDATION_RESPONSE=$(curl -s -X POST "${API_URL}/api/installation/validate-key" \
  -H "Content-Type: application/json" \
  -H "X-Installation-URL: ${INSTALLATION_URL:-${API_URL}}" \
  -d "{
    \"apiKey\": \"${VENDOR_API_KEY}\",
    \"customerName\": \"${CUSTOMER_NAME}\",
    \"contactEmail\": \"${CONTACT_EMAIL}\"
  }")

# Check if validation was successful
if echo "$VALIDATION_RESPONSE" | grep -q '"valid":true'; then
    echo -e "${GREEN}✓ API key validated successfully!${NC}"
    echo ""
    
    # Extract customer info
    CUSTOMER_CODE=$(echo "$VALIDATION_RESPONSE" | grep -o '"customerCode":"[^"]*' | cut -d'"' -f4)
    INSTALLATION_ID=$(echo "$VALIDATION_RESPONSE" | grep -o '"installationId":"[^"]*' | cut -d'"' -f4)
    SUBSCRIPTION_TIER=$(echo "$VALIDATION_RESPONSE" | grep -o '"subscriptionTier":"[^"]*' | cut -d'"' -f4)
    
    echo "Installation Details:"
    echo "  Customer Code: ${CUSTOMER_CODE}"
    echo "  Installation ID: ${INSTALLATION_ID}"
    echo "  Subscription Tier: ${SUBSCRIPTION_TIER}"
    echo ""
    
    # Save to .env file
    ENV_FILE=".env"
    if [ -f "$ENV_FILE" ]; then
        # Update existing .env
        if grep -q "VENDOR_API_KEY" "$ENV_FILE"; then
            sed -i.bak "s|VENDOR_API_KEY=.*|VENDOR_API_KEY=${VENDOR_API_KEY}|" "$ENV_FILE"
        else
            echo "" >> "$ENV_FILE"
            echo "# Vendor API Key" >> "$ENV_FILE"
            echo "VENDOR_API_KEY=${VENDOR_API_KEY}" >> "$ENV_FILE"
        fi
        
        if grep -q "INSTALLATION_ID" "$ENV_FILE"; then
            sed -i.bak "s|INSTALLATION_ID=.*|INSTALLATION_ID=${INSTALLATION_ID}|" "$ENV_FILE"
        else
            echo "INSTALLATION_ID=${INSTALLATION_ID}" >> "$ENV_FILE"
        fi
    else
        # Create new .env
        cat > "$ENV_FILE" << EOF
# Vendor API Key (validated during installation)
VENDOR_API_KEY=${VENDOR_API_KEY}

# Installation ID
INSTALLATION_ID=${INSTALLATION_ID}

# Customer Code
CUSTOMER_CODE=${CUSTOMER_CODE}
EOF
    fi
    
    echo -e "${GREEN}✓ Configuration saved to .env${NC}"
    echo ""
    echo "Installation completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Review your .env file"
    echo "  2. Start the backend server: npm start"
    echo "  3. Your end-users can now use the SDK with this API key"
    echo ""
    
else
    echo -e "${RED}✗ API key validation failed${NC}"
    echo ""
    echo "Response:"
    echo "$VALIDATION_RESPONSE" | jq '.' 2>/dev/null || echo "$VALIDATION_RESPONSE"
    echo ""
    echo "Please check:"
    echo "  - API key is correct"
    echo "  - API key hasn't been revoked"
    echo "  - Vendor API is accessible"
    echo ""
    exit 1
fi


