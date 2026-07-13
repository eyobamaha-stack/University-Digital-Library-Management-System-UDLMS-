$ErrorActionPreference = "Stop"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm is required."
}

Write-Host "Starting API and Web in separate terminals..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev -w apps/api"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev -w apps/web"

Write-Host "Apps started."
Write-Host "Web: http://localhost:3000"
Write-Host "API: http://localhost:4000"
