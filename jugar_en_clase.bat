@echo off
title Million Dollar City - Jugar en Clase (Sin Puertos)
chcp 65001 >nul
cls

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start_tunnel.ps1"
