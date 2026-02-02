# =============================================================================
# CareCircle Database Deployment Script (PowerShell)
# =============================================================================
# This script handles database migrations and optional admin seeding
# Run automatically on deployment or manually as needed
#
# Usage:
#   .\scripts\deploy-db.ps1              # Migrations only
#   .\scripts\deploy-db.ps1 -Seed        # Migrations + admin seeding
#   $env:SEED_ADMIN="true"; .\scripts\deploy-db.ps1  # Same as -Seed
# =============================================================================

param(
    [switch]$Seed
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🚀 CareCircle Database Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable is not set" -ForegroundColor Red
    Write-Host "   Please set DATABASE_URL before running this script" -ForegroundColor Red
    exit 1
}

# Check environment variable for seeding
$ShouldSeed = $Seed -or ($env:SEED_ADMIN -eq "true")

Write-Host ""
Write-Host "📦 Step 1: Generating Prisma Client..." -ForegroundColor Yellow
Write-Host "--------------------------------------------------"
Push-Location packages/database
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "Prisma generate failed" }
Write-Host "✅ Prisma client generated" -ForegroundColor Green

Write-Host ""
Write-Host "🔄 Step 2: Running Database Migrations..." -ForegroundColor Yellow
Write-Host "--------------------------------------------------"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "Prisma migrate failed" }
Write-Host "✅ Migrations applied" -ForegroundColor Green

# Optional admin seeding
if ($ShouldSeed) {
    Write-Host ""
    Write-Host "👤 Step 3: Seeding Admin Users..." -ForegroundColor Yellow
    Write-Host "--------------------------------------------------"
    
    if (-not $env:ADMIN_EMAIL) {
        Write-Host "   Using default admin email: superadmin@carecircle.com"
    } else {
        Write-Host "   Using custom admin email: $env:ADMIN_EMAIL"
    }
    
    npm run seed:admin
    if ($LASTEXITCODE -ne 0) { throw "Admin seeding failed" }
    Write-Host "✅ Admin users seeded" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "✅ Database deployment complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

Pop-Location

