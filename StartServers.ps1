# Start MEDIVISION Servers
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "Starting MEDIVISION Application" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting FastAPI Backend..." -ForegroundColor Yellow
$backendPath = "c:\Users\hp Probook\Desktop\MEDIVISION-main\backend_fastapi"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Starting Backend...' -ForegroundColor Green; python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload" -WindowStyle Normal

# Wait for backend to start
Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Start Frontend
Write-Host "Starting React Frontend..." -ForegroundColor Yellow
$frontendPath = "c:\Users\hp Probook\Desktop\MEDIVISION-main\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; `$env:BROWSER='none'; `$env:CI='false'; Write-Host 'Starting Frontend...' -ForegroundColor Green; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "="*60 -ForegroundColor Green
Write-Host "MEDIVISION Servers Started!" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "API Docs: http://localhost:5000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
