#!/bin/bash
# Quick Install Script for Governance LLM SDK
# Usage: curl -sSL https://governance.yourcompany.com/install.sh | bash

set -e

echo "🚀 Installing Governance LLM SDK..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Download SDK
echo "📥 Downloading SDK..."
SDK_URL="${GOVERNANCE_SDK_URL:-https://governance.yourcompany.com/sdk/govern-llm.js}"
curl -sSL -o govern-llm.js "$SDK_URL"

if [ ! -f "govern-llm.js" ]; then
    echo -e "${RED}❌ Failed to download SDK${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SDK downloaded${NC}"
echo ""

# Step 2: Get API key
echo -e "${YELLOW}Enter your API key (or press Enter to set later):${NC}"
read -r API_KEY

if [ -n "$API_KEY" ]; then
    # Detect shell and add to appropriate config file
    if [ -n "$ZSH_VERSION" ]; then
        CONFIG_FILE="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        CONFIG_FILE="$HOME/.bashrc"
    else
        CONFIG_FILE="$HOME/.profile"
    fi
    
    echo "" >> "$CONFIG_FILE"
    echo "# Governance LLM SDK" >> "$CONFIG_FILE"
    echo "export GOVERNANCE_API_KEY=\"$API_KEY\"" >> "$CONFIG_FILE"
    echo "export GOVERNANCE_API_URL=\"${GOVERNANCE_API_URL:-https://governance.yourcompany.com}\"" >> "$CONFIG_FILE"
    
    echo -e "${GREEN}✅ Environment variables added to $CONFIG_FILE${NC}"
    echo ""
    echo "Run 'source $CONFIG_FILE' or restart your terminal to apply changes."
else
    echo -e "${YELLOW}⚠️  API key not set. Set it manually:${NC}"
    echo "  export GOVERNANCE_API_KEY=\"your-api-key\""
    echo "  export GOVERNANCE_API_URL=\"https://governance.yourcompany.com\""
fi

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. Add to your code:"
echo "     const { governLLM } = require('./govern-llm.js');"
echo ""
echo "  2. Use it:"
echo "     const response = await governLLM.complete({"
echo "       prompt: 'Your prompt here',"
echo "       model: 'gpt-4'"
echo "     });"
echo ""
echo "📚 Documentation: https://docs.governance.yourcompany.com"

