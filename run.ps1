# Script to run the full project
# Usage: .\run.ps1

$ErrorActionPreference = 'Stop'

Write-Host "Starting Projeto Grafos" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Yellow

# Resolve Python executable
$pythonCmd = Get-Command python.exe -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command python3.exe -ErrorAction SilentlyContinue
}

if ($pythonCmd) {
    $pythonPath = $pythonCmd.Source
} else {
    $pythonPath = "C:\Program Files\Python312\python.exe"
}

if (-not (Test-Path $pythonPath)) {
    throw "Python not found. Install Python and ensure it is on PATH."
}

# Resolve npm
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($npmCmd) {
    $npmPath = $npmCmd.Source
} else {
    $npmPath = "C:\Program Files\nodejs\npm.cmd"
}

if (-not (Test-Path $npmPath)) {
    throw "npm not found. Install Node.js and ensure npm is on PATH."
}

$nodeBin = Split-Path -Parent $npmPath
$env:Path = "$nodeBin;$env:Path"

function Start-BackgroundProcess {
    param(
        [string]$FilePath,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory = $null
    )

    $params = @{
        FilePath = $FilePath
        ArgumentList = $Arguments
        PassThru = $true
        WindowStyle = 'Minimized'
    }

    if ($WorkingDirectory) {
        $params.WorkingDirectory = $WorkingDirectory
    }

    return Start-Process @params
}

function Test-PortFree {
    param([int]$Port)
    $inUse = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    return -not $inUse
}

function Get-FreePort {
    param([int[]]$Candidates)
    foreach ($port in $Candidates) {
        if (Test-PortFree -Port $port) {
            return $port
        }
    }
    throw "No free port found in list: $($Candidates -join ', ')"
}

$backendPort = Get-FreePort -Candidates @(5000, 5001, 5002, 5050)
$frontendPort = Get-FreePort -Candidates @(5173, 5174, 5175, 5180)

Write-Host "Starting backend API..." -ForegroundColor Cyan
$backendScript = Join-Path $PSScriptRoot 'src\api.py'
$backendProcess = Start-BackgroundProcess -FilePath $pythonPath -Arguments @($backendScript, '--port', "$backendPort") -WorkingDirectory $PSScriptRoot

Write-Host "Starting frontend Vite..." -ForegroundColor Cyan
$frontendProcess = Start-BackgroundProcess -FilePath $npmPath -Arguments @('run', 'dev', '--', '--host', '--port', "$frontendPort") -WorkingDirectory (Join-Path $PSScriptRoot 'frontend')

Write-Host ""
Write-Host "Servers started" -ForegroundColor Green
Write-Host "Frontend: http://localhost:$frontendPort/" -ForegroundColor White
Write-Host "Backend:  http://localhost:$backendPort/" -ForegroundColor White
Write-Host ""
Write-Host "Use Stop-Process -Id $($backendProcess.Id),$($frontendProcess.Id) to stop servers" -ForegroundColor Yellow
