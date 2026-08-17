param(
  [string]$TaskName = "Surbiton Local Events Auto Update (Codex)",
  [int]$Hour = 8,
  [int]$Minute = 0,
  [int]$DaysInterval = 3
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ScriptPath = Join-Path $PSScriptRoot "run-codex-update.ps1"

if (!(Test-Path $ScriptPath)) {
  throw "Could not find Codex update script: $ScriptPath"
}

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
  -WorkingDirectory $RepoRoot

$Trigger = New-ScheduledTaskTrigger `
  -Daily `
  -DaysInterval $DaysInterval `
  -At ([datetime]::Today.AddHours($Hour).AddMinutes($Minute))

$Settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 4)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Description "Refreshes the Surbiton local events calendar with Codex CLI every $DaysInterval days." `
  -Force | Out-Null

Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo |
  Select-Object TaskName, LastRunTime, LastTaskResult, NextRunTime
