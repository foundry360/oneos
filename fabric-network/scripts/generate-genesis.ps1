# Generate genesis block and channel artifacts
# PowerShell version for Windows

Write-Host "Generating channel artifacts..." -ForegroundColor Cyan

# Check if configtxgen exists
$configtxgenPath = Get-Command configtxgen -ErrorAction SilentlyContinue
if (-not $configtxgenPath) {
    Write-Host "configtxgen not found. Downloading Fabric binaries..." -ForegroundColor Yellow
    
    # Note: This requires WSL or Git Bash on Windows
    Write-Host "Please run this script in Git Bash or WSL:" -ForegroundColor Yellow
    Write-Host "  Or download Fabric binaries manually" -ForegroundColor Yellow
    
    exit 1
}

# Set FABRIC_CFG_PATH to current directory
$env:FABRIC_CFG_PATH = $PSScriptRoot\..

Set-Location $PSScriptRoot\..

# Generate genesis block
Write-Host "Generating orderer genesis block..." -ForegroundColor Cyan
configtxgen -profile OrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/orderer.genesis.block

# Generate channel configuration transaction
Write-Host "Generating channel configuration transaction..." -ForegroundColor Cyan
configtxgen -profile GovernanceChannel -outputCreateChannelTx ./channel-artifacts/governance-channel.tx -channelID governance-channel

# Generate anchor peer update
Write-Host "Generating anchor peer update..." -ForegroundColor Cyan
configtxgen -profile GovernanceChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID governance-channel -asOrg Org1MSP

Write-Host "✅ Channel artifacts generated successfully!" -ForegroundColor Green
Write-Host "📁 Output directory: channel-artifacts/" -ForegroundColor Cyan




