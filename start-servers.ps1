# PowerShell script to start both backend and frontend servers

Write-Host "Starting Backend and Frontend servers..." -ForegroundColor Green

# Start Backend
Write-Host "`n[1/2] Starting Backend server on port 3001..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location backend
    npm run dev
}

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "[2/2] Starting Frontend server on port 3000..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location frontend
    npm run dev
}

Write-Host "`n✅ Both servers are starting in the background!" -ForegroundColor Green
Write-Host "`nBackend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nTo view logs, run:" -ForegroundColor Yellow
Write-Host "  Get-Job | Receive-Job -Keep" -ForegroundColor White
Write-Host "`nTo stop servers, run:" -ForegroundColor Yellow
Write-Host "  Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor White

# Keep jobs running
$backendJob, $frontendJob | Out-Null

