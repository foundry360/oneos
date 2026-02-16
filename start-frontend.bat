@echo off
echo Starting Frontend Server...
echo.
cd frontend
echo Current directory: %CD%
echo.
echo Installing dependencies (if needed)...
call npm install
echo.
echo Starting Next.js development server...
echo Frontend will be available at: http://localhost:3000
echo.
call npm run dev
pause








