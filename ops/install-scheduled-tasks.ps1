$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$serviceScript = Join-Path $PSScriptRoot 'run-public-service.ps1'
$backupScript = Join-Path $PSScriptRoot 'backup-database.ps1'
$powerShell = (Get-Command powershell.exe).Source
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

$serviceAction = New-ScheduledTaskAction -Execute $powerShell -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$serviceScript`""
$serviceLogonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$serviceWatchdogTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At ((Get-Date).AddMinutes(1)) `
  -RepetitionInterval (New-TimeSpan -Minutes 5) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

# Start the local service even if Windows has not marked the network ready yet.
# cloudflared retries connectivity itself, while the watchdog recovers a missed
# logon trigger or a supervisor that was terminated outside the script.
$serviceSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 20 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName 'Interview Margin Public Service' -Action $serviceAction -Trigger @($serviceLogonTrigger, $serviceWatchdogTrigger) -Settings $serviceSettings -Force | Out-Null

$backupAction = New-ScheduledTaskAction -Execute $powerShell -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$backupScript`""
$backupTrigger = New-ScheduledTaskTrigger -Daily -At '03:00'
$backupSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 15) -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName 'Interview Margin Database Backup' -Action $backupAction -Trigger $backupTrigger -Settings $backupSettings -Force | Out-Null

Write-Output 'Scheduled tasks installed: public service and daily 03:00 database backup.'
