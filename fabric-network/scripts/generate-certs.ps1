# PowerShell script to generate cryptographic materials for Hyperledger Fabric
# Run this from the fabric-network directory

Write-Host "Generating cryptographic materials..." -ForegroundColor Cyan

# Check if crypto-config.yaml exists
if (-not (Test-Path "crypto-config.yaml")) {
    Write-Host "Error: crypto-config.yaml not found!" -ForegroundColor Red
    exit 1
}

# Check if cryptogen exists in fabric-samples
$cryptogenPath = "fabric-samples\bin\cryptogen.exe"
if (-not (Test-Path $cryptogenPath)) {
    Write-Host "cryptogen not found. Checking for alternative locations..." -ForegroundColor Yellow
    
    # Check if it's in the current directory
    if (Test-Path ".\cryptogen.exe") {
        $cryptogenPath = ".\cryptogen.exe"
    } else {
        Write-Host "Error: cryptogen not found!" -ForegroundColor Red
        Write-Host "Please download Fabric binaries or use Docker to generate crypto materials." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Alternative: Use Docker to generate crypto materials:" -ForegroundColor Cyan
        Write-Host "  docker run --rm -v `"${PWD}:/work`" -w /work hyperledger/fabric-tools:2.5 cryptogen generate --config=./crypto-config.yaml --output=./crypto-config" -ForegroundColor White
        exit 1
    }
}

# Generate crypto materials
Write-Host "Running cryptogen..." -ForegroundColor Cyan
& $cryptogenPath generate --config=./crypto-config.yaml --output="crypto-config"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Cryptographic materials generated successfully!" -ForegroundColor Green
    Write-Host "Output directory: crypto-config\" -ForegroundColor Cyan
} else {
    Write-Host "Error: Failed to generate crypto materials" -ForegroundColor Red
    exit 1
}
