# PowerShell script to setup wallet for backend
# Run this from the fabric-network directory

$WALLET_PATH = "wallet"
$CRYPTO_PATH = "crypto-config\peerOrganizations\org1.example.com\users\Admin@org1.example.com\msp"
$USER_ID = "Admin@org1.example.com"

Write-Host "🔐 Setting up Fabric wallet for backend..." -ForegroundColor Cyan

# Check if crypto materials exist
if (-not (Test-Path $CRYPTO_PATH)) {
    Write-Host "❌ Error: Crypto materials not found at $CRYPTO_PATH" -ForegroundColor Red
    Write-Host "   Please run: ./scripts/generate-certs.sh" -ForegroundColor Yellow
    exit 1
}

# Create wallet directory if it doesn't exist
if (-not (Test-Path $WALLET_PATH)) {
    New-Item -ItemType Directory -Force -Path $WALLET_PATH | Out-Null
}

# Find the private key
$privKey = Get-ChildItem -Path "$CRYPTO_PATH\keystore\*_sk" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $privKey) {
    Write-Host "❌ Error: Private key not found in $CRYPTO_PATH\keystore" -ForegroundColor Red
    exit 1
}

# Find the certificate
$cert = Get-ChildItem -Path "$CRYPTO_PATH\signcerts\*.pem" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $cert) {
    Write-Host "❌ Error: Certificate not found in $CRYPTO_PATH\signcerts" -ForegroundColor Red
    exit 1
}

# Create user identity directory in wallet
$USER_DIR = "$WALLET_PATH\$USER_ID"
if (-not (Test-Path $USER_DIR)) {
    New-Item -ItemType Directory -Force -Path $USER_DIR | Out-Null
}

# Copy private key
Copy-Item $privKey.FullName "$USER_DIR\priv_sk" -Force

# Copy certificate
Copy-Item $cert.FullName "$USER_DIR\cert.pem" -Force

# Create msp directory structure
$mspKeystore = "$USER_DIR\msp\keystore"
$mspSigncerts = "$USER_DIR\msp\signcerts"
$mspAdmincerts = "$USER_DIR\msp\admincerts"

New-Item -ItemType Directory -Force -Path $mspKeystore | Out-Null
New-Item -ItemType Directory -Force -Path $mspSigncerts | Out-Null
New-Item -ItemType Directory -Force -Path $mspAdmincerts | Out-Null

# Copy to msp structure
Copy-Item $privKey.FullName $mspKeystore -Force
Copy-Item $cert.FullName $mspSigncerts -Force
Copy-Item $cert.FullName $mspAdmincerts -Force

# Create identity JSON file (fabric-network SDK format)
$certContent = Get-Content $cert.FullName -Raw
$privKeyContent = Get-Content $privKey.FullName -Raw

$identityJson = @{
    credentials = @{
        certificate = $certContent
        privateKey = $privKeyContent
    }
    mspId = "Org1MSP"
    type = "X.509"
} | ConvertTo-Json -Depth 10

$identityJson | Out-File "$USER_DIR\identity.json" -Encoding utf8 -NoNewline

Write-Host ""
Write-Host "Wallet setup complete!" -ForegroundColor Green
Write-Host "   Wallet path: $WALLET_PATH"
Write-Host "   User identity: $USER_ID"
Write-Host "   Private key: $($privKey.Name)"
Write-Host "   Certificate: $($cert.Name)"
Write-Host "   MSP ID: Org1MSP"
Write-Host ""
Write-Host "The wallet is now ready for use by the backend service." -ForegroundColor Cyan

