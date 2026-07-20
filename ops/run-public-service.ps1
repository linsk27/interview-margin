$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $projectRoot 'logs'
$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$tunnelTokenFile = Join-Path $env:USERPROFILE '.cloudflared\interview-margin-local.token'
$tunnelUrl = 'http://127.0.0.1:4173'
$serverEntry = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'server\index.js'))
$serverPidFile = Join-Path $logDir 'server.pid'
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

if (-not (Test-Path -LiteralPath $cloudflared)) {
  throw "cloudflared was not found at $cloudflared"
}

if (-not (Test-Path -LiteralPath $tunnelTokenFile)) {
  throw "Tunnel token file was not found at $tunnelTokenFile"
}

function Test-LocalApp {
  try {
    $health = Invoke-RestMethod 'http://127.0.0.1:4173/api/health' -TimeoutSec 3
    return $health.ok -eq $true
  } catch {
    return $false
  }
}

function Build-Frontend {
  $distIndex = Join-Path $projectRoot 'dist\index.html'
  $previousErrorActionPreference = $ErrorActionPreference
  $buildExitCode = $null
  Push-Location $projectRoot
  try {
    # Vite writes warnings to stderr even when the build succeeds. PowerShell 5.1
    # turns redirected stderr into error records, so rely on the native exit code.
    $ErrorActionPreference = 'Continue'
    & npm.cmd run build *> (Join-Path $logDir 'build.log')
    $buildExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
    Pop-Location
  }

  if ($buildExitCode -ne 0) {
    throw "Frontend build exited with code $buildExitCode. See logs/build.log."
  }

  if (-not (Test-Path -LiteralPath $distIndex)) {
    throw 'Frontend build completed without creating dist/index.html.'
  }
}

function Stop-OwnedLocalApp {
  if (-not (Test-Path -LiteralPath $serverPidFile)) {
    return
  }

  try {
    $metadata = Get-Content -LiteralPath $serverPidFile -Raw | ConvertFrom-Json -ErrorAction Stop
    $serverPid = 0
    $creationTimeUtcTicks = 0L
    $metadataIsValid =
      [int]::TryParse([string]$metadata.pid, [ref]$serverPid) -and
      [long]::TryParse([string]$metadata.creationTimeUtcTicks, [ref]$creationTimeUtcTicks)

    if ($metadataIsValid) {
      $serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $serverPid" -ErrorAction SilentlyContinue
      $expectedNode = [System.IO.Path]::GetFullPath((Get-Command node.exe).Source)
      $entryMatches =
        $serverProcess -and
        $serverProcess.CommandLine -and
        $serverProcess.CommandLine.IndexOf($serverEntry, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
      $executableMatches =
        $serverProcess -and
        [string]::Equals($serverProcess.ExecutablePath, $expectedNode, [System.StringComparison]::OrdinalIgnoreCase)
      $creationTimeMatches =
        $serverProcess -and
        $serverProcess.CreationDate.ToUniversalTime().Ticks -eq $creationTimeUtcTicks

      if ($serverProcess.Name -eq 'node.exe' -and $entryMatches -and $executableMatches -and $creationTimeMatches) {
        Stop-Process -Id $serverPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
      }
    }
  } catch {
    Add-Content (Join-Path $logDir 'supervisor.log') "$(Get-Date -Format o) ignored invalid server PID metadata: $($_.Exception.Message)"
  } finally {
    Remove-Item -LiteralPath $serverPidFile -Force -ErrorAction SilentlyContinue
  }
}

function Start-LocalApp {
  if (Test-LocalApp) {
    return
  }

  Stop-OwnedLocalApp

  $node = (Get-Command node.exe).Source
  $serverProcess = Start-Process `
    -FilePath $node `
    -ArgumentList "`"$serverEntry`"" `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'server.out.log') `
    -RedirectStandardError (Join-Path $logDir 'server.error.log') `
    -PassThru
  $serverProcessInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($serverProcess.Id)" -ErrorAction Stop
  [pscustomobject]@{
    pid = $serverProcess.Id
    creationTimeUtcTicks = $serverProcessInfo.CreationDate.ToUniversalTime().Ticks.ToString()
  } | ConvertTo-Json -Compress | Set-Content -LiteralPath $serverPidFile -Encoding Ascii

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
    $_.CommandLine -like '*tunnel*run*' -and
    $_.CommandLine -like '*interview-margin-local.token*'
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
    -ArgumentList @('tunnel', '--url', $tunnelUrl, 'run', '--token-file', $tunnelTokenFile) `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'cloudflared.out.log') `
    -RedirectStandardError (Join-Path $logDir 'cloudflared.error.log') `
    -PassThru
}

try {
  Build-Frontend

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
} catch {
  Add-Content (Join-Path $logDir 'supervisor.log') "$(Get-Date -Format o) fatal: $($_.Exception.Message)"
  throw
} finally {
  if ($ownsSupervisorMutex) {
    $supervisorMutex.ReleaseMutex()
  }
  $supervisorMutex.Dispose()
}
