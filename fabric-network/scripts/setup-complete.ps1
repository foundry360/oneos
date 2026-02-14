# PowerShell script to complete blockchain setup
# Run this from the fabric-network directory

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Blockchain Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if crypto materials exist
Write-Host "Step 1: Checking crypto materials..." -ForegroundColor Yellow
if (-not (Test-Path "crypto-config\peerOrganizations\org1.example.com\users\Admin@org1.example.com")) {
    Write-Host "Crypto materials not found. Generating..." -ForegroundColor Yellow
    
    if (Test-Path "scripts\generate-certs.ps1") {
        & "scripts\generate-certs.ps1"
    } else {
        Write-Host "Error: generate-certs.ps1 not found!" -ForegroundColor Red
        Write-Host "Please generate crypto materials manually using Docker:" -ForegroundColor Yellow
        Write-Host "  docker run --rm -v `"${PWD}:/work`" -w /work hyperledger/fabric-tools:2.5 cryptogen generate --config=./crypto-config.yaml --output=./crypto-config" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "Crypto materials already exist" -ForegroundColor Green
}

# Step 2: Setup wallet
Write-Host ""
Write-Host "Step 2: Setting up wallet..." -ForegroundColor Yellow
if (Test-Path "scripts\setup-wallet-backend.ps1") {
    & "scripts\setup-wallet-backend.ps1"
} else {
    Write-Host "Error: setup-wallet-backend.ps1 not found!" -ForegroundColor Red
    exit 1
}

# Step 3: Check if channel exists
Write-Host ""
Write-Host "Step 3: Checking channel..." -ForegroundColor Yellow
$channelCheck = docker exec fabric-peer peer channel list 2>&1
if ($channelCheck -match "governance-channel") {
    Write-Host "Channel governance-channel exists" -ForegroundColor Green
} else {
    Write-Host "Warning: Channel may not exist. You may need to create it." -ForegroundColor Yellow
    Write-Host "Run: docker exec fabric-peer peer channel create -o fabric-orderer:7050 -c governance-channel -f /etc/hyperledger/fabric/channel-artifacts/governance-channel.tx" -ForegroundColor White
}

# Step 4: Check chaincode
Write-Host ""
Write-Host "Step 4: Checking chaincode..." -ForegroundColor Yellow
$chaincodeCheck = docker exec fabric-peer peer lifecycle chaincode querycommitted -C governance-channel -n governance-ledger 2>&1
if ($chaincodeCheck -match "Version: 1.0" -or $chaincodeCheck -match "Committed chaincode definition") {
    Write-Host "Chaincode governance-ledger is deployed" -ForegroundColor Green
} else {
    Write-Host "Warning: Chaincode may not be deployed." -ForegroundColor Yellow
    Write-Host "You may need to deploy it using the deploy-chaincode script (requires bash/WSL)" -ForegroundColor White
}

# Step 5: Verify wallet in container
Write-Host ""
Write-Host "Step 5: Verifying wallet in backend container..." -ForegroundColor Yellow
$walletCheck = docker exec ai-gov-backend sh -c "test -d /app/fabric-network/wallet/Admin@org1.example.com && echo 'EXISTS' || echo 'NOT_FOUND'" 2>&1
if ($walletCheck -match "EXISTS") {
    Write-Host "Wallet is accessible in backend container" -ForegroundColor Green
} else {
    Write-Host "Warning: Wallet not found in container. Restarting backend..." -ForegroundColor Yellow
    docker-compose restart backend
    Start-Sleep -Seconds 5
    $walletCheck2 = docker exec ai-gov-backend sh -c "test -d /app/fabric-network/wallet/Admin@org1.example.com && echo 'EXISTS' || echo 'NOT_FOUND'" 2>&1
    if ($walletCheck2 -match "EXISTS") {
        Write-Host "Wallet is now accessible" -ForegroundColor Green
    } else {
        Write-Host "Error: Wallet still not accessible. Check volume mounts." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart backend: docker-compose restart backend" -ForegroundColor White
Write-Host "2. Try exporting a profile again" -ForegroundColor White
Write-Host "3. Check logs: docker logs ai-gov-backend --tail 20 | Select-String 'blockchain'" -ForegroundColor White
Write-Host ""




