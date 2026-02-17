# Monitor tunnel process lifecycle
$logPath = ".cursor\debug.log"

function Write-DebugLog {
    param($location, $message, $data, $hypothesisId)
    $logEntry = @{
        id = "log_$(Get-Date -Format 'yyyyMMddHHmmss')_$(Get-Random)"
        timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
        location = $location
        message = $message
        data = $data
        runId = "run1"
        hypothesisId = $hypothesisId
    } | ConvertTo-Json -Compress
    Add-Content -Path $logPath -Value $logEntry -ErrorAction SilentlyContinue
}

# #region agent log
Write-DebugLog -location "monitor-tunnel.ps1:10" -message "Starting tunnel monitoring" -data @{port=3001} -hypothesisId "A,B,C,D,E"
# #endregion

# Check if port 3001 is available
$portCheck = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
# #region agent log
Write-DebugLog -location "monitor-tunnel.ps1:15" -message "Port 3001 status check" -data @{isListening=($portCheck -ne $null); state=$portCheck.State} -hypothesisId "E"
# #endregion

# Start tunnel process
Write-Host "Starting localtunnel on port 3001..." -ForegroundColor Green

# #region agent log
Write-DebugLog -location "monitor-tunnel.ps1:20" -message "Attempting to start tunnel process" -data @{command="npx localtunnel --port 3001"} -hypothesisId "A,B,C"
# #endregion

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "npx"
$processInfo.Arguments = "--yes localtunnel --port 3001"
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.CreateNoWindow = $false

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $processInfo

# #region agent log
Write-DebugLog -location "monitor-tunnel.ps1:32" -message "Process object created" -data @{hasStartInfo=$true} -hypothesisId "C"
# #endregion

try {
    $process.Start()
    # #region agent log
    Write-DebugLog -location "monitor-tunnel.ps1:37" -message "Process started" -data @{processId=$process.Id; hasExited=$process.HasExited; exitCode=$process.ExitCode} -hypothesisId "A,B,C"
    # #endregion
    
    Write-Host "Tunnel process started with PID: $($process.Id)" -ForegroundColor Green
    
    # Monitor process for 30 seconds
    $monitorDuration = 30
    $checkInterval = 2
    $checks = 0
    $maxChecks = $monitorDuration / $checkInterval
    
    while ($checks -lt $maxChecks) {
        Start-Sleep -Seconds $checkInterval
        $checks++
        
        if ($process.HasExited) {
            # #region agent log
            Write-DebugLog -location "monitor-tunnel.ps1:50" -message "Process exited unexpectedly" -data @{processId=$process.Id; exitCode=$process.ExitCode; checks=$checks; elapsedSeconds=$($checks * $checkInterval)} -hypothesisId "A,B"
            # #endregion
            
            $errorOutput = $process.StandardError.ReadToEnd()
            $stdOutput = $process.StandardOutput.ReadToEnd()
            
            # #region agent log
            Write-DebugLog -location "monitor-tunnel.ps1:56" -message "Process output captured" -data @{hasErrorOutput=($errorOutput.Length -gt 0); hasStdOutput=($stdOutput.Length -gt 0); errorLength=$errorOutput.Length; outputLength=$stdOutput.Length} -hypothesisId "A"
            # #endregion
            
            Write-Host "`n❌ Tunnel process exited!" -ForegroundColor Red
            Write-Host "Exit Code: $($process.ExitCode)" -ForegroundColor Red
            Write-Host "Elapsed Time: $($checks * $checkInterval) seconds" -ForegroundColor Red
            
            if ($errorOutput) {
                Write-Host "`nError Output:" -ForegroundColor Yellow
                Write-Host $errorOutput
                # #region agent log
                Write-DebugLog -location "monitor-tunnel.ps1:66" -message "Error output content" -data @{errorOutput=$errorOutput} -hypothesisId "A"
                # #endregion
            }
            
            if ($stdOutput) {
                Write-Host "`nStandard Output:" -ForegroundColor Yellow
                Write-Host $stdOutput
                # #region agent log
                Write-DebugLog -location "monitor-tunnel.ps1:74" -message "Standard output content" -data @{stdOutput=$stdOutput} -hypothesisId "A"
                # #endregion
            }
            
            break
        }
        
        # #region agent log
        Write-DebugLog -location "monitor-tunnel.ps1:81" -message "Process still running" -data @{processId=$process.Id; checks=$checks; elapsedSeconds=$($checks * $checkInterval)} -hypothesisId "B,C"
        # #endregion
    }
    
    if (-not $process.HasExited) {
        # #region agent log
        Write-DebugLog -location "monitor-tunnel.ps1:86" -message "Monitoring period completed, process still running" -data @{processId=$process.Id; duration=$monitorDuration} -hypothesisId "B,C"
        # #endregion
        Write-Host "`n✅ Tunnel process still running after $monitorDuration seconds" -ForegroundColor Green
        Write-Host "Process ID: $($process.Id)" -ForegroundColor Cyan
        Write-Host "`nTo stop monitoring, press Ctrl+C" -ForegroundColor Yellow
        Write-Host "The tunnel will continue running in the background." -ForegroundColor Yellow
    }
    
} catch {
    # #region agent log
    Write-DebugLog -location "monitor-tunnel.ps1:95" -message "Exception starting process" -data @{error=$_.Exception.Message; errorType=$_.Exception.GetType().Name} -hypothesisId "A,C"
    # #endregion
    Write-Host "❌ Error starting tunnel: $($_.Exception.Message)" -ForegroundColor Red
}

# #region agent log
Write-DebugLog -location "monitor-tunnel.ps1:100" -message "Monitoring script completed" -data @{finalProcessState=$process.HasExited; finalExitCode=$process.ExitCode} -hypothesisId "A,B,C,D,E"
# #endregion

