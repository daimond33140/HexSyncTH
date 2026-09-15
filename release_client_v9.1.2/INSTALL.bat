@echo off
chcp 65001 >nul
title HexSyncTH Setup & Quick Launcher v9.1.2
color 0c
echo ========================================================
echo       HexSyncTH Web Control & Server Orchestrator
echo                   Version 9.1.2
echo                 By : HexSyncTH
echo ========================================================
echo.
echo [*] กำลังสร้างทางลัดบน Desktop...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'HexSyncTH Control Panel.lnk')); $s.TargetPath = [System.IO.Path]::Combine('%~dp0', 'HexSyncTH_Control.exe'); $s.WorkingDirectory = '%~dp0'; $s.Description = 'HexSyncTH Control Panel v9.1.2 By HexSyncTH'; $s.Save()"

echo [*] สร้างทางลัดบน Desktop สำเร็จ!
echo [*] กำลังเปิดโปรแกรมควบคุม HexSyncTH Control Panel...
start "" "%~dp0HexSyncTH_Control.exe"

echo.
echo [✓] ติดตั้งและพร้อมใช้งานเรียบร้อยแล้ว!
timeout /t 3 >nul
exit
