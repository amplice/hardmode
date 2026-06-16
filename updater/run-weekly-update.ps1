param(
  [switch]$Apply,
  [switch]$PruneOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$RunLog = Join-Path $LogDir "$Stamp-task-run.log"

Set-Location $RepoRoot

$NodeArgs = @("updater/update-calendar.mjs")
if ($PruneOnly) { $NodeArgs += "--prune-only" }
if ($Apply) { $NodeArgs += "--apply" }

& node @NodeArgs *> $RunLog
$UpdateExitCode = $LASTEXITCODE
if ($UpdateExitCode -ne 0) {
  exit $UpdateExitCode
}

if ($Apply) {
  $OriginUrl = & git remote get-url origin 2>$null
  if ($LASTEXITCODE -eq 0 -and ![string]::IsNullOrWhiteSpace($OriginUrl)) {
    "`n--- publish ---" | Out-File -FilePath $RunLog -Append -Encoding utf8
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "publish-site.ps1") *>> $RunLog
    exit $LASTEXITCODE
  }

  "`n--- publish skipped: no git origin remote configured ---" | Out-File -FilePath $RunLog -Append -Encoding utf8
}

exit 0
