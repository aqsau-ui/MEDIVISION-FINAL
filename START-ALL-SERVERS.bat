@echo off
title MEDIVISION - Start All Servers
color 0A
echo ================================================
echo   MEDIVISION - Starting All Servers
echo ================================================
echo.

echo [1/3] Starting Backend (Node.js - Port 5000)...
start "MEDIVISION Backend" cmd /k "cd /d "%~dp0backend" && node server.js"
timeout /t 4 /nobreak >nul

echo [2/3] Starting AI Server (FastAPI - Port 8000)...
start "MEDIVISION AI FastAPI" cmd /k "cd /d "%~dp0backend_fastapi" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 4 /nobreak >nul

echo [3/3] Starting Frontend (React - Port 3000)...
start "MEDIVISION Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo ================================================
echo   All servers are starting in separate windows!
echo.
echo   Backend  : http://localhost:5000
echo   AI API   : http://localhost:8000
echo   Frontend : http://localhost:3000
echo.
echo   Wait ~30 seconds for React to fully compile.
echo ================================================
echo.
pause
