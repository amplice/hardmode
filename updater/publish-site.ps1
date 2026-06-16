param(
  [string]$Remote = "origin",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

if (!(Test-Path "index.html")) {
  throw "Could not find index.html in $RepoRoot"
}

& npm run validate
if ($LASTEXITCODE -ne 0) {
  throw "Validation failed; not publishing."
}

$InsideWorkTree = & git rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0 -or $InsideWorkTree.Trim() -ne "true") {
  throw "This folder is not a git repository. Run git init -b main before publishing."
}

$RemoteUrl = & git remote get-url $Remote 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($RemoteUrl)) {
  throw "No git remote named '$Remote' is configured. Add one with: git remote add $Remote https://github.com/amplice/local-events.git"
}

& git add -- index.html .nojekyll
if ($LASTEXITCODE -ne 0) {
  throw "Could not stage site files."
}

& git diff --cached --quiet
$DiffExitCode = $LASTEXITCODE
if ($DiffExitCode -eq 0) {
  Write-Host "No site changes to publish."
  exit 0
}
if ($DiffExitCode -ne 1) {
  throw "Could not inspect staged changes."
}

$Stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
& git commit -m "Update local events site ($Stamp)"
if ($LASTEXITCODE -ne 0) {
  throw "Could not commit site changes."
}

$CurrentBranch = (& git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($CurrentBranch)) {
  throw "Could not determine the current git branch."
}

& git push -u $Remote "$CurrentBranch`:$Branch"
if ($LASTEXITCODE -ne 0) {
  throw "Could not push $CurrentBranch to $Remote/$Branch."
}

Write-Host "Published to $Remote/$Branch."
