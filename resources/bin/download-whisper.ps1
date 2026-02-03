# Download do Whisper.cpp para Windows
# Execute este script no PowerShell

$binDir = "$PSScriptRoot"
$whisperUrl = "https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.4/whisper-bin-x64.zip"
$zipPath = "$binDir\whisper.zip"
$exePath = "$binDir\whisper.exe"

Write-Host "Baixando whisper.cpp..." -ForegroundColor Cyan

try {
    # Download
    Invoke-WebRequest -Uri $whisperUrl -OutFile $zipPath -UseBasicParsing
    
    # Extrair
    Write-Host "Extraindo..." -ForegroundColor Cyan
    Expand-Archive -Path $zipPath -DestinationPath "$binDir\temp" -Force
    
    # Mover o executável main.exe -> whisper.exe
    $mainExe = Get-ChildItem -Path "$binDir\temp" -Filter "main.exe" -Recurse | Select-Object -First 1
    if ($mainExe) {
        Move-Item -Path $mainExe.FullName -Destination $exePath -Force
        Write-Host "whisper.exe instalado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "Erro: main.exe nao encontrado no zip" -ForegroundColor Red
    }
    
    # Limpar
    Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$binDir\temp" -Recurse -Force -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "Erro ao baixar: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Baixe manualmente de:" -ForegroundColor Yellow
    Write-Host "https://github.com/ggerganov/whisper.cpp/releases" -ForegroundColor White
    Write-Host ""
    Write-Host "E renomeie 'main.exe' para 'whisper.exe'" -ForegroundColor Yellow
}
