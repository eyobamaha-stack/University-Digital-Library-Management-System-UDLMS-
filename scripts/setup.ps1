Param(
  [switch]$StartPostgres
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is not installed. Install Node.js 20+ first."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm is not installed. Install Node.js/npm first."
}

Write-Host "Installing dependencies..."
npm install

if (-not (Test-Path "apps/api/.env")) {
  Copy-Item "apps/api/.env.example" "apps/api/.env"
  Write-Host "Created apps/api/.env"
}

if (-not (Test-Path "apps/web/.env.local")) {
  Copy-Item "apps/web/.env.example" "apps/web/.env.local"
  Write-Host "Created apps/web/.env.local"
}

if ($StartPostgres) {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is required for -StartPostgres."
  }
  Write-Host "Starting PostgreSQL container..."
  docker compose up -d postgres
}

Write-Host "Generating Prisma client..."
npm run prisma:generate -w apps/api
Write-Host "Applying Prisma schema..."
npm run prisma:push -w apps/api
Write-Host "Seeding initial data..."
npm run prisma:seed -w apps/api

Write-Host "Setup complete."
