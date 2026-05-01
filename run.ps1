# Script para executar o projeto completo
# Uso: .\run.ps1

$ErrorActionPreference = 'Stop'

Write-Host "🚀 Iniciando Projeto Grafos com Dijkstra" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow

# Verificar se Python está disponível
$python = Get-Command python.exe -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python3.exe -ErrorAction SilentlyContinue
}
if (-not $python) {
    $python = "C:\Program Files\Python312\python.exe"
}

if (-not (Test-Path $python)) {
    throw "Python não encontrado. Instale o Python e certifique-se de que está no PATH."
}

# Verificar se Node.js está disponível
$nodeBin = "C:\Program Files\nodejs"
$env:Path = "$nodeBin;$env:Path"

# Função para iniciar processo em background
function Start-BackgroundProcess {
    param([string]$Command, [string]$WorkingDirectory = $null)

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "powershell.exe"
    $startInfo.Arguments = "-Command `"$Command`""
    if ($WorkingDirectory) {
        $startInfo.WorkingDirectory = $WorkingDirectory
    }
    $startInfo.UseShellExecute = $true
    $startInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized

    $process = [System.Diagnostics.Process]::Start($startInfo)
    return $process
}

try {
    Write-Host "📊 Iniciando Backend Flask (API)..." -ForegroundColor Cyan
    $backendCommand = "& '$python' '$PSScriptRoot\src\api.py'"
    $backendProcess = Start-BackgroundProcess -Command $backendCommand

    Start-Sleep -Seconds 3  # Aguardar backend iniciar

    Write-Host "🌐 Iniciando Frontend React..." -ForegroundColor Cyan
    $frontendCommand = "cd '$PSScriptRoot\frontend'; npm run dev"
    $frontendProcess = Start-BackgroundProcess -Command $frontendCommand -WorkingDirectory "$PSScriptRoot\frontend"

    Write-Host "" -ForegroundColor Green
    Write-Host "✅ SERVIDORES INICIADOS COM SUCESSO!" -ForegroundColor Green
    Write-Host "" -ForegroundColor Yellow
    Write-Host "🌐 Frontend (Interface Web): http://localhost:5173/" -ForegroundColor White
    Write-Host "🔧 Backend (API Flask): http://localhost:5000/" -ForegroundColor White
    Write-Host "" -ForegroundColor Cyan
    Write-Host "📋 Funcionalidades:" -ForegroundColor White
    Write-Host "  • Visualização interativa do grafo de aeroportos" -ForegroundColor Gray
    Write-Host "  • Clique nos nós para selecionar origem/destino" -ForegroundColor Gray
    Write-Host "  • Cálculo automático de caminhos usando Dijkstra" -ForegroundColor Gray
    Write-Host "  • Destaque visual do caminho encontrado" -ForegroundColor Gray
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Pressione Ctrl+C para parar os servidores" -ForegroundColor Red

    # Aguardar processos
    Wait-Process -Id $backendProcess.Id, $frontendProcess.Id

} catch {
    Write-Host "❌ Erro ao iniciar servidores: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Cleanup
    if ($backendProcess -and !$backendProcess.HasExited) {
        $backendProcess.Kill()
    }
    if ($frontendProcess -and !$frontendProcess.HasExited) {
        $frontendProcess.Kill()
    }
}