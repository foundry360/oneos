# Restart backend and verify Realtime subscription starts
Write-Host "Stopping backend processes..." -ForegroundColor Yellow

# Find processes using port 3001
$port3001 = netstat -ano | findstr "3001.*LISTENING"
if ($port3001) {
    $pid = ($port3001 -split '\s+')[-1]
    Write-Host "Found process on port 3001: PID $pid" -ForegroundColor Cyan
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped process $pid" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "No process found on port 3001" -ForegroundColor Yellow
}

# Kill any remaining node processes (be careful!)
$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*OneOS*" -or $_.Path -like "*backend*" }
if ($nodeProcs) {
    Write-Host "Found $($nodeProcs.Count) node process(es)" -ForegroundColor Cyan
    foreach ($proc in $nodeProcs) {
        Write-Host "  PID: $($proc.Id), Path: $($proc.Path)" -ForegroundColor Gray
    }
    $response = Read-Host "Kill these processes? (y/n)"
    if ($response -eq 'y') {
        $nodeProcs | Stop-Process -Force
        Write-Host "Stopped node processes" -ForegroundColor Green
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Host "Now start the backend with:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Look for these log messages:" -ForegroundColor Yellow
Write-Host "  - 'Attempting to start Realtime subscription...'" -ForegroundColor Green
Write-Host "  - 'Initializing Realtime subscription'" -ForegroundColor Green
Write-Host "  - 'Starting Realtime subscription for vendor_api_keys...'" -ForegroundColor Green
Write-Host "  - '✅ Realtime subscription active - listening for license status changes'" -ForegroundColor Green

