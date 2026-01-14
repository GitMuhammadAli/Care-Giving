# CareCircle Production Deployment Script (PowerShell)
# This script builds and deploys the production Docker containers

param(
    [switch]$Build,
    [switch]$Up,
    [switch]$Down,
    [switch]$Logs,
    [switch]$Clean,
    [string]$Service = ""
)

$ErrorActionPreference = "Stop"

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                              ║" -ForegroundColor Cyan
Write-Host "║   🚀  CareCircle Production Deployment                       ║" -ForegroundColor Cyan
Write-Host "║                                                              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if .env.prod exists
if (-not (Test-Path ".env.prod")) {
    Write-Host "❌ Error: .env.prod file not found!" -ForegroundColor Red
    Write-Host "📝 Please copy .env.prod.example to .env.prod and fill in the values" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   cp .env.prod.example .env.prod" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Set environment
$env:COMPOSE_FILE = "docker-compose.prod.yml"
$env:COMPOSE_PROJECT_NAME = "carecircle-prod"

function Build-Images {
    Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
    Write-Host ""

    if ($Service) {
        docker-compose -f docker-compose.prod.yml --env-file .env.prod build $Service
    } else {
        docker-compose -f docker-compose.prod.yml --env-file .env.prod build --parallel
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
}

function Start-Services {
    Write-Host "🚀 Starting services..." -ForegroundColor Yellow
    Write-Host ""

    if ($Service) {
        docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d $Service
    } else {
        docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Services started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Application URLs:" -ForegroundColor Cyan
        Write-Host "   - Web:        http://localhost" -ForegroundColor White
        Write-Host "   - API:        http://localhost/api/v1" -ForegroundColor White
        Write-Host "   - Swagger:    http://localhost/api-docs" -ForegroundColor White
        Write-Host "   - MinIO:      http://localhost:9001" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Failed to start services!" -ForegroundColor Red
        exit 1
    }
}

function Stop-Services {
    Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
    Write-Host ""

    if ($Service) {
        docker-compose -f docker-compose.prod.yml --env-file .env.prod down $Service
    } else {
        docker-compose -f docker-compose.prod.yml --env-file .env.prod down
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Services stopped successfully!" -ForegroundColor Green
    }
}

function Show-Logs {
    Write-Host "📋 Showing logs..." -ForegroundColor Yellow
    Write-Host ""

    if ($Service) {
        docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f $Service
    } else {
        docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f
    }
}

function Clean-All {
    Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  This will remove all containers, images, and volumes!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (yes/no)"

    if ($confirm -eq "yes") {
        docker-compose -f docker-compose.prod.yml --env-file .env.prod down -v --rmi all
        Write-Host ""
        Write-Host "✅ Cleanup completed!" -ForegroundColor Green
    } else {
        Write-Host "❌ Cleanup cancelled" -ForegroundColor Yellow
    }
}

# Execute based on parameters
if ($Build) {
    Build-Images
}
elseif ($Up) {
    Start-Services
}
elseif ($Down) {
    Stop-Services
}
elseif ($Logs) {
    Show-Logs
}
elseif ($Clean) {
    Clean-All
}
else {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\scripts\deploy-prod.ps1 -Build              # Build images" -ForegroundColor White
    Write-Host "  .\scripts\deploy-prod.ps1 -Up                 # Start services" -ForegroundColor White
    Write-Host "  .\scripts\deploy-prod.ps1 -Down               # Stop services" -ForegroundColor White
    Write-Host "  .\scripts\deploy-prod.ps1 -Logs               # Show logs" -ForegroundColor White
    Write-Host "  .\scripts\deploy-prod.ps1 -Clean              # Clean everything" -ForegroundColor White
    Write-Host ""
    Write-Host "  .\scripts\deploy-prod.ps1 -Build -Service api # Build specific service" -ForegroundColor White
    Write-Host ""
}
