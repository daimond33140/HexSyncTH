# package_distribution.ps1
# Assemble portable client package for commercial distribution

$sourceDir = "d:\wee"
$outDir = "d:\wee\release_client_v9.1.2"
$zipPath = "d:\wee\HexSyncTH_Portable_v9.1.2.zip"

Write-Host "=== Assembling HexSyncTH Commercial Distribution Package ===" -ForegroundColor Cyan

if (Test-Path $outDir) {
    Remove-Item $outDir -Recurse -Force
}
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
New-Item -ItemType Directory -Path "$outDir\bin" -Force | Out-Null
New-Item -ItemType Directory -Path "$outDir\dist" -Force | Out-Null
New-Item -ItemType Directory -Path "$outDir\server" -Force | Out-Null

Write-Host "[1/6] Copying Core Controller & Scripts..." -ForegroundColor Yellow
Copy-Item "$sourceDir\HexSyncTH_Control.exe" "$outDir\" -Force
Copy-Item "$sourceDir\INSTALL.bat" "$outDir\" -Force
Copy-Item "$sourceDir\serve_dist.cjs" "$outDir\" -Force
Copy-Item "$sourceDir\start_tunnel.vbs" "$outDir\" -Force

Write-Host "[2/6] Copying Portable Binaries (node.exe, cloudflared.exe)..." -ForegroundColor Yellow
Copy-Item "$sourceDir\bin\node.exe" "$outDir\bin\" -Force
Copy-Item "$sourceDir\bin\cloudflared.exe" "$outDir\bin\" -Force

Write-Host "[3/6] Copying Compiled Frontend (dist)..." -ForegroundColor Yellow
Copy-Item "$sourceDir\dist\*" "$outDir\dist\" -Recurse -Force

Write-Host "[4/6] Copying Backend & SQLite Database..." -ForegroundColor Yellow
$serverExcludes = @("node_modules\.cache", "*.bak", "run_migration.js", "migrate_pg_to_sqlite.cjs")
Get-ChildItem "$sourceDir\server" | ForEach-Object {
    if ($_.Name -eq "node_modules") {
        Write-Host "    - Copying server node_modules (this may take a few seconds)..." -ForegroundColor Gray
        Copy-Item $_.FullName "$outDir\server\" -Recurse -Force
    } elseif ($_.Name -eq "data") {
        Copy-Item $_.FullName "$outDir\server\" -Recurse -Force
    } elseif ($_.Name -notin @("node_modules", "data") -and $_.Extension -ne ".bak") {
        Copy-Item $_.FullName "$outDir\server\" -Recurse -Force
    }
}

Write-Host "[5/6] Creating Client Readme & Guide..." -ForegroundColor Yellow
$readme = @"
===================================================================
      HEXSYNCTH WEB CONTROLLER & SERVER ORCHESTRATOR v9.1.2
                      By : HexSyncTH
===================================================================

[ วิธีการติดตั้งและเริ่มใช้งานบนเครื่องลูกค้า (Zero Setup) ]

1. ดับเบิ้ลคลิกไฟล์ 'INSTALL.bat' หรือ 'HexSyncTH_Control.exe'
2. ระบบจะสร้างทางลัด (Shortcut) บน Desktop ให้โดยอัตโนมัติ
3. หน้าต่าง Cyberpunk Control Panel v9.1.2 จะเปิดขึ้นมา
4. เข้าสู่ระบบด้วยรหัสผ่านแอดมิน:
   - Username: admin
   - Password: daimond33140
5. กดปุ่ม 'START ALL SERVICES' เพื่อเปิดระบบทั้งหมดในคลิกเดียว:
   - Backend API (Port 4000) [SQLite Engine]
   - Frontend Web (Port 5173)
   - Cloudflare Tunnel (hexsyncth.site)

[ ข้อมูลทางเทคนิค ]
- ฐานข้อมูล: SQLite (ไฟล์เก็บอยู่ที่ server/data/database.sqlite)
- ไม่จำเป็นต้องติดตั้ง Node.js หรือโปรแกรมเสริมใดๆ (มี portable binary พร้อมในโฟลเดอร์ bin)
- มีระบบ Anti-Debugger, Anti-Tamper และ Brute-Force lockout ป้องกันการแฮก
===================================================================
"@
$readme | Out-File "$outDir\README_INSTALL.txt" -Encoding utf8

Write-Host "[6/6] Creating ZIP Archive for Easy Customer Download..." -ForegroundColor Yellow
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$outDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "SUCCESS! Package created successfully:" -ForegroundColor Green
Write-Host "  - Folder: $outDir" -ForegroundColor White
Write-Host "  - ZIP:    $zipPath ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Green
