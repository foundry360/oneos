# Start localtunnel and display the URL
Write-Host "Starting localtunnel on port 3001..." -ForegroundColor Green
Write-Host ""

# Start localtunnel
$process = Start-Process -FilePath "npx" -ArgumentList "--yes", "localtunnel", "--port", "3001" -NoNewWindow -PassThru -RedirectStandardOutput "tunnel-output.txt" -RedirectStandardError "tunnel-error.txt"

Write-Host "Tunnel is starting..." -ForegroundColor Yellow
Write-Host "Waiting for URL..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Try to read the output
if (Test-Path "tunnel-output.txt") {
    $output = Get-Content "tunnel-output.txt" -ErrorAction SilentlyContinue
    if ($output) {
        Write-Host ""
        Write-Host "Tunnel Output:" -ForegroundColor Cyan
        $output | ForEach-Object { Write-Host $_ }
        
        # Try to extract URL
        $urlLine = $output | Where-Object { $_ -match "https://.*\.loca\.lt" }
        if ($urlLine) {
            Write-Host ""
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host "Tunnel URL: $urlLine" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host ""
            Write-Host "Webhook URL for Supabase:" -ForegroundColor Yellow
            Write-Host "$urlLine/api/webhooks/license-status" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
Write-Host "Note: The tunnel is running in the background." -ForegroundColor Yellow
Write-Host "To see the URL, check the terminal where you started it, or" -ForegroundColor Yellow
Write-Host "run: npx localtunnel --port 3001" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C in that terminal to stop the tunnel." -ForegroundColor Yellow

