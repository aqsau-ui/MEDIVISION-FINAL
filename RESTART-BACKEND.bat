@echo off
title MEDIVISION - Restart Backend Only
color 0E
echo ================================================
echo   Restarting Backend (Port 5000) ONLY
echo   React (3000) and FastAPI (8000) stay running.
echo ================================================
echo.

:: Kill only the process listening on port 5000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    echo Stopping backend process PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo Starting fresh backend...
start "MEDIVISION Backend" cmd /k "cd /d "%~dp0backend" && node server.js"

echo.
echo Backend restarted on port 5000.
timeout /t 3 /nobreak >nul
