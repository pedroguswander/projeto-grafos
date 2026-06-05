# Build the Python backend and React frontend from the repository root.
# Usage: .\build.ps1

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $projectRoot

try {
    function Invoke-NativeCommand {
        param(
            [Parameter(Mandatory = $true)]
            [string]$FilePath,

            [string[]]$Arguments = @()
        )

        & $FilePath @Arguments

        if ($LASTEXITCODE -ne 0) {
            $argsText = if ($Arguments.Count -gt 0) { " $($Arguments -join ' ')" } else { '' }
            throw ("Command failed with exit code {0}: {1}{2}" -f $LASTEXITCODE, $FilePath, $argsText)
        }
    }

    Write-Host "==> Installing Python dependencies..."
    function Get-RealPythonPath {
        param([string]$cmdName)
        $cmd = Get-Command $cmdName -ErrorAction SilentlyContinue
        if ($cmd -and $cmd.Path -and (Test-Path $cmd.Path) -and ($cmd.Path -notlike '*WindowsApps*')) {
            return $cmd.Path
        }
        return $null
    }

    $pythonCandidates = @(
        (Join-Path $projectRoot '.venv\Scripts\python.exe'),
        (Join-Path $projectRoot 'venv\Scripts\python.exe'),
        (Get-RealPythonPath python.exe),
        (Get-RealPythonPath python3.exe),
        (Get-RealPythonPath py.exe),
        'C:\Program Files\Python312\python.exe'
    ) | Where-Object { $_ }

    $python = $pythonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $python) {
        throw "Python executable not found. Install Python and ensure it is available as python.exe or py.exe."
    }

    Invoke-NativeCommand -FilePath $python -Arguments @('-m', 'pip', 'install', '--disable-pip-version-check', '-r', 'requirements.txt')

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
    if (Test-Path 'package-lock.json') {
        Invoke-NativeCommand -FilePath $npm -Arguments @('ci')
    }
    else {
        Invoke-NativeCommand -FilePath $npm -Arguments @('install')
    }

    Invoke-NativeCommand -FilePath $npm -Arguments @('run', 'build')
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
