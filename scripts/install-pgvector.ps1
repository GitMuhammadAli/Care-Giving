# ============================================================================
# Install pgvector for local PostgreSQL 17 on Windows
# ============================================================================
# RUN THIS AS ADMINISTRATOR:
#   Right-click PowerShell → "Run as Administrator"
#   Then: cd C:\Ali\Pro\Care-Giving && .\scripts\install-pgvector.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

$pgRoot = "C:\Program Files\PostgreSQL\17"
$src = "$env:TEMP\pgvector-pg17"
$zipUrl = "https://github.com/andreiramani/pgvector_pgsql_windows/releases/download/0.8.1_17.6/vector.v0.8.1-pg17.zip"
$zipPath = "$env:TEMP\pgvector-pg17.zip"

Write-Host "`n=== pgvector Installer for PostgreSQL 17 ===" -ForegroundColor Cyan

# Step 1: Check PostgreSQL exists
if (-not (Test-Path "$pgRoot\bin\pg_config.exe")) {
    Write-Host "ERROR: PostgreSQL 17 not found at $pgRoot" -ForegroundColor Red
    exit 1
}
Write-Host "[1/5] PostgreSQL 17 found at $pgRoot" -ForegroundColor Green

# Step 2: Download if needed
if (-not (Test-Path $zipPath)) {
    Write-Host "[2/5] Downloading pgvector v0.8.1..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
} else {
    Write-Host "[2/5] Using cached download" -ForegroundColor Green
}

# Step 3: Extract
Write-Host "[3/5] Extracting..." -ForegroundColor Yellow
if (Test-Path $src) { Remove-Item $src -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $src -Force

# Step 4: Copy files
Write-Host "[4/5] Installing pgvector files..." -ForegroundColor Yellow
Copy-Item "$src\lib\vector.dll" "$pgRoot\lib\" -Force
Copy-Item "$src\share\extension\*" "$pgRoot\share\extension\" -Force
if (Test-Path "$src\include") {
    if (-not (Test-Path "$pgRoot\include\server\extension\vector")) {
        New-Item -ItemType Directory -Path "$pgRoot\include\server\extension\vector" -Force | Out-Null
    }
    Copy-Item "$src\include\server\extension\vector\*" "$pgRoot\include\server\extension\vector\" -Force
}

# Step 5: Verify
Write-Host "[5/5] Verifying installation..." -ForegroundColor Yellow
$dllOk = Test-Path "$pgRoot\lib\vector.dll"
$ctlOk = Test-Path "$pgRoot\share\extension\vector.control"

if ($dllOk -and $ctlOk) {
    Write-Host "`n=== pgvector installed successfully! ===" -ForegroundColor Green
    Write-Host "Now run in psql:" -ForegroundColor Cyan
    Write-Host "  CREATE EXTENSION IF NOT EXISTS vector;" -ForegroundColor White
    Write-Host "`nThen create the AI embeddings table:" -ForegroundColor Cyan
    Write-Host "  Run: \$env:PGPASSWORD='1234'; & 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -U postgres -d carecircle -f packages/database/prisma/migrations/20260212000000_add_ai_embeddings/migration.sql" -ForegroundColor White
} else {
    Write-Host "`nERROR: Installation verification failed" -ForegroundColor Red
    Write-Host "  DLL: $dllOk  |  Control: $ctlOk" -ForegroundColor Red
}
