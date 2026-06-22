param(
  [switch]$NoPublish
)

# Drives an unattended calendar update by running Claude Code headless against the
# instructions in claude-update-prompt.md, then (unless -NoPublish) publishes the result.
# This replaces the OpenRouter-based run-weekly-update.ps1 in the scheduled task.

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$PromptFile = Join-Path $PSScriptRoot "claude-update-prompt.md"
$LogDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$RunLog = Join-Path $LogDir "$Stamp-claude-run.log"

Set-Location $RepoRoot

if (!(Test-Path $PromptFile)) {
  throw "Could not find prompt file: $PromptFile"
}

$ClaudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if ($null -eq $ClaudeCmd) {
  throw "The 'claude' CLI was not found on PATH. Install Claude Code or fix PATH for the scheduled task."
}
$ClaudeExe = $ClaudeCmd.Source

"=== Claude calendar update $Stamp ===" | Out-File -FilePath $RunLog -Encoding utf8
"Repo: $RepoRoot" | Out-File -FilePath $RunLog -Append -Encoding utf8
"Claude: $ClaudeExe" | Out-File -FilePath $RunLog -Append -Encoding utf8
"--- claude ---" | Out-File -FilePath $RunLog -Append -Encoding utf8

$PromptText = Get-Content -Raw -Path $PromptFile

# Native commands (claude.exe, git) write progress/warnings to stderr. With ErrorActionPreference
# = Stop, redirecting that stderr (2>&1 / *>>) turns each line into a terminating NativeCommandError,
# which would abort the run on a harmless warning. So run native invocations under Continue and
# drive control flow off $LASTEXITCODE instead.
$BasePreference = $ErrorActionPreference

# Headless, non-interactive. --dangerously-skip-permissions is required so the unattended
# run never blocks on a permission prompt; the prompt scopes what Claude may edit.
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

# Publish only if an origin remote exists (publish-site.ps1 also re-runs generate+validate
# and throws rather than pushing broken data). Kept under Continue so the child's git stderr
# (e.g. the LF/CRLF warning) is logged, not promoted to a fatal NativeCommandError.
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
