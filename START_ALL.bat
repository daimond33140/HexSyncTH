@echo off
chcp 65001 >nul
title HexSyncTH - All Services Launcher v9.1.2
color 0b

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

echo ========================================================
echo       HexSyncTH Web Controller & Server Launcher
echo ========================================================
echo.
echo [*] Project Root: %ROOT_DIR%
echo [*] Starting Cloudflare Tunnel...
start "" wscript.exe "%ROOT_DIR%\start_tunnel.vbs"

echo [*] Starting Backend API Server (Port 4000)...
start "HexSyncTH Backend (Port 4000)" cmd /k "cd /d "%ROOT_DIR%\server" && npm start"

echo [*] Starting Frontend Server (Port 5173)...
start "HexSyncTH Frontend (Port 5173)" cmd /k "cd /d "%ROOT_DIR%" && node serve_dist.cjs"

echo.
echo [✓] All services initiated!
timeout /t 3 >nul
exit
