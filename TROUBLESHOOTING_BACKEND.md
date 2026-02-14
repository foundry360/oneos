# Backend Connection Troubleshooting

## Error: ERR_CONNECTION_REFUSED

This error means the backend server at `http://localhost:3001` is not running or not accessible.

## Quick Fix

### Option 1: Start with Docker Compose (Recommended)

1. **Start Docker Desktop** (if not already running)

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Check backend status:**
   ```bash
   docker-compose ps backend
   docker-compose logs backend
   ```

4. **Verify backend is running:**
   - Open: http://localhost:3001/health
   - Should return: `{"status":"healthy","database":"connected",...}`

### Option 2: Run Backend Locally (Without Docker)

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the `backend` directory with:
   ```env
   DATABASE_URL=postgresql://aigov:aigov_secret@localhost:5432/ai_governance
   PUBSUB_EMULATOR_HOST=localhost:8085
   PUBSUB_PROJECT_ID=ai-gov-local
   PORT=3001
   NODE_ENV=development
   ```

4. **Start the backend:**
   ```bash
   npm run dev
   ```

5. **Verify it's running:**
   - Check console output for: `Backend server running on port 3001`
   - Open: http://localhost:3001/health

## Common Issues

### Docker Desktop Not Running
- **Symptom:** `error during connect: The system cannot find the file specified`
- **Solution:** Start Docker Desktop application

### Port 3001 Already in Use
- **Symptom:** `Error: listen EADDRINUSE: address already in use :::3001`
- **Solution:** 
  - Find and stop the process using port 3001
  - Or change the port in `backend/.env` and `docker-compose.yml`

### Database Connection Failed
- **Symptom:** Backend starts but health check shows `"database":"disconnected"`
- **Solution:**
  - Ensure PostgreSQL is running: `docker-compose ps postgres`
  - Check database credentials match in `.env` and `docker-compose.yml`
  - Wait 10-15 seconds after starting for database to initialize

### Backend Crashes on Startup
- **Check logs:** `docker-compose logs backend`
- **Common causes:**
  - Missing environment variables
  - Database not ready yet
  - Port conflicts

## Verification Steps

1. **Check if backend is listening:**
   ```bash
   # PowerShell
   Test-NetConnection -ComputerName localhost -Port 3001
   
   # Or open in browser
   http://localhost:3001/health
   ```

2. **Check backend logs:**
   ```bash
   docker-compose logs -f backend
   ```

3. **Test API endpoint:**
   ```bash
   curl http://localhost:3001/health
   ```

## Still Having Issues?

1. **Check all services are running:**
   ```bash
   docker-compose ps
   ```

2. **Restart all services:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. **Check for port conflicts:**
   ```bash
   # PowerShell
   netstat -ano | findstr :3001
   ```

4. **View detailed logs:**
   ```bash
   docker-compose logs backend
   ```




