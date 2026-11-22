# Put Constable Hoagie online at your own domain, behind a login wall (Cloudflare Tunnel + Access, free).
#   (no args)   set up (first time) or turn sharing on, then check the login wall is working
#   -Stop       take the shop offline
#   -StartOnly  start the tunnel quietly (the launcher uses this)
param([switch]$Stop, [switch]$StartOnly)
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$Data = Join-Path $env:LOCALAPPDATA "ConstableHoagie"
$Conf = Join-Path $Data "online.json"
$PidFile = Join-Path $Data "tunnel.pid"
$CfDir = Join-Path $env:USERPROFILE ".cloudflared"
$TunnelName = "constable-hoagie"
New-Item -ItemType Directory -Force -Path $Data | Out-Null
function Say($m, $c = "White") { Write-Host "  $m" -ForegroundColor $c }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
function Find-CF {
  $c = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in @("${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe", "$env:ProgramFiles\cloudflared\cloudflared.exe")) { if (Test-Path $p) { return $p } }
  return $null
}
function Stop-Tunnel {
  if (Test-Path $PidFile) { Stop-Process -Id (Get-Content $PidFile) -Force -ErrorAction SilentlyContinue; Remove-Item $PidFile -ErrorAction SilentlyContinue }
}
function Start-Tunnel($cf, $cfg) {
  Stop-Tunnel
  $p = Start-Process -FilePath $cf -ArgumentList @("tunnel", "--config", "`"$cfg`"", "run", $TunnelName) -WindowStyle Hidden -PassThru
  Set-Content $PidFile $p.Id
}
# The login wall check, done from the outside like a stranger would.
#  App wall (default): the address must show the Under Construction sign-in, and the shop's data must answer 401.
#  Cloudflare wall (optional extra): the address must bounce to Cloudflare's emailed-code page.
function Get-Answer($u) {
  try {
    $r = Invoke-WebRequest $u -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15 -ErrorAction Stop
    return @{ code = [int]$r.StatusCode; loc = "$($r.Headers['Location'])"; body = "$($r.Content)" }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) { return @{ code = [int]$resp.StatusCode; loc = "$($resp.Headers['Location'])"; body = "" } }
    return @{ code = 0; loc = ""; body = ""; err = $_.Exception.Message }
  }
}
function Test-Wall($url, $useAccess) {
  $a = Get-Answer $url
  if ($a.code -eq 0) { return @{ ok = $false; wait = $true; why = "Couldn't reach the address yet: $($a.err)" } }
  if ($a.code -eq 530 -or $a.code -eq 502 -or $a.code -eq 1033) { return @{ ok = $false; wait = $true; why = "The tunnel isn't connected yet (status $($a.code))." } }
  if ($useAccess) {
    if (($a.code -eq 302 -or $a.code -eq 303) -and $a.loc -match "cloudflareaccess\.com|/cdn-cgi/access") { return @{ ok = $true } }
    return @{ ok = $false; why = "The site opened WITHOUT Cloudflare's emailed-code page (status $($a.code))." }
  }
  if ($a.code -ne 200 -or $a.body -notmatch "data-hoagie-login") { return @{ ok = $false; why = "The address didn't show the Under Construction sign-in (status $($a.code))." } }
  $d = Get-Answer "$url/api/status"
  if ($d.code -ne 401) { return @{ ok = $false; why = "The shop's data answered a stranger (status $($d.code)) instead of asking for a login." } }
  return @{ ok = $true }
}

$cf = Find-CF

if ($StartOnly) {
  if ($cf -and (Test-Path $Conf)) { $o = Get-Content $Conf -Raw | ConvertFrom-Json; Start-Tunnel $cf $o.config }
  exit 0
}
if ($Stop) { Stop-Tunnel; Say "The shop is offline again (only this PC can open it)." "Green"; Remove-Item $Conf -ErrorAction SilentlyContinue; Read-Host "  Enter to close"; exit 0 }

Write-Host ""; Say "CONSTABLE HOAGIE - SHARE ONLINE (private beta)" "Yellow"; Write-Host ""

# Already online? Offer to stop.
if ((Test-Path $Conf) -and (Test-Path $PidFile) -and (Get-Process -Id (Get-Content $PidFile) -ErrorAction SilentlyContinue)) {
  $o = Get-Content $Conf -Raw | ConvertFrom-Json
  Say "The shop is online at $($o.url)" "Green"
  $a = Read-Host "  Type S and Enter to take it OFFLINE, or just Enter to keep it online"
  if ($a -match "^[Ss]") { Stop-Tunnel; Remove-Item $Conf -ErrorAction SilentlyContinue; Say "Offline. Only this PC can open the shop now." "Green"; Read-Host "  Enter to close"; exit 0 }
  Say "Still online. Nothing changed." "Green"; Read-Host "  Enter to close"; exit 0
}

# Questions (with sensible defaults)
$domain = Read-Host "  Your domain [Enter = constablehoagie.com]"; if (-not $domain) { $domain = "constablehoagie.com" }
$sub = Read-Host "  Address for the beta [Enter = beta]"; if (-not $sub) { $sub = "beta" }
$host_ = "$sub.$domain"; $url = "https://$host_"
Write-Host ""
Say "Visitors get the Under Construction sign-in, and only people you made accounts for can get past it." "White"
$ua = Read-Host "  ALSO put Cloudflare's emailed-code wall in front of it? Most people don't need this. (y/N)"
$useAccess = ($ua -match "^[Yy]")
$owner = ""; $guests = ""
if ($useAccess) {
  $owner = Read-Host "  YOUR email (the one you'll get codes at)"
  $guests = Read-Host "  Doctor Crench's email (more people: separate with commas)"
}

# Accounts first: with no accounts nobody could get in, so don't go online yet.
try {
  $u = Invoke-RestMethod "http://127.0.0.1:8787/api/auth/users" -Method Post -Body "{}" -ContentType "application/json"
} catch { Say "Hoagie isn't open right now. Start Constable Hoagie, then run Share Online again." "Red"; Read-Host "  Enter to close"; exit 1 }
$owners = @($u.users | Where-Object { $_.role -eq "owner" })
if ($owners.Count -eq 0) {
  Say "No Owner account yet, so nobody could sign in online." "Yellow"
  Say "Open Hoagie > Connect counter > User accounts. Make an Owner account for you and a Guest account for Doctor Crench." "Yellow"
  Say "Passwords need 10+ characters. Then run Share Online again. Nothing went online." "Yellow"
  Start-Process "http://127.0.0.1:8787/"
  Read-Host "  Enter to close"; exit 0
}

# 1. cloudflared
if (-not $cf) {
  Say "Step 1 of 5: installing Cloudflare's connector (cloudflared)..." "Cyan"
  winget install -e --id Cloudflare.cloudflared --silent --accept-package-agreements --accept-source-agreements | Out-Null
  Refresh-Path; $cf = Find-CF
  if (-not $cf) { Say "Couldn't install cloudflared. Opening the download page; install it, then run Share Online again." "Red"; Start-Process "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"; Read-Host "  Enter to close"; exit 1 }
}

# 2. Log cloudflared in to your Cloudflare account (picks the domain)
if (-not (Test-Path (Join-Path $CfDir "cert.pem"))) {
  Say "Step 2 of 5: a browser opens. Log in to Cloudflare and click '$domain' to authorize it." "Cyan"
  & $cf tunnel login
  if (-not (Test-Path (Join-Path $CfDir "cert.pem"))) { Say "Login didn't finish. Run Share Online again." "Red"; Read-Host "  Enter to close"; exit 1 }
}

# 3. The tunnel itself + its address
Say "Step 3 of 5: creating the tunnel and the address $host_ ..." "Cyan"
$list = & $cf tunnel list --output json 2>$null | ConvertFrom-Json
$t = $list | Where-Object { $_.name -eq $TunnelName } | Select-Object -First 1
if (-not $t) { & $cf tunnel create $TunnelName | Out-Null; $list = & $cf tunnel list --output json 2>$null | ConvertFrom-Json; $t = $list | Where-Object { $_.name -eq $TunnelName } | Select-Object -First 1 }
if (-not $t) { Say "Couldn't create the tunnel. Make a bug report from the Health Inspector." "Red"; Read-Host "  Enter to close"; exit 1 }
$id = $t.id
& $cf tunnel route dns --overwrite-dns $TunnelName $host_ 2>&1 | Out-Null
$cfg = Join-Path $Data "tunnel-config.yml"
@"
# Written by Constable Hoagie's Share Online. Sends $host_ to the shop on this PC.
tunnel: $id
credentials-file: $(Join-Path $CfDir "$id.json")
ingress:
  - hostname: $host_
    service: http://localhost:8787
  - service: http_status:404
"@ | Set-Content $cfg -Encoding ASCII


# Tell the shop its online address (so sign-ins from there are accepted)
try {
  $set = @{ allowed_origins = @($url); online_host = $host_ }
  if ($useAccess -and $owner) { $set.owner_emails = @($owner.Trim().ToLower()) }
  Invoke-RestMethod "http://127.0.0.1:8787/api/settings" -Method Post -Body ($set | ConvertTo-Json) -ContentType "application/json" | Out-Null
} catch { Say "(Couldn't save the online address in Hoagie's settings; sign-ins may be refused. Run Share Online again.)" "Yellow" }

# 4. Optional: Cloudflare's emailed-code wall - BEFORE anything goes live
if ($useAccess) {
Say "Step 4 of 5: Cloudflare's emailed-code wall. Nothing is online until this is done." "Cyan"
Write-Host ""
Say "A Cloudflare page opens. Do this once:" "White"
Say " 1. If asked, pick a team name (anything, e.g. constablehoagie) and the FREE plan." "White"
Say " 2. Go to Access > Applications > Add an application > Self-hosted." "White"
Say " 3. Application name: Constable Hoagie beta.  Domain: $sub  .  $domain" "Yellow"
Say " 4. Add a policy: Action = Allow, Include = Emails, and enter:" "White"
Say "      $owner, $guests" "Yellow"
Say " 5. Login method: One-time PIN (the default). Save." "White"
Start-Process "https://one.dash.cloudflare.com/"
Write-Host ""
$ok = Read-Host "  Type DONE and Enter once you've saved it"
if ($ok -notmatch "^done$") { Say "No problem: nothing went online. Run Share Online again when ready." "Yellow"; Read-Host "  Enter to close"; exit 0 }
} else {
  Say "Step 4 of 5: skipped (the Under Construction sign-in is the wall)." "DarkGray"
}

# 5. Go live, then prove the wall works
Say "Step 5 of 5: going online and checking the login wall like a stranger would..." "Cyan"
Start-Tunnel $cf $cfg
$res = $null
for ($i = 0; $i -lt 12; $i++) { Start-Sleep 5; $res = Test-Wall $url $useAccess; if ($res.ok -or -not $res.wait) { break } }
if (-not $res.ok) {
  Stop-Tunnel
  Say "Safety stop: $($res.why)" "Red"
  Say "I took the shop offline again so nobody can get in without logging in." "Red"
  if ($useAccess) { Say "Check the Access application's domain is exactly $host_ and the policy is saved, then run Share Online again." "Yellow" }
  else { Say "Make sure Hoagie is open and up to date, then run Share Online again. Still stuck? Health Inspector > bug report." "Yellow" }
  Read-Host "  Enter to close"; exit 1
}
@{ url = $url; host = $host_; config = $cfg; tunnel = $TunnelName; access = $useAccess } | ConvertTo-Json | Set-Content $Conf -Encoding UTF8
Set-Clipboard $url
Write-Host ""
Say "You're online!  $url  (copied)" "Green"
if ($useAccess) { Say "Login wall: working. Two locks: Cloudflare's emailed code, then the Under Construction sign-in." "Green" }
else { Say "Login wall: working. Strangers only see the Under Construction sign-in." "Green" }
Say "It stays online while this PC is on and Hoagie is open; Start Constable Hoagie reconnects it automatically." "DarkGray"
Say "Send Doctor Crench the address and his username + password. To take it offline: run Share Online again and type S." "DarkGray"
Read-Host "  Enter to close"
