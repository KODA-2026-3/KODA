param(
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\koda"
try {
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Creado koda/.env a partir de .env.example"
    }

    if ($NoCache) {
        docker compose build --no-cache
    } else {
        docker compose build
    }

    docker compose up -d

    Write-Host ""
    Write-Host "Frontend:   http://localhost:4200"
    Write-Host "Backend:    http://localhost:8080/api"
    Write-Host "Swagger:    http://localhost:8080/swagger-ui.html"
    Write-Host "Inferencia: http://localhost:8000/docs"
}
finally {
    Pop-Location
}
