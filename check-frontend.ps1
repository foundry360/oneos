Write-Host "Checking Frontend Status..." -ForegroundColor Cyan
Write-Host ""

# Check if port 3000 is in use
$port = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "✅ Port 3000 is in use" -ForegroundColor Green
    $port | Select-Object LocalAddress, LocalPort, State | Format-Table
} else {
    Write-Host "❌ Port 3000 is NOT in use - Frontend server is not running" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking if .next folder exists..." -ForegroundColor Cyan
if (Test-Path "frontend\.next") {
    Write-Host "✅ .next folder exists" -ForegroundColor Green
} else {
    Write-Host "❌ .next folder missing - Next.js needs to compile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To start the frontend, run:" -ForegroundColor Yellow
Write-Host "  cd frontend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White




