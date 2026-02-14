# Stop Hyperledger Fabric network
# PowerShell version for Windows

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir\..

Write-Host "🛑 Stopping Hyperledger Fabric Network..." -ForegroundColor Cyan

# Stop from project root
Set-Location ..
docker-compose stop fabric-ca fabric-orderer fabric-peer explorer-db explorer
docker-compose rm -f fabric-ca fabric-orderer fabric-peer explorer-db explorer

Write-Host "✅ Fabric network stopped!" -ForegroundColor Green




