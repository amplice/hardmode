param(
  [switch]$NoPublish
)

# Drives an unattended calendar update by running Codex CLI non-interactively
# against claude-update-prompt.md, then publishes the result unless -NoPublish is set.

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$PromptFile = Join-Path $PSScriptRoot "claude-update-prompt.md"
$LogDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$RunLog = Join-Path $LogDir "$Stamp-codex-run.log"

Set-Location $RepoRoot

if (!(Test-Path $PromptFile)) {
  throw "Could not find prompt file: $PromptFile"
}

$CodexCmd = Get-Command codex -ErrorAction SilentlyContinue
if ($null -eq $CodexCmd) {
  throw "The 'codex' CLI was not found on PATH. Install Codex CLI or fix PATH for the scheduled task."
}
$CodexExe = $CodexCmd.Source

"=== Codex calendar update $Stamp ===" | Out-File -FilePath $RunLog -Encoding utf8
"Repo: $RepoRoot" | Out-File -FilePath $RunLog -Append -Encoding utf8
"Codex: $CodexExe" | Out-File -FilePath $RunLog -Append -Encoding utf8
"--- codex ---" | Out-File -FilePath $RunLog -Append -Encoding utf8

$InstagramCollector = Join-Path $PSScriptRoot "collect-instagram.mjs"
if (Test-Path $InstagramCollector) {
  "--- instagram collect ---" | Out-File -FilePath $RunLog -Append -Encoding utf8
  $BasePreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & node $InstagramCollector --quiet *>> $RunLog
    $InstagramExit = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $BasePreference
  }
  if ($InstagramExit -ne 0) {
    "Instagram collection exited with code $InstagramExit; continuing with Codex update." | Out-File -FilePath $RunLog -Append -Encoding utf8
  }
}

$PromptText = Get-Content -Raw -Path $PromptFile

# Native CLI stderr can include progress/warnings. Do not let PowerShell promote
# those lines to terminating errors; use the process exit code for control flow.
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
