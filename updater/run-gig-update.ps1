param(
  [switch]$NoPublish
)

# Drives an unattended gig-radar update by running Claude Code headless against the
# instructions in gig-update-prompt.md, then (unless -NoPublish) publishes the result.
# Mirrors run-claude-update.ps1 but for the gig radar. Registered as its own scheduled task.

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

$ClaudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if ($null -eq $ClaudeCmd) {
  throw "The 'claude' CLI was not found on PATH. Install Claude Code or fix PATH for the scheduled task."
}
$ClaudeExe = $ClaudeCmd.Source

"=== Gig-radar update $Stamp ===" | Out-File -FilePath $RunLog -Encoding utf8
"Repo: $RepoRoot" | Out-File -FilePath $RunLog -Append -Encoding utf8
"Claude: $ClaudeExe" | Out-File -FilePath $RunLog -Append -Encoding utf8
"--- claude ---" | Out-File -FilePath $RunLog -Append -Encoding utf8

$PromptText = Get-Content -Raw -Path $PromptFile

# Native commands write progress/warnings to stderr; under ErrorActionPreference=Stop a redirect
# would promote those to terminating errors. Run native invocations under Continue and drive
# control flow off $LASTEXITCODE instead.
$BasePreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  $PromptText | & $ClaudeExe -p `
    --dangerously-skip-permissions `
    --add-dir $RepoRoot `
    --output-format text 2>&1 | Tee-Object -FilePath $RunLog -Append
  $ClaudeExit = $LASTEXITCODE
} finally {
  $ErrorActionPreference = $BasePreference
}

if ($ClaudeExit -ne 0) {
  "Claude exited with code $ClaudeExit; not publishing." | Tee-Object -FilePath $RunLog -Append
  exit $ClaudeExit
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
