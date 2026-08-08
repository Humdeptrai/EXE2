$ErrorActionPreference = "Stop"
$port = 5173

$connections = Get-NetTCPConnection `
    -LocalPort $port `
    -State Listen `
    -ErrorAction SilentlyContinue

if (-not $connections) {
    Write-Host "Port $port is available."
    exit 0
}

$processIds = $connections |
    Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

    if ($process) {
        Write-Host "Stopping process $($process.ProcessName) PID $processId on port $port..."
        Stop-Process -Id $processId -Force
    }
}

Start-Sleep -Milliseconds 500
Write-Host "Port $port is ready."