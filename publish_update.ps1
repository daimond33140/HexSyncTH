# publish_update.ps1
# One-click script to build and publish a new safe update for all customers
param(
    [string]$Version = "9.1.3",
    [string]$Changelog = "System updates and security enhancements"
)

$ErrorActionPreference = "Stop"
$root = "D:\wee"
$staging = "$root\server\data\updates\staging"
$zipOut = "$root\server\data\updates\latest_update.zip"
$manifestPath = "$root\server\data\updates\update_manifest.json"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   HexSyncTH System Update Publisher (Zero Data-Touch)       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Target Version: $Version" -ForegroundColor Yellow
Write-Host "Changelog:      $Changelog" -ForegroundColor Yellow

# 1. Build Latest Frontend
Write-Host "`n[1/4] Building latest frontend bundle..." -ForegroundColor Yellow
Set-Location $root
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed! Aborting update publication."
    exit 1
}

# 2. Stage Safe Web Files (Strict Exclusion of Customer Private Data)
Write-Host "`n[2/4] Staging update payload (Excluding database, .env, and site_config)..." -ForegroundColor Yellow
if (Test-Path $staging) {
    Remove-Item $staging -Recurse -Force
}
New-Item -ItemType Directory -Path "$staging\dist" -Force | Out-Null
New-Item -ItemType Directory -Path "$staging\server" -Force | Out-Null

# Copy Frontend dist
Copy-Item "$root\dist\*" "$staging\dist\" -Recurse -Force

# Copy Scripts
Copy-Item "$root\serve_dist.cjs" "$staging\serve_dist.cjs" -Force
Copy-Item "$root\START_ALL.bat" "$staging\START_ALL.bat" -Force

# Copy Server Code (EXCLUDING server/data, server/.env, server/node_modules)
$serverExcludes = @("data", "node_modules", ".cache", "*.bak", ".env", "clean_template_database.sqlite")
Get-ChildItem "$root\server" | ForEach-Object {
    if ($_.Name -notin $serverExcludes -and $_.Name -ne ".env") {
        Copy-Item $_.FullName "$staging\server\" -Recurse -Force
    }
}

# Write version.json into staging payload
$payloadVer = [ordered]@{
    version = $Version
    updatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    changelog = $Changelog
}
[System.IO.File]::WriteAllText("$staging\version.json", ($payloadVer | ConvertTo-Json -Depth 3), [System.Text.UTF8Encoding]::new($false))

# 3. Create Update Archive
Write-Host "`n[3/4] Compressing update archive..." -ForegroundColor Yellow
if (Test-Path $zipOut) {
    Remove-Item $zipOut -Force
}
# Use Windows built-in tar for fast and clean zip creation
tar.exe -a -c -f "$zipOut" -C "$staging" .

# Cleanup staging
Remove-Item $staging -Recurse -Force

# 4. Write Update Manifest
Write-Host "`n[4/4] Updating update_manifest.json..." -ForegroundColor Yellow
$manifest = [ordered]@{
    version = $Version
    minRequiredVersion = "9.0.0"
    releaseDate = (Get-Date).ToString("yyyy-MM-dd HH:mm")
    changelog = $Changelog
    downloadPath = "latest_update.zip"
}
$json = $manifest | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($manifestPath, $json, [System.Text.UTF8Encoding]::new($false))

$zipSize = (Get-Item $zipOut).Length / 1MB
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  UPDATE PUBLISHED SUCCESSFULLY!                            " -ForegroundColor Green
Write-Host "  Version:     $Version                                     " -ForegroundColor Green
Write-Host "  Package:     $zipOut ($([math]::Round($zipSize, 2)) MB)   " -ForegroundColor Green
Write-Host "  Manifest:    $manifestPath                                " -ForegroundColor Green
Write-Host "  All customers running .exe can now auto-update!           " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
