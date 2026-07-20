# Human-in-the-loop scan capture for Pixel debugging.
# Agent runs this; you follow the prompts. Captures [DEBUG-scan] logcat.
#
# Usage (from mobile/app):
#   powershell -File tool/scan_hitl_capture.ps1

$ErrorActionPreference = "Stop"
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$device = "26201JEGR14305"
$outDir = Join-Path $PSScriptRoot "..\..\..\tmp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $outDir "scan-capture-$stamp.txt"

function Step([string]$msg) {
  Write-Host ""
  Write-Host ">>> $msg" -ForegroundColor Cyan
  Read-Host "    [Enter when done]"
}

function Capture([string]$question) {
  Write-Host ""
  Write-Host ">>> $question" -ForegroundColor Cyan
  return (Read-Host "    >")
}

Write-Host "Device: $device"
Write-Host "Output: $outFile"

& $adb -s $device logcat -c
Step "Open the scanner in the app. Clear any previous lock (Scan again if needed)."
Step "Hold ONE card steady in the guide for ~10 seconds (or until it locks). Prefer a card that felt slow/unreliable."

$cardName = Capture "What card did you scan? (name or number)"
$locked = Capture "Did it lock onto the correct card? (y/n/wrong)"
$feltSlow = Capture "Did it feel slower than before? (y/n)"
$seconds = Capture "Rough seconds until lock (or 'never')"

& $adb -s $device logcat -d -s flutter:I flutter:D | Select-String "DEBUG-scan" | ForEach-Object { $_.Line } | Set-Content -Path $outFile
# Also dump unfiltered in case tag differs
if ((Get-Item $outFile).Length -lt 10) {
  & $adb -s $device logcat -d | Select-String "DEBUG-scan" | ForEach-Object { $_.Line } | Set-Content -Path $outFile
}

$meta = @"
CARD=$cardName
LOCKED=$locked
FELT_SLOW=$feltSlow
SECONDS=$seconds
OUT=$outFile
"@
$meta | Add-Content -Path $outFile
Write-Host ""
Write-Host "--- Captured ---"
Write-Host $meta
Write-Host "Log lines: $((Get-Content $outFile | Measure-Object -Line).Lines)"
