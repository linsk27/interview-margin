$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$serviceScript = Join-Path $PSScriptRoot 'run-public-service.ps1'
$backupScript = Join-Path $PSScriptRoot 'backup-database.ps1'
$powerShell = (Get-Command powershell.exe).Source
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

$serviceAction = New-ScheduledTaskAction -Execute $powerShell -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$serviceScript`""
$serviceTrigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$serviceSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 20 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650)
Register-ScheduledTask -TaskName 'Interview Margin Public Service' -Action $serviceAction -Trigger $serviceTrigger -Settings $serviceSettings -Force | Out-Null

$backupAction = New-ScheduledTaskAction -Execute $powerShell -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$backupScript`""
$backupTrigger = New-ScheduledTaskTrigger -Daily -At '03:00'
$backupSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName 'Interview Margin Database Backup' -Action $backupAction -Trigger $backupTrigger -Settings $backupSettings -Force | Out-Null

Write-Output 'Scheduled tasks installed: public service and daily 03:00 database backup.'
