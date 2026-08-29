#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

fail() {
  printf '[interview-margin deploy] %s\n' "$*" >&2
  exit 1
}

log_error() {
  printf '[interview-margin deploy] %s\n' "$*" >&2
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

[[ "$(id -u)" -eq 0 ]] || fail 'run as root'

action="${1:-}"
sha="${2:-}"
[[ "$action" == 'deploy' || "$action" == 'confirm' || "$action" == 'rollback' ]] ||
  fail 'usage: deploy-release.sh <deploy|confirm|rollback> <full-sha> [archive-sha256 archive-path]'
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || fail "invalid full commit SHA: $sha"

app_root='/opt/interview-margin'
releases_root="$app_root/releases"
current_link="$app_root/current"
state_root='/var/lib/interview-margin'
data_root="$state_root/data"
backup_root="$state_root/backups"
npm_cache_root='/var/cache/interview-margin-npm'
deploy_control_root='/var/lib/interview-margin-deploy'
incoming_root="$deploy_control_root/incoming"
deploy_state="$deploy_control_root/pending.state"
service='interview-margin.service'
tunnel_service='cloudflared-interview-margin.service'
backup_service='interview-margin-backup.service'
new_release="$releases_root/$sha"

for command_name in chmod chown cmp curl cut env find flock install ln mkdir mv npm readlink rm sha256sum sleep sort sqlite3 stat sudo systemctl tail tar; do
  require_command "$command_name"
done

for controlled_dir in "$deploy_control_root" "$incoming_root"; do
  [[ ! -L "$controlled_dir" ]] || fail "deployment control path must not be a symlink: $controlled_dir"
  install -d -o root -g root -m 0700 "$controlled_dir"
  [[ "$(stat -c '%u:%g:%a' "$controlled_dir")" == '0:0:700' ]] ||
    fail "deployment control path is not root:root 0700: $controlled_dir"
done
[[ -d "$state_root" && ! -L "$state_root" &&
  "$(stat -c '%U:%G:%a' "$state_root")" == 'interview-margin:interview-margin:700' ]] ||
  fail "application state root is not interview-margin:interview-margin 0700: $state_root"
[[ ! -L "$npm_cache_root" ]] || fail "npm cache must not be a symlink: $npm_cache_root"
install -d -o interview-margin -g interview-margin -m 0700 "$npm_cache_root"
[[ "$(stat -c '%U:%G:%a' "$npm_cache_root")" == 'interview-margin:interview-margin:700' ]] ||
  fail "npm cache is not interview-margin:interview-margin 0700: $npm_cache_root"
exec 9>"$deploy_control_root/deploy.lock"
flock -w 120 9 || fail 'another deployment still holds the release lock'

wait_for_local_health() {
  local attempt=1
  while [[ "$attempt" -le 45 ]]; do
    if curl -fsS http://127.0.0.1:4173/api/health >/dev/null; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  return 1
}

atomic_switch() {
  local target="$1"
  local label="$2"
  local temp_link="$app_root/.current-$label-$$"
  if [[ "$target" != "$releases_root/"* || ! -d "$target" ]]; then
    log_error "refusing an invalid release target: $target"
    return 1
  fi
  if [[ -e "$temp_link" || -L "$temp_link" ]]; then
    log_error "temporary link exists: $temp_link"
    return 1
  fi
  if ! ln -s "$target" "$temp_link"; then
    log_error "could not create temporary release link: $temp_link"
    return 1
  fi
  if [[ "$(readlink -f "$temp_link")" != "$target" ]]; then
    log_error "invalid temporary link: $temp_link"
    rm -f -- "$temp_link" || true
    return 1
  fi
  if ! mv -Tf "$temp_link" "$current_link"; then
    log_error "could not atomically switch current to: $target"
    rm -f -- "$temp_link" || true
    return 1
  fi
}

read_deploy_state() {
  [[ -f "$deploy_state" && ! -L "$deploy_state" ]] || return 1
  [[ "$(stat -c '%u:%g:%a' "$deploy_state")" == '0:0:600' ]] ||
    fail "deployment state is not root:root 0600: $deploy_state"
  local -a state_lines=()
  mapfile -t state_lines < "$deploy_state"
  [[ "${#state_lines[@]}" -eq 4 ]] || fail "invalid deployment state: $deploy_state"
  [[ "${state_lines[0]}" == sha=* && "${state_lines[1]}" == new_release=* &&
    "${state_lines[2]}" == previous_release=* && "${state_lines[3]}" == backup=* ]] ||
    fail "invalid deployment state fields: $deploy_state"
  state_sha="${state_lines[0]#sha=}"
  state_new_release="${state_lines[1]#new_release=}"
  state_previous_release="${state_lines[2]#previous_release=}"
  state_backup="${state_lines[3]#backup=}"
  [[ "$state_sha" == "$sha" ]] || fail 'deployment state does not match the requested commit'
  [[ "$state_new_release" == "$new_release" ]] || fail 'deployment state does not match the requested release'
  [[ "$state_previous_release" == "$releases_root/"* && -d "$state_previous_release" &&
    "$(readlink -f "$state_previous_release")" == "$state_previous_release" ]] ||
    fail 'deployment state contains an invalid previous release'
  [[ "$state_backup" == "$backup_root/"* && -f "$state_backup" && ! -L "$state_backup" &&
    "$(readlink -f "$state_backup")" == "$state_backup" ]] ||
    fail 'deployment state contains an invalid backup'
}

rollback_code_only() {
  local previous_release="$1"
  if ! atomic_switch "$previous_release" "rollback-$sha"; then
    return 1
  fi
  if ! systemctl restart "$service"; then
    log_error "could not restart $service while rolling back"
    return 1
  fi
  if ! wait_for_local_health; then
    log_error 'previous release did not recover local health'
    return 1
  fi
  return 0
}

confirm_release() {
  if [[ ! -e "$deploy_state" && ! -L "$deploy_state" ]]; then
    [[ "$(readlink -f "$current_link")" == "$new_release" ]] ||
      fail 'no deployment state exists and the requested release is not current'
    printf 'confirmation=already-confirmed\ncurrent_release=%s\n' "$new_release"
    return
  fi
  read_deploy_state || fail "unsafe deployment state exists: $deploy_state"

  [[ "$(readlink -f "$current_link")" == "$new_release" ]] ||
    fail 'refusing to confirm a release that is no longer current'
  rm -- "$deploy_state"
  printf 'confirmation=confirmed\ncurrent_release=%s\n' "$new_release"
}

rollback_release() {
  read_deploy_state || fail "no rollback state exists for $sha"
  local current_release
  current_release="$(readlink -f "$current_link")"
  [[ "$current_release" == "$new_release" || "$current_release" == "$state_previous_release" ]] ||
    fail 'refusing to roll back because current is neither the pending nor previous release'
  rollback_code_only "$state_previous_release" ||
    fail 'rollback failed; pending state was retained for recovery'
  rm -- "$deploy_state"
  printf 'rollback=complete\nrestored_release=%s\nbackup_retained=%s\n' \
    "$state_previous_release" "$state_backup"
}

latest_backup() {
  find "$backup_root" -maxdepth 1 -type f -name 'interview-*.db' -printf '%T@ %p\n' |
    sort -n |
    tail -n 1 |
    cut -d' ' -f2-
}

deploy_release() {
  [[ "$#" -eq 2 ]] || fail 'deploy requires archive SHA256 and archive path'
  local archive_sha="$1"
  local archive="$2"
  [[ "$archive_sha" =~ ^[0-9a-f]{64}$ ]] || fail 'invalid archive SHA256'
  [[ "$archive" =~ ^${incoming_root}/${sha}-[0-9a-f]{32}\.tar\.gz$ ]] ||
    fail "archive must be a nonce-qualified file below $incoming_root"
  [[ -f "$archive" && ! -L "$archive" ]] || fail "archive is missing or unsafe: $archive"
  [[ "$(stat -c '%u:%g' "$archive")" == '0:0' ]] || fail 'archive must be owned by root:root'
  chmod 0600 "$archive"
  [[ "$(sha256sum "$archive" | cut -d' ' -f1)" == "$archive_sha" ]] || fail 'archive SHA256 mismatch'

  [[ -L "$current_link" ]] || fail "current release link is missing: $current_link"
  local old_release
  old_release="$(readlink -f "$current_link")"
  [[ "$old_release" == "$releases_root/"* && -d "$old_release" ]] ||
    fail "current release resolves outside $releases_root: $old_release"

  local staging_release="$releases_root/.staging-$sha-$$"
  local pending_created=0
  local pending_temp="$deploy_control_root/.pending-$$"
  local backup=''

  cleanup_deploy() {
    local status=$?
    if [[ "$#" -eq 1 ]]; then
      status="$1"
    fi
    trap - EXIT
    if [[ "$status" -ne 0 && "$pending_created" -eq 1 ]]; then
      if rollback_code_only "$old_release"; then
        if ! rm -f -- "$deploy_state"; then
          log_error "rollback succeeded but pending state could not be removed: $deploy_state"
        fi
      else
        log_error "automatic rollback failed; pending state retained at $deploy_state"
      fi
    fi
    rm -f -- "$pending_temp" || log_error "could not remove pending temp file: $pending_temp"
    rm -f -- "$archive" || log_error "could not remove incoming archive: $archive"
    if [[ -d "$staging_release" && "$staging_release" == "$releases_root/.staging-$sha-"* ]]; then
      rm -rf -- "$staging_release" || log_error "could not remove staging release: $staging_release"
    fi
    exit "$status"
  }
  trap cleanup_deploy EXIT

  [[ ! -e "$deploy_state" && ! -L "$deploy_state" ]] ||
    fail "an unconfirmed global deployment already exists: $deploy_state"

  if [[ "$old_release" == "$new_release" ]]; then
    systemctl is-active --quiet "$service" || fail "$service is not active"
    systemctl is-active --quiet "$tunnel_service" || fail "$tunnel_service is not active"
    wait_for_local_health || fail 'current release failed local health check'
    printf 'deployment=already-current\ncurrent_release=%s\n' "$new_release"
    curl -fsS http://127.0.0.1:4173/api/health
    printf '\n'
    cleanup_deploy 0
  fi

  [[ -d "$data_root" && -d "$backup_root" ]] || fail 'persistent data directories are missing'

  local reuse_release=0
  if [[ -e "$new_release" || -L "$new_release" ]]; then
    [[ -d "$new_release" && ! -L "$new_release" ]] || fail "unsafe existing release: $new_release"
    [[ -f "$new_release/.release-ready" && -f "$new_release/.git-commit" &&
      -f "$new_release/.archive-sha256" ]] ||
      fail "existing release is incomplete: $new_release"
    [[ "$(<"$new_release/.git-commit")" == "$sha" ]] || fail 'existing release commit marker is invalid'
    [[ "$(<"$new_release/.archive-sha256")" == "$archive_sha" ]] ||
      fail 'existing release archive marker is invalid'
    reuse_release=1
  fi

  if [[ "$reuse_release" -eq 0 ]]; then
    [[ ! -e "$staging_release" && ! -L "$staging_release" ]] ||
      fail "staging path already exists: $staging_release"
    mkdir "$staging_release"
    tar -xzf "$archive" --no-same-owner -C "$staging_release"
    [[ ! -e "$staging_release/data" && ! -L "$staging_release/data" ]] ||
      fail 'release archive unexpectedly contains data/'
    [[ ! -e "$staging_release/backups" && ! -L "$staging_release/backups" ]] ||
      fail 'release archive unexpectedly contains backups/'

    chown -R interview-margin:interview-margin "$staging_release"
    chmod -R u+rwX,g+rX,o-rwx "$staging_release"

    cd "$staging_release"
    sudo -u interview-margin env HOME=/var/lib/interview-margin \
      npm_config_cache="$npm_cache_root" npm ci --include=optional --audit=false
    if ! cmp -s "$old_release/package-lock.json" "$staging_release/package-lock.json"; then
      sudo -u interview-margin env HOME=/var/lib/interview-margin npm_config_cache="$npm_cache_root" \
        npm audit --omit=dev --registry=https://registry.npmjs.org
    fi
    # Generated catalog snapshots are intentionally excluded from Git. The
    # build's prebuild step creates them from the committed Markdown before the
    # tests exercise the exact production seed path that will be switched live.
    sudo -u interview-margin env HOME=/var/lib/interview-margin \
      npm_config_cache="$npm_cache_root" npm run build
    sudo -u interview-margin env HOME=/var/lib/interview-margin \
      npm_config_cache="$npm_cache_root" npm test -- --maxWorkers=1
    sudo -u interview-margin env HOME=/var/lib/interview-margin \
      npm_config_cache="$npm_cache_root" npm run db:check

    chown -R root:interview-margin "$staging_release"
    chmod -R g+rX,o-rwx "$staging_release"
    ln -s "$data_root" "$staging_release/data"
    ln -s "$backup_root" "$staging_release/backups"
    sudo -u interview-margin env HOME=/var/lib/interview-margin IM_APP_ROOT="$staging_release" \
      /usr/bin/bash "$staging_release/ops/linux/db-preflight.sh" app

    printf '%s\n' "$sha" > "$staging_release/.git-commit"
    printf '%s\n' "$archive_sha" > "$staging_release/.archive-sha256"
    printf 'ready\n' > "$staging_release/.release-ready"
    chown root:interview-margin "$staging_release/.git-commit" \
      "$staging_release/.archive-sha256" "$staging_release/.release-ready"
    chmod 0440 "$staging_release/.git-commit" "$staging_release/.archive-sha256" \
      "$staging_release/.release-ready"
    mv -- "$staging_release" "$new_release"
  else
    chown -R root:interview-margin "$new_release"
    chmod -R g+rX,o-rwx "$new_release"
    sudo -u interview-margin env HOME=/var/lib/interview-margin IM_APP_ROOT="$new_release" \
      /usr/bin/bash "$new_release/ops/linux/db-preflight.sh" app
  fi

  systemctl is-active --quiet "$service" || fail "$service is not active before deployment"
  systemctl is-active --quiet "$tunnel_service" || fail "$tunnel_service is not active before deployment"

  local before_backup
  before_backup="$(latest_backup || true)"
  systemctl start "$backup_service"
  backup="$(latest_backup || true)"
  [[ -n "$backup" && "$backup" != "$before_backup" ]] || fail 'pre-deployment backup was not created'
  [[ -f "$backup" && ! -L "$backup" ]] || fail "backup is missing or unsafe: $backup"
  [[ "$(sqlite3 "$backup" 'PRAGMA integrity_check;')" == 'ok' ]] ||
    fail "backup integrity check failed: $backup"

  [[ ! -e "$pending_temp" && ! -L "$pending_temp" ]] || fail "pending temp exists: $pending_temp"
  printf 'sha=%s\nnew_release=%s\nprevious_release=%s\nbackup=%s\n' \
    "$sha" "$new_release" "$old_release" "$backup" > "$pending_temp"
  chown root:root "$pending_temp"
  chmod 0600 "$pending_temp"
  ln -- "$pending_temp" "$deploy_state" || fail 'could not atomically create global pending state'
  pending_created=1
  rm -- "$pending_temp"

  atomic_switch "$new_release" "next-$sha" || fail 'could not switch to the new release'
  systemctl restart "$service"
  wait_for_local_health || fail 'new release failed local health'
  systemctl is-active --quiet "$service" || fail "$service is not active after deployment"
  systemctl is-active --quiet "$tunnel_service" || fail "$tunnel_service is not active after deployment"

  printf 'deployment=switched\nprevious_release=%s\ncurrent_release=%s\nbackup=%s\n' \
    "$old_release" "$new_release" "$backup"
  curl -fsS http://127.0.0.1:4173/api/health
  printf '\n'
  cleanup_deploy 0
}

case "$action" in
  deploy)
    [[ "$#" -eq 4 ]] || fail 'deploy requires: deploy <full-sha> <archive-sha256> <archive-path>'
    deploy_release "$3" "$4"
    ;;
  confirm)
    [[ "$#" -eq 2 ]] || fail 'confirm requires: confirm <full-sha>'
    confirm_release
    ;;
  rollback)
    [[ "$#" -eq 2 ]] || fail 'rollback requires: rollback <full-sha>'
    rollback_release
    ;;
esac
