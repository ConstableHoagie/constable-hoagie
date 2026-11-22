# Publish a new version of Constable Hoagie to GitHub, so everyone's app offers the update.
# Owner only. Run it by double-clicking "Publish Update.cmd" in the main folder.
#
# First run: installs Git + GitHub CLI if needed, signs you in to GitHub, creates the public
# repo <you>/constable-hoagie and points the app at it. After that, each run:
#   1. asks for the new version number and a few lines of "what's new"
#   2. saves that version in app/version.json
#   3. pushes the code to GitHub
#   4. builds ConstableHoagie-<version>.zip plus a .sha256 checksum
#   5. creates the GitHub release, which is what the apps check for
#
# -Auto (used by "Setup Everything.cmd"): no questions; publishes the current version once and
# returns instead of waiting for Enter. Skips the release if that version is already out.
param([switch]$Auto)
$ErrorActionPreference = "Continue"  # native tools report through exit codes; checked below
$Root = Split-Path -Parent $PSScriptRoot
$RepoName = "constable-hoagie"
$VerFile = Join-Path $Root "app\version.json"
Set-Location $Root

function Bye($code) { if (-not $Auto) { Read-Host "  Enter to close" }; exit $code }
function Say($m, $c = "White") { Write-Host "  $m" -ForegroundColor $c }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
function Need($exe, $wingetId, $label) {
  if (Get-Command $exe -ErrorAction SilentlyContinue) { return }
  Say "Installing $label (one time)..." "Cyan"
  winget install -e --id $wingetId --silent --accept-package-agreements --accept-source-agreements | Out-Null
  Refresh-Path
  if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) { Say "Couldn't install $label. Install it, then run this again." "Red"; Bye 1 }
}

Write-Host ""; Say "PUBLISH A CONSTABLE HOAGIE UPDATE" "Yellow"; Write-Host ""
Need git "Git.Git" "Git"
Need gh "GitHub.cli" "GitHub CLI"

# GitHub sign-in
gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Say "Sign in to GitHub (a browser window opens):" "Cyan"
  gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { Say "GitHub sign-in didn't finish." "Red"; Bye 1 }
}
$Owner = (gh api user --jq .login).Trim()
$Repo = "$Owner/$RepoName"
Say "GitHub account: $Owner" "Green"

# version + notes
$v = Get-Content $VerFile -Raw -Encoding UTF8 | ConvertFrom-Json
$cur = $v.version
$parts = $cur.Split(".") | ForEach-Object { [int]$_ }
$suggest = "{0}.{1}.{2}" -f $parts[0], $parts[1], ($parts[2] + 1)
if ($Auto) { $new = $cur } else { $new = Read-Host "  New version number (current $cur) [Enter = $suggest]" }
if (-not $new) { $new = $suggest }
$new = $new.TrimStart("v")
if ($new -notmatch '^\d+\.\d+\.\d+$') { Say "Use the form 1.2.3" "Red"; Bye 1 }
$lines = @()
if ($Auto) { $lines = @("- First release from Setup Everything") } else { Say "What's new? One line each; press Enter on an empty line when done:" "Cyan" }
while (-not $Auto) { $l = Read-Host "   -"; if (-not $l) { break }; $lines += "- $l" }
if (-not $lines) { $lines = @("- Small fixes and improvements") }
$notes = "## What's new in v$new`n`n" + ($lines -join "`n") + "`n`n_Update from inside the app: click the gift badge at the top._"

# save version + repo into the app
$v.version = $new; $v.repo = $Repo
[IO.File]::WriteAllText($VerFile, ($v | ConvertTo-Json), (New-Object Text.UTF8Encoding $false))  # no BOM

# make sure nothing private can be committed
$gi = Join-Path $Root ".gitignore"
if (-not (Test-Path $gi)) {
  @("__pycache__/", "*.pyc", "dist/", "*.zip", "*.env", "secrets*", "*.key", "*.pem", ".secrets/", "Thumbs.db") | Set-Content $gi -Encoding UTF8
}

# git: first time creates the repo, later just commits + pushes
if (-not (Test-Path (Join-Path $Root ".git"))) {
  git init -b main | Out-Null
}
if (-not (git config user.name)) { git config user.name $Owner }
if (-not (git config user.email)) {
  $id = (gh api user --jq .id).Trim()
  git config user.email "$id+$Owner@users.noreply.github.com"
}
git add -A
git commit -m "Constable Hoagie v$new [skip release]" | Out-Null
gh repo view $Repo 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Say "Creating the public repo $Repo ..." "Cyan"
  gh repo create $Repo --public --description "Constable Hoagie: Protecting & Serving Your Dough" --source . --remote origin --push
} else {
  if (-not (git remote | Select-String -Quiet "^origin$")) { git remote add origin "https://github.com/$Repo.git" }
  git push -u origin main
}
if ($LASTEXITCODE -ne 0) { Say "Pushing to GitHub failed." "Red"; Bye 1 }

if ($Auto) {
  gh release view "v$new" --repo $Repo 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { Say "v$new is already released; nothing more to publish." "Green"; exit 0 }
}

# build the zip (with a ConstableHoagie/ folder inside, like the original download)
$dist = Join-Path $Root "dist"; New-Item -ItemType Directory -Force -Path $dist | Out-Null
$stage = Join-Path $env:TEMP "hoagie-publish"; Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
$inner = Join-Path $stage "ConstableHoagie"; New-Item -ItemType Directory -Force -Path $inner | Out-Null
foreach ($p in @("app", "setup", "README.md", "README.html", "GUIDE.md", "CLAUDE.md", "docs", "Start Constable Hoagie.cmd", "Stop Constable Hoagie.cmd", "Publish Update.cmd", "Setup Everything.cmd", "Share Privately.cmd", "Share Online.cmd", ".gitignore")) {
  $src = Join-Path $Root $p; if (Test-Path $src) { Copy-Item $src (Join-Path $inner $p) -Recurse -Force }
}
Get-ChildItem $inner -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force
# owner-only seed (accounts, sign-in links, admin flag) never ships in a public release
Remove-Item (Join-Path $inner "app\seed") -Recurse -Force -ErrorAction SilentlyContinue
$zip = Join-Path $dist "ConstableHoagie-$new.zip"
Remove-Item $zip -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip)  # forward-slash paths, works everywhere
$hash = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
$shaFile = "$zip.sha256"
"$hash  ConstableHoagie-$new.zip" | Set-Content $shaFile -Encoding ASCII -NoNewline

# the release
$notesFile = Join-Path $env:TEMP "hoagie-notes.md"; $notes | Set-Content $notesFile -Encoding UTF8
gh release create "v$new" $zip $shaFile --repo $Repo --title "Constable Hoagie v$new" --notes-file $notesFile
if ($LASTEXITCODE -ne 0) { Say "Creating the release failed." "Red"; Bye 1 }

Write-Host ""
Say "Published v$new!  https://github.com/$Repo/releases/tag/v$new" "Green"
Say "Everyone's Hoagie will show the gift badge within a few hours (or right away with Check now)." "Green"
if ($Auto) { exit 0 }
Read-Host "  Enter to close"
