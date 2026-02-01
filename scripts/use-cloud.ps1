# =============================================================================
# Switch to CLOUD profile
# =============================================================================
# Merges env/base.env + env/cloud.env -> .env
# Copies .env to apps/api/.env, apps/web/.env, apps/workers/.env, packages/database/.env
# Run: .\scripts\use-cloud.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $rootDir

Write-Host "Switching to CLOUD profile..." -ForegroundColor Cyan

# Check required files exist
if (-not (Test-Path "env/base.env")) {
    Write-Error "env/base.env not found!"
    exit 1
}
if (-not (Test-Path "env/cloud.env")) {
    Write-Error "env/cloud.env not found!"
    exit 1
}

# Merge base + cloud (cloud values override base)
$baseEnv = Get-Content "env/base.env" -Raw
$cloudEnv = Get-Content "env/cloud.env" -Raw

$header = @"
# =============================================================================
# CareCircle - ACTIVE PROFILE: CLOUD
# =============================================================================
# Generated from: env/base.env + env/cloud.env
# Generated at: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# DO NOT EDIT - Use scripts/use-local.ps1 or scripts/use-cloud.ps1
# =============================================================================

"@

$merged = $header + $baseEnv + "`n`n" + $cloudEnv

# Write merged .env
$merged | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

# Copy .env to app directories (Windows fallback for symlinks)
$appDirs = @("apps/api", "apps/web", "apps/workers", "packages/database")
foreach ($dir in $appDirs) {
    $targetPath = Join-Path (Join-Path $rootDir $dir) ".env"
    Write-Host "Copying .env to $targetPath" -ForegroundColor DarkGray
    Copy-Item -Path ".env" -Destination $targetPath -Force
}

Write-Host ""
Write-Host "CLOUD profile activated!" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Database: Neon PostgreSQL (TLS)" -ForegroundColor White
Write-Host "  Redis:    Upstash (TLS)" -ForegroundColor White
Write-Host "  RabbitMQ: CloudAMQP (TLS)" -ForegroundColor White
Write-Host "  Storage:  Cloudinary (third-party)" -ForegroundColor White
Write-Host "  Mail:     Mailtrap (third-party)" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run API:  pnpm --filter api dev" -ForegroundColor White
Write-Host "  2. Run Web:  pnpm --filter web dev" -ForegroundColor White
Write-Host ""
Write-Host "Note: No local Docker needed - using managed services" -ForegroundColor Cyan
Write-Host ""


