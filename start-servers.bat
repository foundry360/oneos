@echo off
echo Starting Backend and Frontend servers...
echo.

echo [1/2] Starting Backend server on port 3001...
start "Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend server on port 3000...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in separate windows!
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
pause

