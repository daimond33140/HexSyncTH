# assemble_clean_client.ps1
# Assembles pristine HexSyncTH standalone distribution for customers

$ErrorActionPreference = "Stop"
$sourceDir = "D:\wee"
$clientDir = "D:\HexSyncTH_Client"
$zipPath = "D:\HexSyncTH_Client.zip"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Assembling HexSyncTH Clean Customer Distribution Package  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Clean existing output directory if present
if (Test-Path $clientDir) {
    Write-Host "[1/7] Removing existing $clientDir..." -ForegroundColor Yellow
    Remove-Item $clientDir -Recurse -Force
}
New-Item -ItemType Directory -Path $clientDir -Force | Out-Null
New-Item -ItemType Directory -Path "$clientDir\bin" -Force | Out-Null
New-Item -ItemType Directory -Path "$clientDir\dist" -Force | Out-Null
New-Item -ItemType Directory -Path "$clientDir\server" -Force | Out-Null
New-Item -ItemType Directory -Path "$clientDir\server\data" -Force | Out-Null

# 2. Copy Controller with Auto-Detect and Scripts
Write-Host "[2/7] Copying Controller, Scripts, and Proxies..." -ForegroundColor Yellow
Copy-Item "$sourceDir\dist_app\HexSyncTH_Control.exe" "$clientDir\HexSyncTH_Control.exe" -Force
Copy-Item "$sourceDir\INSTALL.bat" "$clientDir\INSTALL.bat" -Force
Copy-Item "$sourceDir\START_ALL.bat" "$clientDir\START_ALL.bat" -Force
Copy-Item "$sourceDir\serve_dist.cjs" "$clientDir\serve_dist.cjs" -Force
Copy-Item "$sourceDir\start_tunnel.vbs" "$clientDir\start_tunnel.vbs" -Force

# 3. Create Clean site_config.json
Write-Host "[3/7] Creating clean site_config.json for customer..." -ForegroundColor Yellow
$clientConfig = @"
{
  "Domain": "hexsyncth.site",
  "TunnelToken": "",
  "BackendPort": 4000,
  "FrontendPort": 5173
}
"@
Set-Content -Path "$clientDir\site_config.json" -Value $clientConfig -Encoding UTF8

# 4. Copy Binaries (node.exe, cloudflared.exe)
Write-Host "[4/7] Copying portable binaries (node.exe, cloudflared.exe)..." -ForegroundColor Yellow
Copy-Item "$sourceDir\bin\node.exe" "$clientDir\bin\node.exe" -Force
if (Test-Path "$sourceDir\bin\cloudflared.exe") {
    Copy-Item "$sourceDir\bin\cloudflared.exe" "$clientDir\bin\cloudflared.exe" -Force
}

# 5. Copy Compiled Frontend (dist)
Write-Host "[5/7] Copying compiled frontend (dist)..." -ForegroundColor Yellow
Copy-Item "$sourceDir\dist\*" "$clientDir\dist\" -Recurse -Force

# 6. Copy Server Files and Clean SQLite Database
Write-Host "[6/7] Copying server backend and clean database..." -ForegroundColor Yellow
$serverExcludes = @("data", "node_modules", ".cache", "*.bak", "run_migration.js", "migrate_pg_to_sqlite.cjs")
Get-ChildItem "$sourceDir\server" | ForEach-Object {
    if ($_.Name -notin $serverExcludes) {
        Copy-Item $_.FullName "$clientDir\server\" -Recurse -Force
    }
}

# Copy server node_modules (for zero-dependency customer PC execution)
if (Test-Path "$sourceDir\server\node_modules") {
    Write-Host "    - Copying server node_modules (zero-setup)..." -ForegroundColor Gray
    Copy-Item "$sourceDir\server\node_modules" "$clientDir\server\" -Recurse -Force
}

# Generate and place the clean SQLite database
Write-Host "    - Generating fresh clean database for customer..." -ForegroundColor Gray
node "$sourceDir\server\utils\create_clean_template_db.js" "$clientDir\server\data\database.sqlite"

# Create clean .env
$clientEnv = @"
DB_DIALECT=sqlite
JWT_SECRET=d35eab7a7a6dc834e4fdc276e9d1e0c6fd109494a1b2c76212aad166fd88474c
PORT=4000
"@
Set-Content -Path "$clientDir\server\.env" -Value $clientEnv -Encoding UTF8

# 7. Create Customer Quick Guide
Write-Host "[7/7] Generating Customer Readme & Guide..." -ForegroundColor Yellow
$guide = @"
===================================================================
      HEXSYNCTH WEB CONTROLLER & SERVER ORCHESTRATOR v9.1.2
                 คู่มือสำหรับลูกค้า (Customer Edition)
===================================================================

[ ข้อมูลเบื้องต้นเกี่ยวกับแพ็กเกจนี้ ]
- เป็นระบบสำเร็จรูป Zero-Setup พร้อมใช้งานทันทีบน Windows 10/11
- ตัวโปรแกรม HexSyncTH_Control.exe มีระบบ Auto-Detect ตรวจหาตำแหน่งไฟล์โปรเจกต์เองอัตโนมัติ
  (สามารถย้ายโฟลเดอร์นี้ไปไว้ที่ไดรฟ์ C:\, D:\, Desktop หรือโฟลเดอร์ใดก็ได้ โปรแกรมจะหาไฟล์เจอเสมอ)

-------------------------------------------------------------------
[ ขั้นตอนการเริ่มต้นใช้งานครั้งแรก ]
-------------------------------------------------------------------
1. ดับเบิ้ลคลิกไฟล์ 'INSTALL.bat' หรือ 'HexSyncTH_Control.exe'
2. หน้าต่าง Cyberpunk Web Controller จะเปิดขึ้นมา
3. เข้าสู่ระบบด้วยรหัสผ่านแอดมินเริ่มต้น:
   - Username: admin
   - Password: daimond33140
   (แนะนำให้เข้าไปเปลี่ยนรหัสผ่านในหน้า จัดการผู้ใช้ / ตั้งค่า)

4. การเปิดใช้งานเว็บไซต์:
   - กดปุ่ม 'START ALL SERVICES' เพื่อเปิดระบบทั้งหมดในคลิกเดียว:
     • Backend API (Port 4000)
     • Frontend Web Server (Port 5173)
     • Cloudflare Tunnel (สำหรับการออนไลน์สู่โลกภายนอก)

-------------------------------------------------------------------
[ ข้อมูลสินค้าและระบบตัวอย่างที่ติดตั้งมาให้ ]
-------------------------------------------------------------------
- หมวดหมู่สินค้า: 'สินค้าทั่วไป' (General)
- สินค้าตัวอย่าง: 'Test product' ราคา 50 บาท (มี Stock Key ตัวอย่าง 5 รหัส)
- ฐานข้อมูลสมาชิกและประวัติการซื้อเป็นฐานข้อมูลว่างเปล่า ปลอดภัย 100%
  สามารถเพิ่มสินค้า ลบสินค้า และปรับแต่งหน้าเว็บได้ตามต้องการ

===================================================================
"@
Set-Content -Path "$clientDir\README_CUSTOMER.txt" -Value $guide -Encoding UTF8

# 8. Create ZIP archive
Write-Host "Creating ZIP package: $zipPath..." -ForegroundColor Cyan
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
Compress-Archive -Path "$clientDir\*" -DestinationPath $zipPath -Force

Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Successfully created:                                      " -ForegroundColor Green
Write-Host "  Folder: $clientDir                                        " -ForegroundColor Green
Write-Host "  Zip:    $zipPath                                          " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
