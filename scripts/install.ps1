# Customer Installation Script (PowerShell)
# This script validates the vendor API key and completes installation

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AI Governance Platform Installation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get API URL from environment or use default
$API_URL = if ($env:API_URL) { $env:API_URL } else { "http://localhost:3001" }

# Check if API URL is accessible
Write-Host "Checking API connectivity..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ API is accessible" -ForegroundColor Green
} catch {
    Write-Host "Error: Cannot connect to API at $API_URL" -ForegroundColor Red
    Write-Host "Please ensure the backend server is running." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Prompt for vendor API key
Write-Host "Please enter your vendor API key."
Write-Host "This key was provided to you during onboarding."
Write-Host ""
$VENDOR_API_KEY = Read-Host "Vendor API Key" -AsSecureString
$VENDOR_API_KEY_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($VENDOR_API_KEY)
)

if ([string]::IsNullOrWhiteSpace($VENDOR_API_KEY_PLAIN)) {
    Write-Host "Error: API key is required" -ForegroundColor Red
    exit 1
}

# Optional: Prompt for customer info
Write-Host ""
Write-Host "Optional: Provide additional customer information"
$CUSTOMER_NAME = Read-Host "Customer Name (optional)"
$CONTACT_EMAIL = Read-Host "Contact Email (optional)"
Write-Host ""

# Validate API key
Write-Host "Validating API key with vendor..." -ForegroundColor Yellow

$body = @{
    apiKey = $VENDOR_API_KEY_PLAIN
    customerName = $CUSTOMER_NAME
    contactEmail = $CONTACT_EMAIL
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/installation/validate-key" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ "X-Installation-URL" = if ($env:INSTALLATION_URL) { $env:INSTALLATION_URL } else { $API_URL } } `
        -Body $body `
        -ErrorAction Stop

    if ($response.valid -eq $true) {
        Write-Host "✓ API key validated successfully!" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Installation Details:"
        Write-Host "  Customer Code: $($response.customerCode)"
        Write-Host "  Installation ID: $($response.installationId)"
        Write-Host "  Subscription Tier: $($response.subscriptionTier)"
        Write-Host ""
        
        # Save to .env file
        $envFile = ".env"
        $envContent = @"
# Vendor API Key (validated during installation)
VENDOR_API_KEY=$VENDOR_API_KEY_PLAIN

# Installation ID
INSTALLATION_ID=$($response.installationId)

# Customer Code
CUSTOMER_CODE=$($response.customerCode)
"@
        
        if (Test-Path $envFile) {
            # Update existing .env
            $existingContent = Get-Content $envFile -Raw
            if ($existingContent -match "VENDOR_API_KEY") {
                $existingContent = $existingContent -replace "VENDOR_API_KEY=.*", "VENDOR_API_KEY=$VENDOR_API_KEY_PLAIN"
            } else {
                $existingContent += "`n$envContent"
            }
            Set-Content -Path $envFile -Value $existingContent
        } else {
            # Create new .env
            Set-Content -Path $envFile -Value $envContent
        }
        
        Write-Host "✓ Configuration saved to .env" -ForegroundColor Green
        Write-Host ""
        Write-Host "Installation completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:"
        Write-Host "  1. Review your .env file"
        Write-Host "  2. Start the backend server: npm start"
        Write-Host "  3. Your end-users can now use the SDK with this API key"
        Write-Host ""
    } else {
        Write-Host "✗ API key validation failed" -ForegroundColor Red
        Write-Host "Reason: $($response.reason)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ API key validation failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please check:"
    Write-Host "  - API key is correct"
    Write-Host "  - API key hasn't been revoked"
    Write-Host "  - Vendor API is accessible"
    Write-Host ""
    exit 1
}


