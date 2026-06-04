# Pornește site + server plăți
$root = $PSScriptRoot
Set-Location $root

Write-Host "AI Analyst — http://localhost:8080" -ForegroundColor Cyan
Write-Host "Plati card — http://localhost:8090" -ForegroundColor Cyan

Start-Process "http://localhost:8080"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; python -m http.server 8080"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\server'; python payment_server.py"
