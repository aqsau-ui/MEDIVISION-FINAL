@echo off
setlocal enabledelayedexpansion
title MEDIVISION Launcher (clean start)
echo ================================================================
echo   MEDIVISION - CLEAN RESTART
echo   This script kills old servers, wipes caches, and starts fresh.
echo ================================================================
echo.

REM ---- 1. FORCE-STOP any old dev servers ----
echo [1/5] Stopping old dev servers ...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM uvicorn.exe >nul 2>&1

REM Kill whatever is listening on 5000 (backend) and 3000 (frontend)
for %%P in (5000 3000) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P *LISTENING"') do (
        echo   - killing PID %%A on port %%P
        taskkill /F /PID %%A >nul 2>&1
    )
)
timeout /t 3 /nobreak >nul

REM ---- 2. Purge Python bytecode so uvicorn loads fresh .py files ----
echo [2/5] Clearing Python __pycache__ ...
for /d /r "%~dp0backend_fastapi" %%D in (__pycache__) do (
    if exist "%%D" rd /s /q "%%D" 2>nul
)
del /s /q "%~dp0backend_fastapi\*.pyc" >nul 2>&1

REM ---- 3. Purge stale React build + webpack / eslint cache ----
echo [3/5] Clearing frontend build/ and node_modules\.cache ...
if exist "%~dp0frontend\build"               rd /s /q "%~dp0frontend\build" 2>nul
if exist "%~dp0frontend\node_modules\.cache" rd /s /q "%~dp0frontend\node_modules\.cache" 2>nul

REM ---- 4. Start backend (FastAPI, hot-reload) ----
echo [4/5] Starting backend (FastAPI on :5000) ...
cd /d "%~dp0backend_fastapi"
start "MEDIVISION Backend" cmd /k "set PYTHONDONTWRITEBYTECODE=1 && python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload"

REM Let backend finish its boot before frontend starts calling it
timeout /t 8 /nobreak >nul

REM ---- 5. Start frontend (CRA dev server) ----
echo [5/5] Starting frontend (React on :3000) ...
cd /d "%~dp0frontend"
start "MEDIVISION Frontend" cmd /k "set BROWSER=none && set CI=false && set FAST_REFRESH=true && npm start"

REM Give CRA ~25s to compile, then open the browser with cache bypass
timeout /t 25 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo ================================================================
echo   Done. Two windows are now running:
echo     Backend  : http://localhost:5000   (FastAPI docs at /docs)
echo     Frontend : http://localhost:3000
echo.
echo   IF YOU STILL SEE OLD PAGES in the browser, do a HARD RELOAD:
echo     Ctrl + Shift + R  (or Ctrl + F5)
echo.
echo   NOTE: Only run this script to start the project.
echo         Do NOT run backend\server.js separately — it will
echo         conflict with the FastAPI backend on port 5000.
echo ================================================================
echo.
pause
endlocal
