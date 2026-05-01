# Build the Python backend and React frontend from the repository root.
# Usage: .\build.ps1

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $projectRoot

try {
    Write-Host "==> Installing Python dependencies..."
    function Get-RealPythonPath {
        param([string]$cmdName)
        $cmd = Get-Command $cmdName -ErrorAction SilentlyContinue
        if ($cmd -and $cmd.Path -and (Test-Path $cmd.Path) -and ($cmd.Path -notlike '*WindowsApps*')) {
            return $cmd.Path
        }
        return $null
    }

    $python = Get-RealPythonPath python.exe
    if (-not $python) {
        $python = Get-RealPythonPath python3.exe
    }
    if (-not $python) {
        $python = Get-RealPythonPath py.exe
    }
    if (-not $python) {
        $python = "C:\Program Files\Python312\python.exe"
    }

    if (-not (Test-Path $python)) {
        throw "Python executable not found. Install Python and ensure it is available as python.exe or py.exe."
    }

    & $python -m pip install -r requirements.txt

    Write-Host "==> Installing frontend dependencies..."
    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCmd) {
        $npm = $npmCmd.Source
    } else {
        $npm = "C:\Program Files\nodejs\npm.cmd"
    }

    if (-not (Test-Path $npm)) {
        throw "npm executable not found. Install Node.js and ensure npm is available."
    }

    $nodeBin = Split-Path -Parent $npm
    $env:Path = "$nodeBin;$env:Path"

    Push-Location "frontend"
    & $npm install
    & $npm run build
    Pop-Location

    Write-Host "==> Build completo: backend e frontend concluídos."
}
catch {
    Write-Error "Build falhou: $_"
    exit 1
}
finally {
    Pop-Location
}
