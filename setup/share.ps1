# Share Constable Hoagie privately (you + people you invite) using Tailscale. Free for personal use.
#   (no args)  set up Tailscale if needed, share the shop, show and copy the private address
#   -Stop      stop sharing
param([switch]$Stop)
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
function Say($m, $c = "White") { Write-Host "  $m" -ForegroundColor $c }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
function Find-TS {
  $c = Get-Command tailscale -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $p = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
  if (Test-Path $p) { return $p }
  return $null
}

Write-Host ""; Say "CONSTABLE HOAGIE - PRIVATE SHARING" "Yellow"; Write-Host ""
$ts = Find-TS

if ($Stop) {
  if ($ts) { & $ts serve reset | Out-Null }
  Say "Sharing stopped. The shop is back to this PC only." "Green"
  Read-Host "  Enter to close"; exit 0
}

# Already sharing? Offer to stop.
if ($ts) {
  $cur = (& $ts serve status 2>$null) -join " "
  if ($cur -match "8787") {
    Say "The shop is already shared privately." "Green"
    $a = Read-Host "  Type S and Enter to STOP sharing, or just Enter to keep sharing and see the address"
    if ($a -match "^[Ss]") { & $ts serve reset | Out-Null; Say "Sharing stopped. The shop is back to this PC only." "Green"; Read-Host "  Enter to close"; exit 0 }
  }
}

# 1. Tailscale installed?
if (-not $ts) {
  Say "Step 1 of 3: installing Tailscale (free private network, one time)..." "Cyan"
  winget install -e --id Tailscale.Tailscale --silent --accept-package-agreements --accept-source-agreements | Out-Null
  Refresh-Path; Start-Sleep 3; $ts = Find-TS
  if (-not $ts) {
    Say "Couldn't install it automatically. Opening the download page; install it, then run Share Privately again." "Yellow"
    Start-Process "https://tailscale.com/download/windows"; Read-Host "  Enter to close"; exit 1
  }
}

# 2. Signed in?
$st = & $ts status --json 2>$null | ConvertFrom-Json
if (-not $st -or $st.BackendState -ne "Running") {
  Say "Step 2 of 3: sign in to Tailscale (a browser opens; Google, Microsoft or GitHub all work)." "Cyan"
  & $ts up
  Start-Sleep 2
  $st = & $ts status --json 2>$null | ConvertFrom-Json
  if (-not $st -or $st.BackendState -ne "Running") { Say "Sign-in didn't finish. Run Share Privately again when ready." "Red"; Read-Host "  Enter to close"; exit 1 }
}

# 3. Make sure Hoagie is running, then share him on the private network
try { Invoke-WebRequest "http://127.0.0.1:8787/api/status" -UseBasicParsing -TimeoutSec 2 | Out-Null }
catch {
  Say "Starting Constable Hoagie first..." "Cyan"
  Start-Process (Join-Path $Root "Start Constable Hoagie.cmd") -WindowStyle Minimized
  for ($i = 0; $i -lt 30; $i++) { Start-Sleep 1; try { Invoke-WebRequest "http://127.0.0.1:8787/api/status" -UseBasicParsing -TimeoutSec 2 | Out-Null; break } catch {} }
}
Say "Step 3 of 3: sharing the shop on your private network..." "Cyan"
Say "(If Tailscale asks to turn on HTTPS for your network, say yes in the page that opens.)" "DarkGray"
& $ts serve --bg 8787

$dns = ($st.Self.DNSName).TrimEnd(".")
$url = "https://$dns"
Set-Clipboard $url
Write-Host ""
Say "Your private shop address (copied):" "Green"
Say "   $url" "Yellow"
Write-Host ""
Say "To let Doctor Crench in:" "White"
Say " 1. Open https://login.tailscale.com/admin/users and click 'Invite users' and enter his email." "White"
Say " 2. He installs Tailscale on his phone or computer, accepts the invite, and opens the address above." "White"
Say "Only people you invite can open it. It works while this PC is on and Hoagie is open." "DarkGray"
Say "To stop sharing: double-click 'Share Privately' again and type S." "DarkGray"
Start-Process "https://login.tailscale.com/admin/users"
Read-Host "  Enter to close"
