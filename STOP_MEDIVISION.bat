@echo off
echo ========================================
echo Stopping MEDIVISION Servers
echo ========================================

REM Kill frontend (Node/CRA dev server)
taskkill /F /IM node.exe >nul 2>&1
echo Frontend (node) stopped

REM Kill backend (Python/uvicorn). Only kills listeners on port 5000 to
REM avoid stopping unrelated python.exe processes on the machine.
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":5000 *LISTENING"') do (
    taskkill /F /PID %%A >nul 2>&1
)
echo Backend (uvicorn on :5000) stopped

REM Also free port 3000 if anything is still holding it
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":3000 *LISTENING"') do (
    taskkill /F /PID %%A >nul 2>&1
)

echo.
echo ========================================
echo All MEDIVISION servers have been stopped
echo ========================================
echo.
pause
