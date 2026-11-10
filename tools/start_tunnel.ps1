# start_tunnel.ps1 - Lanzador para jugar en clase sin puertos abiertos ni cortafuegos
$ErrorActionPreference = "Continue"

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  MILLION DOLLAR CITY -- MODO CLASE / REDES RESTRINGIDAS" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Comprobar si Node.js esta disponible
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[X] ERROR: Node.js no esta instalado o no esta en el PATH." -ForegroundColor Red
    Write-Host "Por favor, instala Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# 2. Comprobar si cloudflared.exe existe
$cloudflaredPath = Join-Path $rootDir "tools\cloudflared.exe"
if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "[X] ERROR: No se encontro tools\cloudflared.exe." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# 3. Comprobar si el servidor Node ya esta corriendo en el puerto 3000
$portInUse = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$nodeProcess = $null

if ($portInUse) {
    Write-Host "[i] Servidor Node.js ya detectado escuchando en el puerto 3000." -ForegroundColor Green
} else {
    Write-Host "[*] Iniciando servidor de Million Dollar City en segundo plano..." -ForegroundColor Cyan
    $nodeProcess = Start-Process -FilePath "node" -ArgumentList "server/server.js" -WorkingDirectory $rootDir -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# 4. Crear archivo temporal de log para cloudflared
$tunnelLog = Join-Path $rootDir "tools\tunnel.log"
if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force -ErrorAction SilentlyContinue }

Write-Host "[*] Levantando tunel HTTPS/WSS seguro a traves de Cloudflare..." -ForegroundColor Cyan
Write-Host "    (Evita firewalls, puertos cerrados y aislamiento Wi-Fi de clase)" -ForegroundColor DarkGray

$cfProcess = Start-Process -FilePath $cloudflaredPath -ArgumentList "tunnel --url http://localhost:3000" -WorkingDirectory $rootDir -RedirectStandardError $tunnelLog -RedirectStandardOutput $tunnelLog -PassThru -WindowStyle Hidden

# 5. Esperar a obtener la URL publica de trycloudflare
$tunnelUrl = $null
$maxWaitSeconds = 25
$startTime = Get-Date

while (((Get-Date) - $startTime).TotalSeconds -lt $maxWaitSeconds) {
    if (Test-Path $tunnelLog) {
        $content = Get-Content $tunnelLog -Raw -ErrorAction SilentlyContinue
        if ($content -match '(https://[a-zA-Z0-9-]+\.trycloudflare\.com)') {
            $tunnelUrl = $matches[1]
            break
        }
    }
    Start-Sleep -Milliseconds 500
}

if (-not $tunnelUrl) {
    Write-Host "[X] No se pudo obtener la URL de Cloudflare en $maxWaitSeconds segundos." -ForegroundColor Red
    Write-Host "Revisa la conexion a internet de este equipo." -ForegroundColor Yellow
    if ($cfProcess -and -not $cfProcess.HasExited) { Stop-Process -Id $cfProcess.Id -Force }
    Read-Host "Presiona Enter para salir"
    exit 1
}

# 6. Copiar al portapapeles y mostrar en pantalla
try {
    Set-Clipboard -Value $tunnelUrl
    $copied = $true
} catch {
    $copied = $false
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "               ¡SERVIDOR EN LINEA PARA TU CLASE!                     " -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  [+] ENLACE PUBLICO PARA TUS COMPANEROS:" -ForegroundColor Yellow
Write-Host "      $tunnelUrl" -ForegroundColor Cyan
Write-Host ""
if ($copied) {
    Write-Host "  [OK] Enlace copiado automaticamente al portapapeles (Ctrl + V para compartir)." -ForegroundColor Green
}
Write-Host "  [OK] Trafico seguro por HTTPS y WebSockets (WSS)." -ForegroundColor White
Write-Host "  [OK] Tus companeros pueden entrar desde portatiles, moviles o tablets." -ForegroundColor White
Write-Host "  [OK] Sin puertos que abrir en el router del instituto." -ForegroundColor White
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""

# 7. Abrir navegador en el anfitrion
Write-Host "[*] Abriendo el juego en tu navegador..." -ForegroundColor Cyan
Start-Process $tunnelUrl

Write-Host ""
Write-Host "Manten esta ventana abierta mientras esteis jugando." -ForegroundColor Yellow
Write-Host "Presiona [ENTER] aqui cuando quieras apagar el servidor y salir." -ForegroundColor DarkYellow
Read-Host

# 8. Limpieza al salir
Write-Host "[*] Deteniendo tunel y liberando recursos..." -ForegroundColor DarkGray
if ($cfProcess -and -not $cfProcess.HasExited) {
    Stop-Process -Id $cfProcess.Id -Force -ErrorAction SilentlyContinue
}
if ($nodeProcess -and -not $nodeProcess.HasExited) {
    Stop-Process -Id $nodeProcess.Id -Force -ErrorAction SilentlyContinue
}
if (Test-Path $tunnelLog) {
    Remove-Item $tunnelLog -Force -ErrorAction SilentlyContinue
}

Write-Host "[OK] Servidor y tunel detenidos correctamente." -ForegroundColor Green
