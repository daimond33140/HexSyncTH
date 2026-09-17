@echo off
chcp 65001 >nul
title HexSyncTH - Local Server Launcher
color 0b

echo ========================================================
echo       HexSyncTH Local Development Launcher
echo ========================================================
echo.

echo [*] Checking and freeing ports 4000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo [*] Starting Backend API Server (Port 4000)...
start "HexSyncTH Backend (Port 4000)" cmd /k "cd /d D:\wee\server && node index.js"

echo [*] Starting Frontend Server (Port 5173)...
start "HexSyncTH Frontend (Port 5173)" cmd /k "cd /d D:\wee && node serve_dist.cjs"

echo.
echo [OK] All services started successfully!
echo [*] Opening browser http://localhost:5173 ...
timeout /t 2 >nul
start http://localhost:5173
exit
