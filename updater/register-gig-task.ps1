param(
  [string]$TaskName = "Gig Radar Auto Update (Claude)",
  [int]$DaysInterval = 3,
  [string]$At = "07:30"
)

# Registers a Windows scheduled task that runs the gig-radar update roughly twice a week.
# A daily trigger with -DaysInterval 3 fires every 3 days (Task Scheduler has no native
# "twice a week" option; every-3-days averages ~2.3 runs/week). Time is offset from the
# main calendar task (08:00) so the two headless Claude runs do not overlap.

$ErrorActionPreference = "Stop"
$Runner = Join-Path $PSScriptRoot "run-gig-update.ps1"

if (!(Test-Path $Runner)) {
  throw "Could not find runner script: $Runner"
}

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`""

$Trigger = New-ScheduledTaskTrigger -Daily -DaysInterval $DaysInterval -At $At
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Principal $Principal `
  -Settings $Settings `
  -Description "Runs Claude Code headless to research and update the Gig Radar (traditional jazz + roots-Americana gigs), then publishes to GitHub Pages. Logs under updater\logs." `
  -Force

Write-Host "Registered scheduled task: $TaskName"
Write-Host "Runner: $Runner"
Write-Host "Schedule: every $DaysInterval days at $At (offset from the calendar task at 08:00)"
Write-Host "Mode: Claude headless + auto-publish"
