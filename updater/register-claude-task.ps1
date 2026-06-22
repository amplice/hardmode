param(
  [string]$TaskName = "Surbiton Local Events Auto Update (Claude)",
  [string]$OldTaskName = "Surbiton Local Events Weekly Update",
  [int]$DaysInterval = 3,
  [string]$At = "08:00"
)

$ErrorActionPreference = "Stop"
$Runner = Join-Path $PSScriptRoot "run-claude-update.ps1"

if (!(Test-Path $Runner)) {
  throw "Could not find runner script: $Runner"
}

# Remove the previous OpenRouter-based weekly task so the two do not both run.
$Existing = Get-ScheduledTask -TaskName $OldTaskName -ErrorAction SilentlyContinue
if ($null -ne $Existing) {
  Unregister-ScheduledTask -TaskName $OldTaskName -Confirm:$false
  Write-Host "Removed old task: $OldTaskName"
}

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`""

# A daily trigger with -DaysInterval N fires every N days (Task Scheduler has no native
# "every 3 days" weekly option).
$Trigger = New-ScheduledTaskTrigger -Daily -DaysInterval $DaysInterval -At $At
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Principal $Principal `
  -Settings $Settings `
  -Description "Runs Claude Code headless to research and update the Surbiton local events calendar, then publishes to GitHub Pages. Logs and backups under updater\logs." `
  -Force

Write-Host "Registered scheduled task: $TaskName"
Write-Host "Runner: $Runner"
Write-Host "Schedule: every $DaysInterval days at $At"
Write-Host "Mode: Claude headless + auto-publish"
