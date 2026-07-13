$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker is required."
}

docker compose up --build
