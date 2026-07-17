$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $projectRoot 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

Push-Location $projectRoot
try {
  & node.exe 'server/backup.js' *>> (Join-Path $logDir 'backup.log')
  if ($LASTEXITCODE -ne 0) {
    throw "Database backup exited with code $LASTEXITCODE."
  }
} catch {
  Add-Content (Join-Path $logDir 'backup.error.log') "$(Get-Date -Format o) $($_.Exception.Message)"
  throw
} finally {
  Pop-Location
}
