# =============================================================================
# Switch to LOCAL profile
# =============================================================================
# Merges env/base.env + env/local.env -> .env
# Copies .env to apps/api/.env, apps/workers/.env, packages/database/.env
# Run: .\scripts\use-local.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $rootDir

Write-Host "Switching to LOCAL profile..." -ForegroundColor Cyan

# Check required files exist
if (-not (Test-Path "env/base.env")) {
    Write-Error "env/base.env not found!"
    exit 1
}
if (-not (Test-Path "env/local.env")) {
    Write-Error "env/local.env not found!"
    exit 1
}

# Merge base + local (local values override base)
$baseEnv = Get-Content "env/base.env" -Raw
$localEnv = Get-Content "env/local.env" -Raw

$header = @"
# =============================================================================
# CareCircle - ACTIVE PROFILE: LOCAL
# =============================================================================
# Generated from: env/base.env + env/local.env
# Generated at: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# DO NOT EDIT - Use scripts/use-local.ps1 or scripts/use-cloud.ps1
# =============================================================================

"@

$merged = $header + $baseEnv + "`n`n" + $localEnv

# Write merged .env
$merged | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

# Copy .env to app directories (Windows fallback for symlinks)
$appDirs = @("apps\api", "apps\web", "apps\workers", "packages\database")
foreach ($dir in $appDirs) {
    $targetPath = Join-Path (Join-Path $rootDir $dir) ".env"
    Write-Host "Copying .env to $targetPath" -ForegroundColor DarkGray
    Copy-Item -Path ".env" -Destination $targetPath -Force
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  LOCAL profile activated!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Local Docker Services:" -ForegroundColor Yellow
Write-Host "  PostgreSQL:  localhost:5432 (postgres/1234)" -ForegroundColor White
Write-Host "  Redis:       localhost:6379" -ForegroundColor White
Write-Host "  RabbitMQ:    localhost:5672 (guest/guest)" -ForegroundColor White
Write-Host ""
Write-Host "Third-Party Services:" -ForegroundColor Yellow
Write-Host "  Email:       Mailtrap (sandbox.smtp.mailtrap.io)" -ForegroundColor White
Write-Host "  Storage:     Cloudinary" -ForegroundColor White
Write-Host ""
Write-Host "Management UIs:" -ForegroundColor Cyan
Write-Host "  RabbitMQ:    http://localhost:15672 (guest/guest)" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start Docker services:" -ForegroundColor White
Write-Host "     docker compose up -d" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Setup database (first time only):" -ForegroundColor White
Write-Host "     pnpm --filter @carecircle/database generate" -ForegroundColor Cyan
Write-Host "     pnpm --filter @carecircle/database push" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Start all services:" -ForegroundColor White
Write-Host "     pnpm dev:api     # Terminal 1 - API on http://localhost:3001" -ForegroundColor Cyan
Write-Host "     pnpm dev:web     # Terminal 2 - Web on http://localhost:3000" -ForegroundColor Cyan
Write-Host "     pnpm dev:workers # Terminal 3 - Background workers" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Or start all at once:" -ForegroundColor White
Write-Host "     pnpm dev" -ForegroundColor Cyan
Write-Host ""


