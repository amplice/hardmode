param(
  [switch]$NoPublish
)

# Drives an unattended gig-radar update by running Codex CLI non-interactively against
# the instructions in gig-update-prompt.md, then (unless -NoPublish) publishes the result.
# Registered as the gig radar scheduled task.

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$PromptFile = Join-Path $PSScriptRoot "gig-update-prompt.md"
$LogDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$RunLog = Join-Path $LogDir "$Stamp-gig-run.log"

Set-Location $RepoRoot

if (!(Test-Path $PromptFile)) {
  throw "Could not find prompt file: $PromptFile"
}

$CodexCmd = Get-Command codex -ErrorAction SilentlyContinue
if ($null -eq $CodexCmd) {
  throw "The 'codex' CLI was not found on PATH. Install Codex CLI or fix PATH for the scheduled task."
}
$CodexExe = $CodexCmd.Source

"=== Gig-radar update $Stamp ===" | Out-File -FilePath $RunLog -Encoding utf8
"Repo: $RepoRoot" | Out-File -FilePath $RunLog -Append -Encoding utf8
"Codex: $CodexExe" | Out-File -FilePath $RunLog -Append -Encoding utf8
"--- codex ---" | Out-File -FilePath $RunLog -Append -Encoding utf8

$PromptText = Get-Content -Raw -Path $PromptFile

# Native commands write progress/warnings to stderr; under ErrorActionPreference=Stop a redirect
# would promote those to terminating errors. Run native invocations under Continue and drive
# control flow off $LASTEXITCODE instead.
$BasePreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  $PromptText | & $CodexExe exec `
    --cd $RepoRoot `
    --skip-git-repo-check `
    --dangerously-bypass-approvals-and-sandbox `
    --color never `
    - 2>&1 | Tee-Object -FilePath $RunLog -Append
  $CodexExit = $LASTEXITCODE
} finally {
  $ErrorActionPreference = $BasePreference
}

if ($CodexExit -ne 0) {
  "Codex exited with code $CodexExit; not publishing." | Tee-Object -FilePath $RunLog -Append
  exit $CodexExit
}

if ($NoPublish) {
  "NoPublish set; skipping publish step." | Tee-Object -FilePath $RunLog -Append
  exit 0
}

# publish-site.ps1 re-runs generate + validate for BOTH the calendar and the gig radar and
# only pushes if everything passes, so it is safe to call from either updater.
$ErrorActionPreference = "Continue"
try {
  $OriginUrl = & git remote get-url origin 2>$null
  $OriginExitCode = $LASTEXITCODE

  if ($OriginExitCode -eq 0 -and ![string]::IsNullOrWhiteSpace(($OriginUrl -join "").Trim())) {
    "`n--- publish ---" | Out-File -FilePath $RunLog -Append -Encoding utf8
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "publish-site.ps1") *>> $RunLog
    $PublishExit = $LASTEXITCODE
  } else {
    "`n--- publish skipped: no git origin remote configured ---" | Out-File -FilePath $RunLog -Append -Encoding utf8
    $PublishExit = 0
  }
} finally {
  $ErrorActionPreference = $BasePreference
}

exit $PublishExit
