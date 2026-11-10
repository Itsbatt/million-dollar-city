@echo off
title Million Dollar City - Servidor LAN y Servidor Web
color 0b
chcp 65001 >nul
cls

echo =====================================================================
echo   MILLION DOLLAR CITY — SERVIDOR MULTIJUGADOR LOCAL / LAN
echo =====================================================================
echo.
echo Obteniendo la direccion IP local de tu ordenador...
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0 ^| findstr /v "255.255.255.255"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip

echo.
echo  -------------------------------------------------------------
echo   [!] ENLACE PARA JUGAR EN ESTE EQUIPO:
echo       http://localhost:3000
echo.
echo   [!] ENLACE PARA TUS AMIGOS (MISMA RED WI-FI / CLASE):
echo       http://%LOCAL_IP%:3000
echo  -------------------------------------------------------------
echo.
echo  Abriendo el juego en tu navegador predeterminado...
start http://localhost:3000

echo  Iniciando el servidor Node.js y Socket.IO...
echo  (Manten esta ventana abierta mientras juegues con tus amigos)
echo.

node server/server.js
pause
