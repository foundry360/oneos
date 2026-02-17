# Clean restart script for backend
Write-Host "Stopping backend processes..." -ForegroundColor Yellow

# Find and stop processes on port 3001
$portProcesses = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($portProcesses) {
    foreach ($pid in $portProcesses) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "Stopping process $pid ($($proc.ProcessName))..." -ForegroundColor Cyan
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "Could not stop process $pid" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 2
    Write-Host "Processes stopped" -ForegroundColor Green
} else {
    Write-Host "No processes found on port 3001" -ForegroundColor Yellow
}

# Verify port is free
$stillRunning = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($stillRunning) {
    Write-Host "Warning: Port 3001 still in use" -ForegroundColor Red
} else {
    Write-Host "Port 3001 is free" -ForegroundColor Green
}

Write-Host ""
Write-Host "Now start the backend:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Cyan

