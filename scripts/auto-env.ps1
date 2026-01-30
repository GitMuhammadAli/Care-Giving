# =============================================================================
# Auto-Detect and Switch Environment Profile
# =============================================================================
# Checks if local Docker services are running. If yes → LOCAL, otherwise → CLOUD
# Run: .\scripts\auto-env.ps1
# Options:
#   -Force local   → Force local profile (skip detection)
#   -Force cloud   → Force cloud profile (skip detection)
#   -Quiet         → Suppress output (for scripting)
# =============================================================================

param(
    [ValidateSet("local", "cloud", "")]
    [string]$Force = "",
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $rootDir

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    if (-not $Quiet) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Test-TcpPort {
    param([string]$Host, [int]$Port, [int]$Timeout = 1000)
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect($Host, $Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne($Timeout, $false)
        
        if ($wait -and $tcpClient.Connected) {
            $tcpClient.Close()
            return $true
        }
        $tcpClient.Close()
        return $false
    }
    catch {
        return $false
    }
}

function Test-DockerService {
    param([string]$Name, [string]$Host, [int]$Port)
    
    $isUp = Test-TcpPort -Host $Host -Port $Port
    $status = if ($isUp) { "✓" } else { "✗" }
    $color = if ($isUp) { "Green" } else { "Red" }
    
    Write-Status "  $status $Name (${Host}:${Port})" $color
    return $isUp
}

# =============================================================================
# DETECT ENVIRONMENT
# =============================================================================

function Get-DetectedProfile {
    Write-Status ""
    Write-Status "═══════════════════════════════════════════════════════════════" "Cyan"
    Write-Status "  CareCircle - Environment Auto-Detection" "Cyan"
    Write-Status "═══════════════════════════════════════════════════════════════" "Cyan"
    Write-Status ""
    Write-Status "Checking local Docker services..." "Yellow"
    Write-Status ""
    
    # Check each service
    $postgresUp = Test-DockerService -Name "PostgreSQL" -Host "localhost" -Port 5432
    $redisUp = Test-DockerService -Name "Redis" -Host "localhost" -Port 6379
    $rabbitmqUp = Test-DockerService -Name "RabbitMQ" -Host "localhost" -Port 5672
    
    Write-Status ""
    
    # Determine profile based on service availability
    $allLocalUp = $postgresUp -and $redisUp -and $rabbitmqUp
    $anyLocalUp = $postgresUp -or $redisUp -or $rabbitmqUp
    
    if ($allLocalUp) {
        Write-Status "All local services detected!" "Green"
        return "local"
    }
    elseif ($anyLocalUp) {
        Write-Status "⚠ Some local services missing - using CLOUD for consistency" "Yellow"
        Write-Status "  Tip: Run 'docker compose up -d' to start all local services" "DarkGray"
        return "cloud"
    }
    else {
        Write-Status "No local services detected - using CLOUD" "Cyan"
        return "cloud"
    }
}

# =============================================================================
# MAIN LOGIC
# =============================================================================

# Determine which profile to use
if ($Force) {
    $profile = $Force.ToLower()
    Write-Status ""
    Write-Status "═══════════════════════════════════════════════════════════════" "Cyan"
    Write-Status "  CareCircle - Environment Profile (Forced)" "Cyan"
    Write-Status "═══════════════════════════════════════════════════════════════" "Cyan"
    Write-Status ""
    Write-Status "Forced profile: $($profile.ToUpper())" "Magenta"
}
else {
    $profile = Get-DetectedProfile
}

Write-Status ""

# Check current profile to avoid unnecessary switches
$currentEnvPath = Join-Path $rootDir ".env"
$currentProfile = $null

if (Test-Path $currentEnvPath) {
    $envContent = Get-Content $currentEnvPath -Raw -ErrorAction SilentlyContinue
    if ($envContent -match "ACTIVE PROFILE: LOCAL") {
        $currentProfile = "local"
    }
    elseif ($envContent -match "ACTIVE PROFILE: CLOUD") {
        $currentProfile = "cloud"
    }
}

# Switch profile if needed
if ($currentProfile -eq $profile) {
    Write-Status "Profile already set to $($profile.ToUpper()) - no change needed" "Green"
}
else {
    Write-Status "Switching to $($profile.ToUpper()) profile..." "Yellow"
    
    $scriptPath = Join-Path $rootDir "scripts" "use-$profile.ps1"
    if (Test-Path $scriptPath) {
        & $scriptPath
    }
    else {
        Write-Host "ERROR: Script not found: $scriptPath" -ForegroundColor Red
        exit 1
    }
}

Write-Status ""
Write-Status "═══════════════════════════════════════════════════════════════" "Cyan"

# Return the profile for scripting
if ($Quiet) {
    Write-Output $profile
}

exit 0

