@echo off
echo Starting MEDIVISION Servers...
echo.

cd /d "%~dp0backend_fastapi"
start "MEDIVISION Backend" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload"

timeout /t 3 /nobreak >nul

cd /d "%~dp0frontend"
start "MEDIVISION Frontend" cmd /k "set BROWSER=none && set CI=false && npm start"

echo.
echo Both servers are starting in separate windows...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause
