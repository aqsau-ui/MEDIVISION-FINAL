@echo off
echo Stopping existing backend servers...
taskkill /F /IM python.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo Clearing Python cache...
for /d /r "%~dp0backend_fastapi" %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"

echo Starting MEDIVISION Backend on port 8000...
cd /d "%~dp0backend_fastapi"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
