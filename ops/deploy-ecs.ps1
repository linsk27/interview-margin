[CmdletBinding()]
param(
  [string]$Target = 'root@47.98.121.191',
  [string]$PublicBaseUrl = 'https://interview.linsk27.dpdns.org',
  [int]$ConnectTimeoutSeconds = 10,
  [switch]$SkipLocalBuild
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath exited with code $LASTEXITCODE."
  }
}

function Get-Sha256Hex {
  param([Parameter(Mandatory = $true)][string]$LiteralPath)

  $stream = [IO.File]::OpenRead($LiteralPath)
  $sha256 = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha256.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
  }
  finally {
    $sha256.Dispose()
    $stream.Dispose()
  }
}

function Get-PublicSmoke {
  param([Parameter(Mandatory = $true)][Uri]$BaseUri)

  $cacheBuster = [Guid]::NewGuid().ToString('N')
  $requestHeaders = @{
    'Cache-Control' = 'no-cache'
    'Pragma' = 'no-cache'
  }
  $pageUri = [UriBuilder]$BaseUri
  $pageUri.Query = "deploy-smoke=$cacheBuster"
  $page = Invoke-WebRequest -Uri $pageUri.Uri.AbsoluteUri -Method Get -TimeoutSec 20 -UseBasicParsing -Headers $requestHeaders
  $healthUri = [UriBuilder][Uri]::new($BaseUri, 'api/health')
  $healthUri.Query = "deploy-smoke=$cacheBuster"
  $health = Invoke-RestMethod -Uri $healthUri.Uri.AbsoluteUri -Method Get -TimeoutSec 20 -Headers $requestHeaders
  if ($page.StatusCode -ne 200 -or $health.ok -ne $true) {
    throw 'Public page or API health check failed.'
  }

  $assetChecks = @(
    @{ Path = 'robots.txt'; Types = @('text/plain') },
    @{ Path = 'sitemap.xml'; Types = @('application/xml', 'text/xml') },
    @{ Path = 'site.webmanifest'; Types = @('application/manifest+json', 'application/json') },
    @{ Path = 'favicon.svg'; Types = @('image/svg+xml') },
    @{ Path = 'assets/interview-margin-share.png'; Types = @('image/png') }
  )
  $assetStatus = [ordered]@{}
  foreach ($asset in $assetChecks) {
    $assetUri = [UriBuilder][Uri]::new($BaseUri, $asset.Path)
    $assetUri.Query = "deploy-smoke=$cacheBuster"
    $response = Invoke-WebRequest -Uri $assetUri.Uri.AbsoluteUri -Method Get -TimeoutSec 20 -UseBasicParsing -Headers $requestHeaders
    $contentType = [string]$response.Headers['Content-Type']
    $mediaType = $contentType.Split(';')[0].Trim()
    $hasExpectedType = $asset.Types -contains $mediaType
    if ($response.StatusCode -ne 200 -or -not $hasExpectedType -or
        ([string]$response.Content) -match '(?i)<!doctype\s+html|<html(?:\s|>)') {
      throw "Public asset verification failed for $($asset.Path): status=$($response.StatusCode), content-type=$contentType"
    }
    $assetStatus[$asset.Path] = $mediaType
  }

  return [pscustomobject]@{ PageStatus = $page.StatusCode; Health = $health; Assets = $assetStatus }
}

function Get-RemoteDeploymentObservation {
  param(
    [Parameter(Mandatory = $true)][string]$SshTarget,
    [Parameter(Mandatory = $true)][string[]]$SshArguments
  )

  $observationCommand = 'current=$(readlink -f /opt/interview-margin/current 2>/dev/null || true); echo "current=$current"; state=/var/lib/interview-margin-deploy/pending.state; if [ -e "$state" ] || [ -L "$state" ]; then [ -f "$state" ] && [ ! -L "$state" ] && [ "$(stat -c %U:%G "$state")" = root:root ] && [ "$(stat -c %a "$state")" = 600 ] || exit 42; echo pending=present; cat -- "$state"; else echo pending=absent; fi'
  $lines = @(& ssh @SshArguments $SshTarget $observationCommand)
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read a trustworthy remote deployment state (ssh exit $LASTEXITCODE)."
  }

  $values = @{}
  foreach ($line in $lines) {
    if ($line -notmatch '^([a-z_]+)=(.*)$') {
      throw "Unexpected remote deployment state line: $line"
    }
    $key = $Matches[1]
    if ($values.ContainsKey($key)) {
      throw "Duplicate remote deployment state field: $key"
    }
    $values[$key] = $Matches[2]
  }

  if (-not $values.ContainsKey('current') -or
      $values.current -notmatch '^/opt/interview-margin/releases/[0-9a-f]{7,40}$') {
    throw "Unable to resolve a valid current remote release: $($values.current)"
  }
  if (-not $values.ContainsKey('pending') -or
      $values.pending -notin @('present', 'absent')) {
    throw 'Remote deployment state did not report whether a pending release exists.'
  }

  if ($values.pending -eq 'present') {
    foreach ($requiredKey in @('sha', 'new_release', 'previous_release', 'backup')) {
      if (-not $values.ContainsKey($requiredKey)) {
        throw "Remote pending deployment state is missing: $requiredKey"
      }
    }
    if ($values.sha -notmatch '^[0-9a-f]{40}$' -or
        $values.new_release -notmatch '^/opt/interview-margin/releases/[0-9a-f]{40}$' -or
        $values.previous_release -notmatch '^/opt/interview-margin/releases/[0-9a-f]{7,40}$' -or
        $values.backup -notmatch '^/var/lib/interview-margin/backups/[^/]+\.db$') {
      throw 'Remote pending deployment state contains an unsafe value.'
    }
  }
  elseif ($values.Count -ne 2) {
    throw 'Remote deployment state reported absent but included unexpected fields.'
  }

  return [pscustomobject]@{
    Current = $values.current
    Pending = $values.pending
    PendingSha = if ($values.pending -eq 'present') { $values.sha } else { $null }
    PendingRelease = if ($values.pending -eq 'present') { $values.new_release } else { $null }
  }
}

function Test-ObservationMatchesRelease {
  param(
    [Parameter(Mandatory = $true)]$Observation,
    [Parameter(Mandatory = $true)][string]$ReleaseSha
  )

  $expectedRelease = "/opt/interview-margin/releases/$ReleaseSha"
  return $Observation.Current -eq $expectedRelease -and
    $Observation.Pending -eq 'present' -and
    $Observation.PendingSha -eq $ReleaseSha -and
    $Observation.PendingRelease -eq $expectedRelease
}

function Wait-RemoteDeploymentSettlement {
  param(
    [Parameter(Mandatory = $true)][string]$SshTarget,
    [Parameter(Mandatory = $true)][string[]]$SshArguments
  )

  $waitCommand = 'control=/var/lib/interview-margin-deploy; lock="$control/deploy.lock"; [ -d "$control" ] && [ ! -L "$control" ] && [ "$(stat -c %U:%G:%a "$control")" = root:root:700 ] || exit 43; [ ! -L "$lock" ] || exit 44; : >> "$lock"; chown root:root "$lock"; chmod 0600 "$lock"; [ -f "$lock" ] && [ ! -L "$lock" ] || exit 45; exec 9>>"$lock"; flock -w 15 9'
  $stablePasses = 0

  for ($attempt = 1; $attempt -le 12; $attempt++) {
    $null = @(& ssh @SshArguments $SshTarget $waitCommand)
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
      $stablePasses++
      if ($stablePasses -ge 3) {
        return
      }
      Start-Sleep -Seconds 1
      continue
    }

    $stablePasses = 0
    if ($exitCode -notin @(1, 255)) {
      throw "Remote deployment lock validation failed with ssh exit $exitCode."
    }
  }

  throw 'Remote deployment did not reach a stable unlocked state within the reconciliation window.'
}

if ($Target -notmatch '^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$') {
  throw "Unsafe SSH target: $Target"
}
if ($ConnectTimeoutSeconds -lt 1 -or $ConnectTimeoutSeconds -gt 60) {
  throw 'ConnectTimeoutSeconds must be between 1 and 60.'
}

$publicUri = $null
if (-not [Uri]::TryCreate($PublicBaseUrl, [UriKind]::Absolute, [ref]$publicUri) -or $publicUri.Scheme -ne 'https') {
  throw "PublicBaseUrl must be an absolute HTTPS URL: $PublicBaseUrl"
}

$repoRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$releaseScript = Join-Path $PSScriptRoot 'linux\deploy-release.sh'
if (-not (Test-Path -LiteralPath $releaseScript -PathType Leaf)) {
  throw "Release entrypoint is missing: $releaseScript"
}
$statusLines = @(& git -C $repoRoot status --porcelain)
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to inspect git status.'
}
if ($statusLines.Count -gt 0) {
  throw "Refusing to deploy a dirty worktree:`n$($statusLines -join "`n")"
}

$sha = (& git -C $repoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $sha -notmatch '^[0-9a-f]{40}$') {
  throw "Unable to resolve a full release SHA: $sha"
}

$nonce = [Guid]::NewGuid().ToString('N').ToLowerInvariant()
if ($nonce -notmatch '^[0-9a-f]{32}$') {
  throw 'Unable to create a safe deployment nonce.'
}

$archivePath = Join-Path ([IO.Path]::GetTempPath()) "interview-margin-$sha-$nonce.tar.gz"
$remoteEntrypoint = '/opt/interview-margin/deploy/deploy-release.sh'
$remoteArchive = "/var/lib/interview-margin-deploy/incoming/$sha-$nonce.tar.gz"
$expectedRelease = "/opt/interview-margin/releases/$sha"
$sshOptions = @('-o', 'BatchMode=yes', '-o', "ConnectTimeout=$ConnectTimeoutSeconds")
$entrypointSha = Get-Sha256Hex -LiteralPath $releaseScript
$bootstrapCheck = 'entry=/opt/interview-margin/deploy/deploy-release.sh; control=/var/lib/interview-margin-deploy; incoming=/var/lib/interview-margin-deploy/incoming; [ -f "$entry" ] && [ ! -L "$entry" ] && [ "$(stat -c %U:%G "$entry")" = root:root ] || exit 41; mode=$(stat -c %a "$entry"); case "$mode" in 500|700) ;; *) exit 42 ;; esac; for directory in "$control" "$incoming"; do [ -d "$directory" ] && [ ! -L "$directory" ] && [ "$(stat -c %U:%G "$directory")" = root:root ] && [ "$(stat -c %a "$directory")" = 700 ] || exit 43; done; actual=$(sha256sum "$entry"); actual=${actual%% *}; [ "$actual" = "' + $entrypointSha + '" ] || exit 44'

if (Test-Path -LiteralPath $archivePath) {
  throw "Temporary archive already exists: $archivePath"
}

& ssh @sshOptions $Target $bootstrapCheck
if ($LASTEXITCODE -ne 0) {
  throw "Remote deployment bootstrap is missing, unsafe, or differs from the checked-in entrypoint. Reinstall $releaseScript as root:root mode 0500 at $remoteEntrypoint and keep the deployment directories root:root mode 0700."
}

$initialObservation = Get-RemoteDeploymentObservation -SshTarget $Target -SshArguments $sshOptions
if ($initialObservation.Pending -eq 'present') {
  if (-not (Test-ObservationMatchesRelease -Observation $initialObservation -ReleaseSha $sha)) {
    throw "A different or inconsistent deployment is pending: current=$($initialObservation.Current), pending=$($initialObservation.PendingSha)."
  }

  try {
    $recoveredSmoke = Get-PublicSmoke -BaseUri $publicUri
    Invoke-CheckedCommand -FilePath 'ssh' -Arguments @(
      $sshOptions + @($Target, $remoteEntrypoint, 'confirm', $sha)
    )
  }
  catch {
    $recoveryError = $_
    try {
      Invoke-CheckedCommand -FilePath 'ssh' -Arguments @(
        $sshOptions + @($Target, $remoteEntrypoint, 'rollback', $sha)
      )
    }
    catch {
      Write-Warning "Pending deployment verification failed and automatic code rollback also failed: $($_.Exception.Message)"
    }
    throw $recoveryError
  }

  [ordered]@{
    release = $sha
    deployment = 'recovered-and-confirmed'
    target = $Target
    publicUrl = $publicUri.AbsoluteUri
    pageStatus = $recoveredSmoke.PageStatus
    health = $recoveredSmoke.Health
    assets = $recoveredSmoke.Assets
  } | ConvertTo-Json -Depth 5
  return
}

if ($initialObservation.Current -eq $expectedRelease) {
  Invoke-CheckedCommand -FilePath 'ssh' -Arguments @(
    $sshOptions + @(
      $Target,
      'systemctl is-active --quiet interview-margin.service cloudflared-interview-margin.service && curl -fsS http://127.0.0.1:4173/api/health'
    )
  )
  $currentSmoke = Get-PublicSmoke -BaseUri $publicUri
  [ordered]@{
    release = $sha
    deployment = 'already-current'
    target = $Target
    publicUrl = $publicUri.AbsoluteUri
    pageStatus = $currentSmoke.PageStatus
    health = $currentSmoke.Health
    assets = $currentSmoke.Assets
  } | ConvertTo-Json -Depth 5
  return
}

$remoteDeployed = $false
$remoteArchiveMayExist = $false
$preserveRemoteArchive = $false
try {
  Push-Location $repoRoot
  try {
    if (-not $SkipLocalBuild) {
      Invoke-CheckedCommand -FilePath 'npm.cmd' -Arguments @('run', 'build')
    }
    Invoke-CheckedCommand -FilePath 'git' -Arguments @(
      'archive', '--format=tar.gz', "--output=$archivePath", 'HEAD'
    )
  }
  finally {
    Pop-Location
  }

  $archiveInfo = Get-Item -LiteralPath $archivePath
  if ($archiveInfo.Length -le 0) {
    throw "Release archive is empty: $archivePath"
  }
  $archiveSha = Get-Sha256Hex -LiteralPath $archivePath

  $remoteArchiveMayExist = $true
  Invoke-CheckedCommand -FilePath 'scp' -Arguments @(
    $sshOptions + @($archivePath, "${Target}:$remoteArchive")
  )

  try {
    Invoke-CheckedCommand -FilePath 'ssh' -Arguments @(
      $sshOptions + @($Target, $remoteEntrypoint, 'deploy', $sha, $archiveSha, $remoteArchive)
    )
    $remoteDeployed = $true
  }
  catch {
    $deployCommandError = $_
    try {
      Wait-RemoteDeploymentSettlement -SshTarget $Target -SshArguments $sshOptions
      $postFailureObservation = Get-RemoteDeploymentObservation -SshTarget $Target -SshArguments $sshOptions
    }
    catch {
      $preserveRemoteArchive = $true
      throw "The deployment SSH command failed and remote state could not be reconciled. Deployment outcome is unknown; inspect $expectedRelease and /var/lib/interview-margin-deploy/pending.state before retrying. Original error: $($deployCommandError.Exception.Message) Reconciliation error: $($_.Exception.Message)"
    }

    if (-not (Test-ObservationMatchesRelease -Observation $postFailureObservation -ReleaseSha $sha)) {
      $knownFailedBeforeSwitch = $postFailureObservation.Current -eq $initialObservation.Current -and
        $postFailureObservation.Pending -eq 'absent'
      if ($knownFailedBeforeSwitch) {
        throw "The deployment failed before the release switch; production remains on $($postFailureObservation.Current). Original error: $($deployCommandError.Exception.Message)"
      }
      $preserveRemoteArchive = $true
      throw "The deployment SSH command failed and remote state is not safely recoverable: current=$($postFailureObservation.Current), pending=$($postFailureObservation.PendingSha). No confirm or rollback was attempted. Original error: $($deployCommandError.Exception.Message)"
    }

    Write-Warning 'The deployment SSH response was interrupted after the release switch; verified matching current and pending state, so public verification will continue.'
    $remoteDeployed = $true
  }

  $smoke = Get-PublicSmoke -BaseUri $publicUri
  Invoke-CheckedCommand -FilePath 'ssh' -Arguments @(
    $sshOptions + @($Target, $remoteEntrypoint, 'confirm', $sha)
  )
  $remoteDeployed = $false

  [ordered]@{
    release = $sha
    deployment = 'confirmed'
    target = $Target
    publicUrl = $publicUri.AbsoluteUri
    pageStatus = $smoke.PageStatus
    health = $smoke.Health
    assets = $smoke.Assets
  } | ConvertTo-Json -Depth 5
}
catch {
  $deploymentError = $_
  if ($remoteDeployed) {
    try {
      Invoke-CheckedCommand -FilePath 'ssh' -Arguments @(
        $sshOptions + @($Target, $remoteEntrypoint, 'rollback', $sha)
      )
      $remoteDeployed = $false
    }
    catch {
      Write-Warning "Public verification failed and automatic code rollback also failed: $($_.Exception.Message)"
    }
  }
  throw $deploymentError
}
finally {
  if (Test-Path -LiteralPath $archivePath) {
    $resolvedArchive = (Resolve-Path -LiteralPath $archivePath).Path
    $expectedArchive = [IO.Path]::GetFullPath($archivePath)
    if ($resolvedArchive -eq $expectedArchive) {
      Remove-Item -LiteralPath $resolvedArchive
    }
  }

  if ($remoteArchiveMayExist -and -not $preserveRemoteArchive) {
    & ssh @sshOptions $Target rm -f -- $remoteArchive 2>$null
  }
  elseif ($preserveRemoteArchive) {
    Write-Warning "Remote deployment outcome is unknown; retained the incoming archive for recovery: $remoteArchive"
  }
}
