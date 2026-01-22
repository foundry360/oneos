# PowerShell script to set up environment variables for Supabase
# Run this script to create your .env file

$envContent = @"
# Database Configuration
POSTGRES_USER=aigov
POSTGRES_PASSWORD=aigov_secret
POSTGRES_DB=ai_governance
DATABASE_URL=postgresql://aigov:aigov_secret@localhost:5432/ai_governance

# Pub/Sub Configuration
PUBSUB_PROJECT_ID=ai-gov-local
PUBSUB_EMULATOR_HOST=localhost:8085

# Supabase Configuration
SUPABASE_URL=https://lraufigpyabmkwmibntm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYXVmaWdweWFibWt3bWlibnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTI2MTIsImV4cCI6MjA4NDU4ODYxMn0.BH2Yg-27zCmdpJvdvb7TM-bKieETdka6B6mJ0SG2NGM
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYXVmaWdweWFibWt3bWlibnRtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAxMjYxMiwiZXhwIjoyMDg0NTg4NjEyfQ.orfNncN4lPyRRiIAsONgwkuIU1z59zw_FOa2UsD2_QU

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://lraufigpyabmkwmibntm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYXVmaWdweWFibWt3bWlibnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTI2MTIsImV4cCI6MjA4NDU4ODYxMn0.BH2Yg-27zCmdpJvdvb7TM-bKieETdka6B6mJ0SG2NGM

# Backend Configuration
BACKEND_PORT=3001
NODE_ENV=development

# Storage Configuration
STORAGE_PATH=./storage
LOG_PATH=./logs

# Vertex AI Configuration (for GCP deployment)
VERTEX_AI_PROJECT_ID=
VERTEX_AI_LOCATION=us-central1

# GCP Configuration (for production)
GCP_PROJECT_ID=
GCP_REGION=us-central1
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host "📝 Supabase credentials have been configured:" -ForegroundColor Cyan
Write-Host "   - Project URL: https://lraufigpyabmkwmibntm.supabase.co" -ForegroundColor Yellow
Write-Host "   - Anon Key: Configured" -ForegroundColor Yellow
Write-Host "   - Service Key: Configured" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Restart your Docker Compose services: docker-compose restart" -ForegroundColor White
Write-Host "   2. Or restart the entire stack: docker-compose down then docker-compose up -d" -ForegroundColor White

