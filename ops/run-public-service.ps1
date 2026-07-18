$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $projectRoot 'logs'
$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$tunnelName = 'interview-margin-local'
$supervisorMutex = [System.Threading.Mutex]::new($false, 'Local\InterviewMarginPublicServiceSupervisor')
$ownsSupervisorMutex = $false

try {
  $ownsSupervisorMutex = $supervisorMutex.WaitOne(0)
} catch [System.Threading.AbandonedMutexException] {
  $ownsSupervisorMutex = $true
}

if (-not $ownsSupervisorMutex) {
  $supervisorMutex.Dispose()
  exit 0
}

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

# The current desktop proxy owns fake-IP DNS resolution. Keep cloudflared on the
# same route so the connector can reach Cloudflare reliably after user logon.
$env:HTTP_PROXY = 'http://127.0.0.1:17891'
$env:HTTPS_PROXY = 'http://127.0.0.1:17891'

function Test-LocalApp {
  try {
    $health = Invoke-RestMethod 'http://127.0.0.1:4173/api/health' -TimeoutSec 3
    return $health.ok -eq $true
  } catch {
    return $false
  }
}

function Start-LocalApp {
  if (Test-LocalApp) {
    return
  }

  if (-not (Test-Path (Join-Path $projectRoot 'dist\index.html'))) {
    Push-Location $projectRoot
    try {
      & npm.cmd run build *> (Join-Path $logDir 'build.log')
    } finally {
      Pop-Location
    }
  }

  $node = (Get-Command node.exe).Source
  Start-Process `
    -FilePath $node `
    -ArgumentList 'server/index.js' `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'server.out.log') `
    -RedirectStandardError (Join-Path $logDir 'server.error.log') | Out-Null

  foreach ($attempt in 1..20) {
    Start-Sleep -Milliseconds 500
    if (Test-LocalApp) {
      return
    }
  }

  throw 'Local app did not become healthy on port 4173.'
}

function Get-TunnelProcesses {
  $resolvedCloudflared = [System.IO.Path]::GetFullPath($cloudflared)
  return @(Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'cloudflared.exe' -and
    $_.ExecutablePath -eq $resolvedCloudflared -and
    $_.CommandLine -like "*tunnel run $tunnelName*"
  } | Sort-Object CreationDate)
}

function Start-OrAdoptTunnel {
  $existing = Get-TunnelProcesses
  if ($existing.Count -gt 0) {
    $primary = $existing[0]
    foreach ($duplicate in @($existing | Select-Object -Skip 1)) {
      Stop-Process -Id $duplicate.ProcessId -Force -ErrorAction SilentlyContinue
    }

    return Get-Process -Id $primary.ProcessId -ErrorAction Stop
  }

  return Start-Process `
    -FilePath $cloudflared `
    -ArgumentList @('tunnel', 'run', $tunnelName) `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'cloudflared.out.log') `
    -RedirectStandardError (Join-Path $logDir 'cloudflared.error.log') `
    -PassThru
}

try {
  while ($true) {
    try {
      Start-LocalApp
      $tunnelProcess = Start-OrAdoptTunnel

      while (-not $tunnelProcess.HasExited) {
        if (-not (Test-LocalApp)) {
          Start-LocalApp
        }

        [void]$tunnelProcess.WaitForExit(5000)
        $tunnelProcess.Refresh()
      }

      Add-Content `
        (Join-Path $logDir 'supervisor.log') `
        "$(Get-Date -Format o) cloudflared exited with code $($tunnelProcess.ExitCode)."
    } catch {
      Add-Content (Join-Path $logDir 'supervisor.log') "$(Get-Date -Format o) $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 10
  }
} finally {
  if ($ownsSupervisorMutex) {
    $supervisorMutex.ReleaseMutex()
  }
  $supervisorMutex.Dispose()
}
