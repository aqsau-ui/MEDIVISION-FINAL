@echo off
echo ========================================
echo Stopping MEDIVISION Servers
echo ========================================

taskkill /F /IM node.exe >nul 2>&1
echo Backend servers stopped

timeout /t 2 /nobreak >nul

echo Frontend servers stopped
echo.
echo ========================================
echo All MEDIVISION servers have been stopped
echo ========================================
echo.
pause
