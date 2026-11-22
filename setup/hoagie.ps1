# Constable Hoagie launcher and setup.
#   (no args)  set up anything missing, start Hoagie, open the browser
#   -Stop      stop Hoagie
#   -Repair    redo setup (Python packages, shortcuts)
param([switch]$Stop, [switch]$Repair, [switch]$Quiet)

$ErrorActionPreference = "Continue"
$Root    = Split-Path -Parent $PSScriptRoot
$App     = Join-Path $Root "app"
$Data    = Join-Path $env:LOCALAPPDATA "ConstableHoagie"
$Marker  = Join-Path $Data "setup-done.txt"
$PidFile = Join-Path $Data "server.pid"
$Url     = "http://127.0.0.1:8787"
$Version = "0.0.0"
try { $Version = (Get-Content (Join-Path $App "version.json") -Raw -Encoding UTF8 | ConvertFrom-Json).version } catch {}
New-Item -ItemType Directory -Force -Path $Data | Out-Null
$Log = Join-Path $Data "setup.log"
function Say($msg, $color = "White") { Write-Host "  $msg" -ForegroundColor $color; Add-Content $Log "$(Get-Date -f s) $msg" }

function Test-Up {
  try { Invoke-WebRequest "$Url/api/status" -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true } catch { return $false }
}

if ($Stop) {
  if (Test-Path $PidFile) {
    $id = Get-Content $PidFile
    Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    Remove-Item $PidFile -ErrorAction SilentlyContinue
  }
  $tp = Join-Path $Data "tunnel.pid"
  if (Test-Path $tp) { Stop-Process -Id (Get-Content $tp) -Force -ErrorAction SilentlyContinue; Remove-Item $tp -ErrorAction SilentlyContinue }
  Say "Constable Hoagie is closed. See you tomorrow! " "Yellow"
  Start-Sleep 2; exit 0
}

# Already open? Just bring up the browser.
if (Test-Up) { Start-Process "$Url"; exit 0 }

Write-Host ""
Write-Host "    CONSTABLE HOAGIE  -  Protecting & Serving Your Dough" -ForegroundColor Red
Write-Host ""

# ---------- 1. Python ----------
function Find-Python {
  foreach ($cand in @("py", "python")) {
    $cmd = Get-Command $cand -ErrorAction SilentlyContinue
    if (-not $cmd) { continue }
    if ($cmd.Source -like "*WindowsApps*") { continue }   # the Microsoft Store stub, not real Python
    try {
      $pargs = if ($cand -eq "py") { @("-3", "-c", "import sys;print(sys.executable)") } else { @("-c", "import sys;print(sys.executable)") }
      $exe = & $cand @pargs 2>$null
      if ($LASTEXITCODE -eq 0 -and $exe) {
        $ver = & $exe -c "import sys;print(sys.version_info[0]*100+sys.version_info[1])"
        if ([int]$ver -ge 309) { return $exe.Trim() }
      }
    } catch {}
  }
  return $null
}
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

$Py = Find-Python
if (-not $Py) {
  Say "Step 1 of 3: installing Python (Hoagie's engine). This takes a minute..." "Cyan"
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install -e --id Python.Python.3.12 --scope user --silent --accept-package-agreements --accept-source-agreements | Out-Null
    Refresh-Path
    $Py = Find-Python
    if (-not $Py) {
      $guess = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
      if (Test-Path $guess) { $Py = $guess }
    }
  }
  if (-not $Py) {
    Say "I couldn't install Python by myself. Opening the download page:" "Yellow"
    Say "install it (tick 'Add python.exe to PATH'), then double-click Start Constable Hoagie again." "Yellow"
    Start-Process "https://www.python.org/downloads/windows/"
    Read-Host "  Press Enter to close"; exit 1
  }
  Say "Python ready OK" "Green"
}

# ---------- 2. One-time setup ----------
$needSetup = $Repair -or -not (Test-Path $Marker) -or ((Get-Content $Marker -ErrorAction SilentlyContinue) -ne $Version)
if ($needSetup) {
  Say "Step 2 of 3: setting up (one time only)..." "Cyan"
  try {
    & $Py -m pip install --user --quiet --disable-pip-version-check keyring cryptography 2>&1 | Out-Null
    Say "Safe key storage (Windows Credential Manager) + broker signing OK" "Green"
  } catch { Say "Couldn't install keyring; keys will be kept in a local file instead." "Yellow" }

  # Shortcuts: Desktop + Start menu
  $ws = New-Object -ComObject WScript.Shell
  $targets = @([Environment]::GetFolderPath("Desktop"), (Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"))
  foreach ($t in $targets) {
    $lnk = $ws.CreateShortcut((Join-Path $t "Constable Hoagie.lnk"))
    $lnk.TargetPath = Join-Path $Root "Start Constable Hoagie.cmd"
    $lnk.WorkingDirectory = $Root
    $lnk.IconLocation = (Join-Path $PSScriptRoot "hoagie.ico")
    $lnk.Description = "Constable Hoagie: Protecting & Serving Your Dough"
    $lnk.WindowStyle = 7  # minimized
    $lnk.Save()
  }
  Say "Desktop icon added OK" "Green"

  # Claude Code (optional, recommended)
  if (-not $Quiet -and -not (Get-Command claude -ErrorAction SilentlyContinue) -and -not (Test-Path "$env:USERPROFILE\.local\bin\claude.exe")) {
    $ans = Read-Host "  Install Claude Code for the smartest answers? (Y/n)"
    if ($ans -eq "" -or $ans -match "^[Yy]") {
      try {
        Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression
        Refresh-Path
        Say "Claude Code installed OK  Now log in (a browser opens):" "Green"
        $cl = (Get-Command claude -ErrorAction SilentlyContinue).Source
        if (-not $cl) { $cl = "$env:USERPROFILE\.local\bin\claude.exe" }
        & $cl auth login
      } catch { Say "Claude install didn't finish. You can do it later from the Connect counter." "Yellow" }
    } else { Say "Skipped Claude. A free Tavily key or free on-PC AI work too (Connect counter)." "Yellow" }
  }
  # SnapTrade (optional): one free, read-only bridge to Robinhood, Schwab, Webull, E*TRADE, Vanguard and more
  $snapFile = Join-Path $Data "snaptrade-optin.txt"
  if (-not $Quiet -and -not (Test-Path $snapFile)) {
    Write-Host ""
    Say "Optional: link your brokerage accounts (Robinhood, Schwab, Webull, E*TRADE, Vanguard...) through SnapTrade?" "White"
    Say "  Free for personal use. Hoagie only READS balances and holdings. You can also do this later at the Trading counter." "DarkGray"
    $snap = Read-Host "  Set up SnapTrade? (y/N)"
    $SnapOptIn = ($snap -match "^[Yy]")
    Set-Content $snapFile ($(if ($SnapOptIn) { "yes" } else { "no" }))
  }
  Set-Content $Marker $Version
}

# ---------- 3. Start ----------
Say "Step 3 of 3: opening the shop... " "Cyan"
$pyw = Join-Path (Split-Path $Py) "pythonw.exe"
$runner = if (Test-Path $pyw) { $pyw } else { $Py }
Start-Process -FilePath $runner -ArgumentList @("`"$App\server.py`"") -WorkingDirectory $App -WindowStyle Hidden
for ($i = 0; $i -lt 40; $i++) { if (Test-Up) { break }; Start-Sleep -Milliseconds 300 }
if (-not (Test-Up)) {
  Say "Hoagie didn't start. Running him in this window so you can see why:" "Red"
  & $Py "$App\server.py"
  Read-Host "  Press Enter to close"; exit 1
}
if (Test-Path (Join-Path $Data "online.json")) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "share_online.ps1") -StartOnly
  Say "Online sharing reconnected." "Green"
}
if ($null -ne $SnapOptIn) {
  try {
    $b = @{ snaptrade_optin = [bool]$SnapOptIn } | ConvertTo-Json
    Invoke-RestMethod "$Url/api/settings" -Method Post -Body $b -ContentType "application/json" | Out-Null
  } catch {}
  if ($SnapOptIn) {
    Say "Opening SnapTrade Personal so you can make a free account. In Hoagie: Trading counter > SnapTrade > Connect." "Cyan"
    Start-Process "https://snaptrade.com/personal"
  }
}
Say "Open! (To close Hoagie later: double-click 'Stop Constable Hoagie'.)" "Green"
Start-Sleep 2
