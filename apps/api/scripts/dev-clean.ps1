# Kill any process on port 4000 before starting dev server
$port = 4000

function Kill-ProcessOnPort {
    param([int]$Port)

    # Method 1: Using netstat (more reliable on Windows)
    $netstatOutput = netstat -ano | Select-String ":$Port\s.*LISTENING"

    if ($netstatOutput) {
        foreach ($line in $netstatOutput) {
            $parts = $line -split '\s+'
            $processId = $parts[-1]
            if ($processId -match '^\d+$' -and $processId -ne '0') {
                Write-Host "Killing process $processId on port $Port..." -ForegroundColor Yellow
                try {
                    Stop-Process -Id $processId -Force -ErrorAction Stop
                    Write-Host "Process $processId killed successfully" -ForegroundColor Green
                } catch {
                    Write-Host "Could not kill process $processId - it may have already exited" -ForegroundColor Gray
                }
            }
        }
        # Wait for port to be released
        Start-Sleep -Seconds 1
    }

    # Method 2: Double-check with Get-NetTCPConnection
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
                     Select-Object -ExpandProperty OwningProcess -Unique

        foreach ($processId in $processes) {
            if ($processId -and $processId -ne 0) {
                Write-Host "Killing remaining process $processId on port $Port..." -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        # Ignore errors - port might already be free
    }
}

# Kill processes on port
Kill-ProcessOnPort -Port $port

# Verify port is free
$stillInUse = netstat -ano | Select-String ":$port\s.*LISTENING"
if ($stillInUse) {
    Write-Host "Warning: Port $port might still be in use. Waiting..." -ForegroundColor Red
    Start-Sleep -Seconds 3
} else {
    Write-Host "Port $port is free" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting NestJS dev server..." -ForegroundColor Cyan
Write-Host ""

# Run the dev server
npm run start:dev
