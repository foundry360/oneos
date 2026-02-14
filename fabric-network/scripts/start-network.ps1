# Start Hyperledger Fabric network
# PowerShell version for Windows

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir\..

Write-Host "🚀 Starting Hyperledger Fabric Network..." -ForegroundColor Cyan

# Check if crypto materials exist
if (-not (Test-Path "crypto-config") -or (Get-ChildItem "crypto-config" -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) {
    Write-Host "⚠️  Crypto materials not found. Generating..." -ForegroundColor Yellow
    & "$ScriptDir\generate-certs.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to generate certificates. Please run generate-certs.ps1 manually." -ForegroundColor Red
        exit 1
    }
}

# Check if channel artifacts exist
if (-not (Test-Path "channel-artifacts\orderer.genesis.block")) {
    Write-Host "⚠️  Channel artifacts not found. Generating..." -ForegroundColor Yellow
    & "$ScriptDir\generate-genesis.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to generate channel artifacts. Please run generate-genesis.ps1 manually." -ForegroundColor Red
        exit 1
    }
}

# Start Docker Compose (from project root)
Set-Location ..
Write-Host "Starting Docker containers..." -ForegroundColor Cyan
docker-compose up -d fabric-ca fabric-orderer fabric-peer explorer-db explorer

Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Check service status
Write-Host "Checking service status..." -ForegroundColor Cyan
docker-compose ps fabric-ca fabric-orderer fabric-peer explorer-db explorer

Write-Host ""
Write-Host "✅ Fabric network started!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Access Hyperledger Explorer at: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🔗 Fabric CA: http://localhost:7054" -ForegroundColor Cyan
Write-Host "🔗 Orderer: localhost:7050" -ForegroundColor Cyan
Write-Host "🔗 Peer: localhost:7051" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view logs: docker-compose logs -f fabric-peer" -ForegroundColor Yellow




