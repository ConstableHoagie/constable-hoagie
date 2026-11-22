# Swaps in a new (or previous) version of Constable Hoagie, then restarts him.
# Started by the app itself; you don't need to run this by hand.
param(
  [int]$ServerPid = 0,
  [Parameter(Mandatory = $true)][string]$Install,
  [string]$Staged = "",
  [string]$OldVersion = "",
  [string]$Rollback = ""
)
$ErrorActionPreference = "Stop"
$Data = Join-Path $env:LOCALAPPDATA "ConstableHoagie"
$Backups = Join-Path $Data "backups"
$Log = Join-Path $Data "logs\update.log"
New-Item -ItemType Directory -Force -Path $Backups, (Split-Path $Log) | Out-Null
function L($m) { Add-Content $Log "$(Get-Date -f s) $m" }

# the parts of the folder that belong to the app (everything else is left alone)
$Parts = @("app", "setup", "README.md", "README.html", "GUIDE.md", "CLAUDE.md", "docs", "Start Constable Hoagie.cmd", "Stop Constable Hoagie.cmd", "Publish Update.cmd", "Setup Everything.cmd", "Share Privately.cmd", "Share Online.cmd", ".gitignore")

function Copy-Parts($from, $to) {
  foreach ($p in $Parts) {
    $src = Join-Path $from $p
    if (-not (Test-Path $src)) { continue }
    $dst = Join-Path $to $p
    if ((Get-Item $src).PSIsContainer) {
      # /MIR keeps the folder an exact copy; app data never lives in these folders
      robocopy $src $dst /MIR /R:3 /W:1 /NFL /NDL /NJH /NJS /NP /XD __pycache__ .git | Out-Null
      if ($LASTEXITCODE -ge 8) { throw "copy failed for $p (robocopy $LASTEXITCODE)" }
    } else {
      Copy-Item $src $dst -Force
    }
  }
}

try {
  L "update started (pid $ServerPid, staged '$Staged', rollback '$Rollback')"
  if ($ServerPid -gt 0) {
    try { Wait-Process -Id $ServerPid -Timeout 20 -ErrorAction SilentlyContinue } catch {}
    Stop-Process -Id $ServerPid -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 800

  if ($Rollback) {
    L "rolling back from $Rollback"
    Copy-Parts $Rollback $Install
    Remove-Item $Rollback -Recurse -Force -ErrorAction SilentlyContinue
  } else {
    if (-not $OldVersion) { $OldVersion = "previous" }
    $bk = Join-Path $Backups ("v{0}-{1}" -f $OldVersion, (Get-Date -f "yyyyMMdd-HHmmss"))
    New-Item -ItemType Directory -Force -Path $bk | Out-Null
    Copy-Parts $Install $bk
    L "backed up to $bk"
    try {
      Copy-Parts $Staged $Install
      L "new version copied in"
    } catch {
      L "copy failed, restoring backup: $_"
      Copy-Parts $bk $Install
      throw
    }
    # keep only the two newest backups
    Get-ChildItem $Backups -Directory | Sort-Object Name -Descending | Select-Object -Skip 2 | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $Data "updates") -Recurse -Force -ErrorAction SilentlyContinue
  }
} catch {
  L "UPDATE FAILED: $_"
}

# restart Hoagie (the launcher also re-runs one-time setup if the version changed)
Start-Process -FilePath (Join-Path $Install "Start Constable Hoagie.cmd") -ArgumentList "-Quiet" -WorkingDirectory $Install -WindowStyle Minimized
L "restarted"
