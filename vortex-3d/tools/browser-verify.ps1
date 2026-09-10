# browser-verify.ps1 - render index.html in headless Edge and screenshot every mode.
#
# Why: the canvas rendering path can only be validated by a real GL implementation.
# The confined DSH sandbox blocks the browser's named-pipe IPC, so this script must be
# run with wider permissions; otherwise just open index.html and look at it.
#
# Usage:  powershell -ExecutionPolicy Bypass -NoProfile -File tools/browser-verify.ps1
# Note: kept ASCII-only on purpose - Windows PowerShell 5.1 reads BOM-less files as ANSI
#       and would mangle any non-ASCII text in here.
param(
  [string]$Edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  [int]$Width = 900,
  [int]$Height = 900
)
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $PSScriptRoot "_shots"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$modes = @('tube', 'kink', 'ring', 'reconnect', 'tangle')

if (-not (Test-Path $Edge)) { Write-Host "Edge not found: $Edge"; exit 1 }

foreach ($m in $modes) {
  $png = Join-Path $outDir "$m.png"
  if (Test-Path $png) { Remove-Item $png -Force }
  $url = "file:///" + ($root -replace '\\', '/') + "/index.html?mode=$m&still=1&t=0.9"
  & $Edge --headless=new --no-sandbox --no-first-run --disable-extensions `
    --enable-unsafe-swiftshader --use-angle=swiftshader --hide-scrollbars `
    --window-size="$Width,$Height" --virtual-time-budget=8000 `
    --screenshot="$png" $url 2>$null | Out-Null
  if (Test-Path $png) {
    $kb = [math]::Round((Get-Item $png).Length / 1KB, 1)
    # A blank page with UI only is roughly 20-35 KB; real geometry is far larger.
    if ($kb -gt 60) { $verdict = "geometry rendered" } else { $verdict = "LOOKS BLANK - check manually" }
    Write-Host ("{0,-10} {1,8} KB  {2}" -f $m, $kb, $verdict)
  } else {
    Write-Host ("{0,-10} screenshot FAILED (browser blocked by sandbox?)" -f $m)
  }
}
Write-Host ""
Write-Host "Screenshots: $outDir"
