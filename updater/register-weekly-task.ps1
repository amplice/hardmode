param(
  [string]$TaskName = "Surbiton Local Events Weekly Update",
  [string]$DaysOfWeek = "Wednesday",
  [string]$At = "08:00"
)

$ErrorActionPreference = "Stop"
$Runner = Join-Path $PSScriptRoot "run-weekly-update.ps1"

if (!(Test-Path $Runner)) {
  throw "Could not find runner script: $Runner"
}

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`" -Apply"

$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DaysOfWeek -At $At
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Principal $Principal `
  -Settings $Settings `
  -Description "Runs the Surbiton local events AI updater, applies accepted schema output to index.html, and writes backups/logs under updater\logs." `
  -Force

Write-Host "Registered scheduled task: $TaskName"
Write-Host "Runner: $Runner"
Write-Host "Schedule: $DaysOfWeek at $At"
Write-Host "Mode: auto-apply"
