@echo off
echo Stopping all Python and Node processes...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 3 >nul

echo.
echo Starting FastAPI Backend...
cd /d "%~dp0backend_fastapi"
start "MEDIVISION Backend (FastAPI)" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload"

timeout /t 5 >nul

echo.
echo Starting React Frontend...
cd /d "%~dp0frontend"
start "MEDIVISION Frontend" cmd /k "npm start"

echo.
echo ========================================
echo   MEDIVISION is starting...
echo   Backend: http://localhost:5000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:5000/docs
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
