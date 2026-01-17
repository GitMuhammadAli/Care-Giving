# Kill any process on port 4000 before starting dev server
$port = 4000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Killing process $process on port $port..." -ForegroundColor Yellow
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Port $port is now free" -ForegroundColor Green
}

Write-Host "Starting NestJS dev server..." -ForegroundColor Cyan
npm run start:dev
