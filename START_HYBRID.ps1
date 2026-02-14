# PowerShell script to start hybrid setup
# Run this from Windows PowerShell

Write-Host "🚀 Starting Hybrid Setup" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Starting App Services (Docker Desktop)..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "Step 2: Starting Fabric Services (WSL2 Ubuntu)..." -ForegroundColor Yellow
Write-Host "Please run the following in WSL2 Ubuntu:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  wsl -d Ubuntu-22.04" -ForegroundColor Green
Write-Host "  cd /mnt/c/OneOS" -ForegroundColor Green
Write-Host "  docker-compose -f docker-compose.fabric.yml up -d" -ForegroundColor Green
Write-Host ""
Write-Host "✅ App services started in Docker Desktop" -ForegroundColor Green
Write-Host "⏳ Fabric services need to be started in WSL2 Ubuntu (see above)" -ForegroundColor Yellow



