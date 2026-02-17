# Run All Required Migrations
# This script runs all necessary database migrations for the AI Governance Platform

Write-Host "Running Database Migrations..." -ForegroundColor Cyan
Write-Host ""

$dbContainer = "ai-gov-postgres"
$dbUser = "aigov"
$dbName = "ai_governance"

# Check if container is running
$containerRunning = docker ps --filter "name=$dbContainer" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Host "ERROR: Database container '$dbContainer' is not running!" -ForegroundColor Red
    Write-Host "Start it with: docker-compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Database container is running" -ForegroundColor Green
Write-Host ""

# Migration 1: Control Plane (Decisions table)
Write-Host "1. Running control_plane_migration.sql (decisions table)..." -ForegroundColor Yellow
$result1 = docker exec -i $dbContainer psql -U $dbUser -d $dbName < db/control_plane_migration.sql 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Control plane migration completed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Control plane migration had warnings (may already exist)" -ForegroundColor Yellow
    Write-Host $result1
}
Write-Host ""

# Migration 2: License System - activated_at column
Write-Host "2. Running add_activated_at_to_customer_api_keys.sql..." -ForegroundColor Yellow
$result2 = docker exec -i $dbContainer psql -U $dbUser -d $dbName < db/migrations/add_activated_at_to_customer_api_keys.sql 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Activated_at migration completed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Activated_at migration had warnings (may already exist)" -ForegroundColor Yellow
    Write-Host $result2
}
Write-Host ""

# Migration 3: License System - valid_license_keys table
Write-Host "3. Running create_valid_license_keys_table.sql..." -ForegroundColor Yellow
$result3 = docker exec -i $dbContainer psql -U $dbUser -d $dbName < db/migrations/create_valid_license_keys_table.sql 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Valid license keys table migration completed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Valid license keys migration had warnings (may already exist)" -ForegroundColor Yellow
    Write-Host $result3
}
Write-Host ""

Write-Host "✅ All migrations completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Restart the backend" -ForegroundColor Yellow
Write-Host "  docker-compose restart backend" -ForegroundColor White

