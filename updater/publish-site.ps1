param(
  [string]$Remote = "origin",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Invoke-CommandAllowFailure {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  $PreviousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $Output = & $FilePath @Arguments 2>$null
    return [pscustomobject]@{
      Output = $Output
      ExitCode = $LASTEXITCODE
    }
  } finally {
    $ErrorActionPreference = $PreviousPreference
  }
}

if (!(Test-Path "index.html")) {
  throw "Could not find index.html in $RepoRoot"
}

& npm run validate
if ($LASTEXITCODE -ne 0) {
  throw "Validation failed; not publishing."
}

$InsideWorkTree = Invoke-CommandAllowFailure -FilePath "git" -Arguments @("rev-parse", "--is-inside-work-tree")
if ($InsideWorkTree.ExitCode -ne 0 -or ($InsideWorkTree.Output -join "").Trim() -ne "true") {
  throw "This folder is not a git repository. Run git init -b main before publishing."
}

$RemoteUrl = Invoke-CommandAllowFailure -FilePath "git" -Arguments @("remote", "get-url", $Remote)
if ($RemoteUrl.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace(($RemoteUrl.Output -join "").Trim())) {
  throw "No git remote named '$Remote' is configured. Add one with: git remote add $Remote https://github.com/amplice/local-events.git"
}

& git add -- index.html .nojekyll
if ($LASTEXITCODE -ne 0) {
  throw "Could not stage site files."
}

$DiffResult = Invoke-CommandAllowFailure -FilePath "git" -Arguments @("diff", "--cached", "--quiet")
$DiffExitCode = $DiffResult.ExitCode
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
