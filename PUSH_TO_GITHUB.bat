@echo off
chcp 65001 >nul
title HexSyncTH - อัปเดตโค้ดขึ้นเว็บอัตโนมัติ (1-Click Deploy)
cd /d D:\wee
echo ===================================================
echo     HexSyncTH - กำลังส่งโค้ดล่าสุดขึ้น GitHub...
echo ===================================================
echo.

echo [1/3] กำลังรวบรวมไฟล์ที่แก้ไข...
"C:\Program Files\Git\cmd\git.exe" add .

echo [2/3] กำลังบันทึกการเปลี่ยนแปลง (Commit)...
"C:\Program Files\Git\cmd\git.exe" commit -m "Auto update website: %date% %time%"

echo [3/3] กำลังส่งขึ้น GitHub (Push to main)...
"C:\Program Files\Git\cmd\git.exe" push origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================
    echo  [สำเร็จ] อัปเดตโค้ดขึ้น GitHub เรียบร้อยแล้ว!
    echo  Vercel และ Render กำลังนำโค้ดใหม่ขึ้นเว็บจริงให้อัตโนมัติ
    echo  (รอประมาณ 1 นาที เว็บจะเปลี่ยนตามโค้ดใหม่ทันที)
    echo ===================================================
) else (
    echo ===================================================
    echo  [แจ้งเตือน] ไม่พบไฟล์ที่มีการแก้ไขใหม่ หรือเกิดข้อผิดพลาด
    echo ===================================================
)
echo.
pause
