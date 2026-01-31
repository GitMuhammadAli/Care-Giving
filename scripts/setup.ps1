# =============================================================================
# CareCircle - First-Time Setup Script (Windows PowerShell)
# =============================================================================
# Run: .\scripts\setup.ps1
#
# This script will:
# 1. Check prerequisites (Node.js, pnpm, Docker)
# 2. Install dependencies
# 3. Setup environment files
# 4. Start Docker services
# 5. Setup database
# =============================================================================

$ErrorActionPreference = "Stop"

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Step($message) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  $message" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "  ✓ $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "  ⚠ $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "  ✗ $message" -ForegroundColor Red
}

# Banner
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                              ║" -ForegroundColor Cyan
Write-Host "║   🏥  CareCircle - First Time Setup                         ║" -ForegroundColor Cyan
Write-Host "║                                                              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $rootDir
Write-Host "Working directory: $rootDir" -ForegroundColor DarkGray

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
Write-Step "Step 1: Checking Prerequisites"

$hasErrors = $false

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion -match "v(\d+)") {
        $majorVersion = [int]$Matches[1]
        if ($majorVersion -ge 18) {
            Write-Success "Node.js $nodeVersion"
        } else {
            Write-Error "Node.js $nodeVersion (requires v18+)"
            $hasErrors = $true
        }
    }
} catch {
    Write-Error "Node.js not found. Install from https://nodejs.org/"
    $hasErrors = $true
}

# Check pnpm
try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Success "pnpm v$pnpmVersion"
} catch {
    Write-Warning "pnpm not found. Installing..."
    npm install -g pnpm
    Write-Success "pnpm installed"
}

# Check Docker
try {
    $dockerVersion = docker --version 2>$null
    Write-Success "Docker installed"
    
    # Check if Docker is running
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker is running"
    } else {
        Write-Error "Docker is not running. Please start Docker Desktop."
        $hasErrors = $true
    }
} catch {
    Write-Error "Docker not found. Install from https://docker.com/"
    $hasErrors = $true
}

# Check Docker Compose
try {
    $composeVersion = docker compose version 2>$null
    Write-Success "Docker Compose installed"
} catch {
    Write-Error "Docker Compose not found"
    $hasErrors = $true
}

if ($hasErrors) {
    Write-Host ""
    Write-Error "Please fix the above issues and run this script again."
    exit 1
}

# =============================================================================
# Step 2: Install Dependencies
# =============================================================================
Write-Step "Step 2: Installing Dependencies"

Write-Host "  Running pnpm install..." -ForegroundColor DarkGray
pnpm install --frozen-lockfile

if ($LASTEXITCODE -eq 0) {
    Write-Success "Dependencies installed"
} else {
    Write-Error "Failed to install dependencies"
    exit 1
}

# =============================================================================
# Step 3: Setup Environment Files
# =============================================================================
Write-Step "Step 3: Setting Up Environment"

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "  No .env file found. Creating from local profile..." -ForegroundColor DarkGray
    
    # Check if env templates exist
    if (Test-Path "env/base.env") {
        & "$rootDir\scripts\use-local.ps1"
        Write-Success "Environment configured for LOCAL development"
    } elseif (Test-Path "env/base.env.example") {
        Write-Warning "env/base.env not found. Copying from examples..."
        Copy-Item "env/base.env.example" "env/base.env"
        Copy-Item "env/local.env.example" "env/local.env"
        & "$rootDir\scripts\use-local.ps1"
        Write-Success "Environment configured (update env/*.env with your values)"
    } else {
        Write-Error "No environment templates found!"
        exit 1
    }
} else {
    Write-Success "Environment file exists"
}

# =============================================================================
# Step 4: Start Docker Services
# =============================================================================
Write-Step "Step 4: Starting Docker Services"

Write-Host "  Starting PostgreSQL, Redis, RabbitMQ..." -ForegroundColor DarkGray
docker compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker services started"
} else {
    Write-Error "Failed to start Docker services"
    exit 1
}

# Wait for services to be healthy
Write-Host "  Waiting for services to be ready..." -ForegroundColor DarkGray
$maxAttempts = 30
$attempt = 0

do {
    Start-Sleep -Seconds 2
    $attempt++
    
    $pgHealth = docker compose ps postgres --format "{{.Health}}" 2>$null
    $redisHealth = docker compose ps redis --format "{{.Health}}" 2>$null
    
    if ($pgHealth -eq "healthy" -and $redisHealth -eq "healthy") {
        Write-Success "All services healthy"
        break
    }
    
    Write-Host "    Attempt $attempt/$maxAttempts..." -ForegroundColor DarkGray
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Warning "Services may not be fully ready. Continuing anyway..."
}

# =============================================================================
# Step 5: Setup Database
# =============================================================================
Write-Step "Step 5: Setting Up Database"

Write-Host "  Generating Prisma client..." -ForegroundColor DarkGray
pnpm --filter @carecircle/database generate

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to generate Prisma client"
    exit 1
}
Write-Success "Prisma client generated"

Write-Host "  Pushing schema to database..." -ForegroundColor DarkGray
pnpm --filter @carecircle/database db:push

if ($LASTEXITCODE -eq 0) {
    Write-Success "Database schema created"
} else {
    Write-Error "Failed to push database schema"
    exit 1
}

# =============================================================================
# Complete!
# =============================================================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║   ✓  Setup Complete!                                         ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Start development servers:" -ForegroundColor White
Write-Host "     pnpm dev:all" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Or start individually:" -ForegroundColor White
Write-Host "     pnpm dev:api      # API on http://localhost:4000" -ForegroundColor Cyan
Write-Host "     pnpm dev:web      # Web on http://localhost:3000" -ForegroundColor Cyan
Write-Host "     pnpm dev:workers  # Background workers" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Or use Make commands:" -ForegroundColor White
Write-Host "     make dev          # Start everything" -ForegroundColor Cyan
Write-Host "     make help         # See all commands" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful URLs:" -ForegroundColor Yellow
Write-Host "  - Web App:     http://localhost:3000" -ForegroundColor White
Write-Host "  - API:         http://localhost:4000" -ForegroundColor White
Write-Host "  - Swagger:     http://localhost:4000/api" -ForegroundColor White
Write-Host "  - RabbitMQ UI: http://localhost:15672 (guest/guest)" -ForegroundColor White
Write-Host ""

