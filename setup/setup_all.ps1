# Setup Everything: the one-click setup for Constable Hoagie. Run "Setup Everything.cmd".
# Safe to run again any time: every step checks what's already done and skips it.
#
#   1. Installs and opens Hoagie (Python, packages, desktop icon, optional Claude Code + SnapTrade)
#   2. Makes sure the accounts exist: ConstableHoagie, DoctorCrench (both Zero Cool) and AliJoon
#      (Regular, Sports tab, bright-side news). Uses the private seed if it's here, otherwise asks
#      you for passwords. Makes this PC a Zero Cool admin PC. Makes sign-in links for anyone without one.
#   3. GitHub: installs Git + GitHub CLI, signs you in, creates <you>/constable-hoagie, pushes the code
#      and publishes the first release (so everyone's app can update)
#   4. Autopatcher: Claude GitHub App, Claude token secret, labels, Actions permissions, auto-merge
#      choice, and the app's own autopatch settings
#   5. Your alerts (email and/or Discord) and, if you like, Share Online (beta.constablehoagie.com)
#
# The only things you do by hand: sign in to GitHub and Claude in the browser, click Install on the
# Claude GitHub App page, and paste one token. Everything else is automatic.
param([switch]$NoGitHub)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$App  = Join-Path $Root "app"
$Tool = Join-Path $PSScriptRoot "setup_tool.py"
$Data = Join-Path $env:LOCALAPPDATA "ConstableHoagie"
New-Item -ItemType Directory -Force -Path $Data | Out-Null
$Log = Join-Path $Data "setup-everything.log"
$Done = [ordered]@{}
Set-Location $Root

function Say($m, $c = "White") { Write-Host "  $m" -ForegroundColor $c; Add-Content $Log "$(Get-Date -f s) $m" }
function Head($m) { Write-Host ""; Write-Host "  == $m ==" -ForegroundColor Yellow }
function Mark($k, $v) { $Done[$k] = $v }
function Yes($q, $default = $true) {
  $hint = if ($default) { "(Y/n)" } else { "(y/N)" }
  $a = Read-Host "  $q $hint"
  if (-not $a) { return $default }
  return ($a -match "^[Yy]")
}
function Plain($secure) {
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
function Need($exe, $wingetId, $label) {
  if (Get-Command $exe -ErrorAction SilentlyContinue) { return $true }
  Say "Installing $label (one time)..." "Cyan"
  winget install -e --id $wingetId --silent --accept-package-agreements --accept-source-agreements | Out-Null
  Refresh-Path
  return [bool](Get-Command $exe -ErrorAction SilentlyContinue)
}
function Find-Python {
  foreach ($cand in @("py", "python")) {
    $cmd = Get-Command $cand -ErrorAction SilentlyContinue
    if (-not $cmd -or $cmd.Source -like "*WindowsApps*") { continue }
    $pargs = if ($cand -eq "py") { @("-3", "-c", "import sys;print(sys.executable)") } else { @("-c", "import sys;print(sys.executable)") }
    $exe = & $cand @pargs 2>$null
    if ($LASTEXITCODE -eq 0 -and $exe) { return $exe.Trim() }
  }
  $guess = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
  if (Test-Path $guess) { return $guess }
  return $null
}
function HoagieTool([string[]]$toolArgs, [string]$stdin = "") {
  $raw = if ($stdin) { $stdin | & $script:Py $Tool @toolArgs 2>>$Log } else { & $script:Py $Tool @toolArgs 2>>$Log }
  try { return ($raw | Select-Object -Last 1 | ConvertFrom-Json) } catch { return [pscustomobject]@{ ok = $false; error = "$raw" } }
}

Clear-Host
Write-Host ""
Write-Host "    CONSTABLE HOAGIE  -  SETUP EVERYTHING" -ForegroundColor Red
Write-Host "    One pass through install, accounts, GitHub, the autopatcher and alerts." -ForegroundColor DarkGray
Write-Host "    Safe to run again: finished steps are skipped." -ForegroundColor DarkGray

# ---------------- 1. Install + open ----------------
Head "1 of 5  Install and open Hoagie"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "hoagie.ps1")
Refresh-Path
$Py = Find-Python
if (-not $Py) { Say "Python isn't ready yet. Finish installing it, then run Setup Everything again." "Red"; Read-Host "  Enter to close"; exit 1 }
Mark "Hoagie installed and open" "OK"

# ---------------- 2. Accounts ----------------
Head "2 of 5  Accounts: ConstableHoagie, DoctorCrench, AliJoon"
$acc = HoagieTool @("accounts")
if ($acc.added) { Say ("Created from your private seed: " + ($acc.added -join ", ")) "Green" }
if ($acc.present) { Say ("Ready: " + ($acc.present -join ", ")) "Green" }
$tiers = @{ "ConstableHoagie" = "zerocool"; "DoctorCrench" = "zerocool"; "AliJoon" = "regular" }
foreach ($name in @($acc.missing)) {
  if (-not $name) { continue }
  Say "$name doesn't have an account yet (no private seed on this PC). Pick a password (10+ characters)." "Cyan"
  while ($true) {
    $p1 = Plain (Read-Host "  Password for $name" -AsSecureString)
    $p2 = Plain (Read-Host "  Same again" -AsSecureString)
    if ($p1 -ne $p2) { Say "Those didn't match. Try again." "Yellow"; continue }
    $r = HoagieTool @("adduser", $name, $tiers[$name]) $p1
    $p1 = $null; $p2 = $null
    if ($r.ok) { Say "$name created ($($r.tier))." "Green"; break }
    Say $r.error "Yellow"
  }
}
$z = HoagieTool @("zerocool")
if ($z.ok) { Say "This PC is a Zero Cool admin PC (Admin tab unlocked)." "Green" }
Mark "Accounts" "OK"

# sign-in links: anyone without one gets one; everyone gets fresh ones only if you ask
$acc = HoagieTool @("accounts")
$have = @()
if ($acc.links) { $have = @($acc.links.PSObject.Properties | ForEach-Object { $_.Name }) }
$need = @(@("ConstableHoagie", "DoctorCrench", "AliJoon") | Where-Object { $have -notcontains $_.ToLower() })
if ($need.Count -eq 0) {
  Say "Everyone already has a personal sign-in link (see PRIVATE-sign-in-links.txt)." "Green"
  if (Yes "Make FRESH links for everyone? Old links stop working." $false) { $need = @("all") }
}
if ($need.Count -gt 0) {
  $l = HoagieTool (@("links") + $need)
  if ($l.ok) {
    $f = Join-Path $Data "sign-in-links.txt"
    $txt = @("Constable Hoagie: personal sign-in links (PRIVATE: a link works like a password)",
             "Made by Setup Everything on $(Get-Date -f 'yyyy-MM-dd HH:mm'). Revoke anytime: The Gibson > People & links.", "")
    foreach ($p in $l.links.PSObject.Properties) { $txt += $p.Name; $txt += "  Website: " + $p.Value.site; $txt += "  On the PC: " + $p.Value.pc; $txt += "" }
    Set-Content $f $txt -Encoding UTF8
    Say "New sign-in links saved to $f (opening it now). Send each person only their own." "Green"
    Start-Process notepad.exe $f
    Mark "Sign-in links" "made"
  }
}

if ($NoGitHub -or -not (Yes "Set up GitHub updates and the autopatcher now? (about 5 minutes)")) {
  Mark "GitHub + autopatcher" "skipped (run Setup Everything again any time)"
} else {
  # ---------------- 3. GitHub ----------------
  Head "3 of 5  GitHub: repo, code, first release"
  $ok = (Need git "Git.Git" "Git") -and (Need gh "GitHub.cli" "GitHub CLI")
  if (-not $ok) { Say "Couldn't install Git / GitHub CLI. Install them, then run this again." "Red"; Mark "GitHub" "FAILED: Git/GitHub CLI missing" }
  else {
    gh auth status 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Say "Sign in to GitHub (a browser window opens; approve, then come back):" "Cyan"
      gh auth login --hostname github.com --git-protocol https --web --scopes "workflow"
    } elseif (-not ((gh auth status 2>&1 | Out-String) -match "workflow")) {
      Say "GitHub needs one more permission (to push the autopatch workflows). Approve it in the browser:" "Cyan"
      gh auth refresh --hostname github.com --scopes "workflow"
    }
    $Owner = (gh api user --jq .login 2>$null)
    if (-not $Owner) { Say "GitHub sign-in didn't finish." "Red"; Mark "GitHub" "FAILED: not signed in" }
    else {
      $Owner = $Owner.Trim(); $Repo = "$Owner/constable-hoagie"
      Say "GitHub account: $Owner" "Green"
      & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "publish.ps1") -Auto
      gh repo view $Repo 2>$null | Out-Null
      if ($LASTEXITCODE -ne 0) { Mark "GitHub" "FAILED: repo not created (see messages above)" }
      else {
        Mark "GitHub repo + first release" "https://github.com/$Repo"

        # ---------------- 4. Autopatcher ----------------
        Head "4 of 5  Autopatcher"
        # labels + let Actions open pull requests
        gh label create autopatch --repo $Repo --color "F9D0C4" --description "Hoagie found a bug; Claude will try a fix" --force 2>$null | Out-Null
        gh label create hold --repo $Repo --color "FBCA04" --description "Needs a human look before merging" --force 2>$null | Out-Null
        gh api -X PUT "repos/$Repo/actions/permissions/workflow" -f default_workflow_permissions=write -F can_approve_pull_request_reviews=true 2>$null | Out-Null
        Say "Labels and Actions permissions set." "Green"

        # Claude GitHub App
        $hasApp = $false
        $inst = gh api "repos/$Repo/installation" --jq .app_slug 2>$null
        if ($LASTEXITCODE -eq 0 -and $inst -match "claude") { $hasApp = $true }
        if (-not $hasApp) {
          Say "Next: install the Claude GitHub App. A page opens; choose 'Only select repositories' > constable-hoagie > Install." "Cyan"
          Start-Process "https://github.com/apps/claude/installations/new"
          Read-Host "  Press Enter here once you've clicked Install"
        }
        Mark "Claude GitHub App" "installed"

        # Claude token secret
        $secrets = (gh secret list --repo $Repo 2>$null | Out-String)
        if ($secrets -match "CLAUDE_CODE_OAUTH_TOKEN|ANTHROPIC_API_KEY") {
          Say "Claude token secret is already on the repo." "Green"; Mark "Claude token" "already set"
        } else {
          $claude = (Get-Command claude -ErrorAction SilentlyContinue).Source
          if (-not $claude -and (Test-Path "$env:USERPROFILE\.local\bin\claude.exe")) { $claude = "$env:USERPROFILE\.local\bin\claude.exe" }
          if ($claude) {
            Say "Making a long-lived Claude token for the autopatcher (uses your Claude subscription)." "Cyan"
            Say "Approve in the browser; the token prints below. Copy it (it starts with sk-ant-oat)." "Cyan"
            & $claude setup-token
          } else {
            Say "Claude Code isn't installed, so paste an Anthropic API key instead (console.anthropic.com > API keys)." "Cyan"
          }
          $tok = Plain (Read-Host "  Paste the token or API key (hidden; Enter to skip)" -AsSecureString)
          if ($tok) {
            $name = if ($tok -like "sk-ant-oat*") { "CLAUDE_CODE_OAUTH_TOKEN" } else { "ANTHROPIC_API_KEY" }
            $tok | gh secret set $name --repo $Repo
            $tok = $null
            if ($LASTEXITCODE -eq 0) { Say "Saved as the repo secret $name." "Green"; Mark "Claude token" "saved ($name)" }
            else { Mark "Claude token" "FAILED to save" }
          } else { Mark "Claude token" "skipped: add it later (repo Settings > Secrets > Actions)" }
        }

        # auto-merge choice
        $am = Yes "Let SMALL fixes merge and release themselves? (No = you approve each one in The Gibson)" $false
        gh variable set AUTOMERGE --repo $Repo --body ($(if ($am) { "true" } else { "false" })) 2>$null | Out-Null
        Mark "Auto-merge small fixes" $(if ($am) { "on" } else { "off (you approve in The Gibson > Autopatcher)" })

        # the app's side: report bugs to this repo with your GitHub sign-in
        $gt = (gh auth token 2>$null)
        $r = HoagieTool @("autopatch", $Repo) ("$gt".Trim())
        $gt = $null
        if ($r.ok) { Say "The app now files bug reports to $Repo." "Green"; Mark "App autopatcher" "on ($Repo)" }
        else { Say "Couldn't save the app's autopatch settings: $($r.error)" "Yellow"; Mark "App autopatcher" "FAILED" }
      }
    }
  }
}

# ---------------- 5. Alerts + sharing ----------------
Head "5 of 5  Your alerts and sharing"
Say "Get a heads-up when the autopatcher finds a bug, has a fix ready, or ships one." "White"
$body = @{ events = @("fix", "bug", "released") }
$em = Read-Host "  Email for alerts (Enter to skip)"
if ($em) { $body.email = $em.Trim(); $body.email_on = $true }
$dc = Read-Host "  Discord webhook link (Server settings > Integrations > Webhooks > Copy URL; Enter to skip)"
if ($dc) { $body.discord_url = $dc.Trim() }
if ($em -or $dc) {
  $r = HoagieTool @("notify", "ConstableHoagie") ($body | ConvertTo-Json -Compress)
  if ($r.ok) { Say "Alerts saved. Test them anytime: The Gibson > Autopatcher > Send a test." "Green"; Mark "Your alerts" "saved" }
  else { Say $r.error "Yellow"; Mark "Your alerts" "not saved: $($r.error)" }
  if ($em) { Say "Email alerts use the email account set up in Hoagie (Connect counter > Email digest)." "DarkGray" }
} else { Mark "Your alerts" "skipped (The Gibson > Autopatcher > My alerts)" }

if (Test-Path (Join-Path $Data "online.json")) {
  Mark "Share Online" "already set up"
} elseif (Yes "Put Hoagie online at your website now (Share Online / Cloudflare)?" $false) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "share_online.ps1")
  Mark "Share Online" "ran"
} else { Mark "Share Online" "skipped (double-click Share Online.cmd later)" }

# ---------------- Summary ----------------
Head "Done"
foreach ($k in $Done.Keys) {
  $v = $Done[$k]; $c = if ("$v" -match "FAILED") { "Red" } elseif ("$v" -match "skipped") { "DarkYellow" } else { "Green" }
  Say ("{0,-28} {1}" -f $k, $v) $c
}
Write-Host ""
Say "DoctorCrench sets his own alerts after he signs in: The Gibson > Autopatcher > My alerts." "DarkGray"
Say "A log of this run is in $Log" "DarkGray"
Read-Host "  Enter to close"
