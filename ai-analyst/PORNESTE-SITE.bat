@echo off
cd /d "%~dp0"
echo Pornesc site-ul AI Analyst + server plati...
start "AI Analyst Site" cmd /k "python -m http.server 8080"
timeout /t 2 /nobreak >nul
start "AI Analyst Plati" cmd /k "python server\payment_server.py"
timeout /t 2 /nobreak >nul
start http://localhost:8080
echo.
echo Site:    http://localhost:8080
echo Plati:   http://localhost:8090/api/pay/health
echo.
pause
