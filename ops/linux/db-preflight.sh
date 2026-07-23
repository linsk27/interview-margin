#!/usr/bin/env bash

set -Eeuo pipefail

MODE="${1:-app}"
APP_ROOT="${IM_APP_ROOT:-/opt/interview-margin/current}"
STATE_ROOT="${IM_STATE_ROOT:-/var/lib/interview-margin}"
DATA_DIR="${IM_DATA_DIR:-${STATE_ROOT}/data}"
BACKUP_DIR="${IM_BACKUP_DIR:-${STATE_ROOT}/backups}"
DB_PATH="${IM_DB_PATH:-${DATA_DIR}/interview.db}"
ENV_FILE="${IM_ENV_FILE:-/etc/interview-margin/app.env}"
APP_USER="${IM_APP_USER:-interview-margin}"

log() {
  printf '[interview-margin preflight] %s\n' "$*"
}

fail() {
  printf '[interview-margin preflight] ERROR: %s\n' "$*" >&2
  exit 1
}

require_file() {
  [[ -s "$1" ]] || fail "required file is missing or empty: $1"
}

require_directory() {
  [[ -d "$1" ]] || fail "required directory is missing: $1"
}

require_private_mode() {
  local target="$1"
  local mode
  mode="$(stat -c '%a' -- "$target")"
  local other_digit="${mode: -1}"
  [[ "$other_digit" == "0" ]] || fail "$target is accessible by other users (mode $mode)"
}

env_value() {
  local key="$1"
  local line value
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE" | tail -n 1 || true)"
  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  if [[ ${#value} -ge 2 ]]; then
    if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi
  printf '%s' "$value"
}

require_link_target() {
  local link_path="$1"
  local expected_target="$2"
  [[ -L "$link_path" ]] || fail "$link_path must be a symlink to persistent storage"
  local actual expected
  actual="$(readlink -f -- "$link_path")"
  expected="$(readlink -f -- "$expected_target")"
  [[ "$actual" == "$expected" ]] || fail "$link_path resolves to $actual instead of $expected"
}

case "$MODE" in
  app|backup) ;;
  *) fail "usage: db-preflight.sh [app|backup]" ;;
esac

[[ "$(id -un)" == "$APP_USER" ]] || fail "run as $APP_USER, not $(id -un)"
require_directory "$APP_ROOT"
require_directory "$DATA_DIR"
require_directory "$BACKUP_DIR"
require_file "$ENV_FILE"
require_private_mode "$ENV_FILE"
env_mode="$(stat -c '%a' -- "$ENV_FILE")"
case "$env_mode" in
  600|640) ;;
  *) fail "$ENV_FILE must use mode 600 or 640, not $env_mode" ;;
esac

cd "$APP_ROOT"
require_file package.json
require_file server/index.js
require_file server/backup.js
require_file public/interview.md
if [[ "$MODE" == "app" ]]; then
  require_file dist/index.html
  require_file dist/catalog.json
fi

require_link_target "$APP_ROOT/data" "$DATA_DIR"
require_link_target "$APP_ROOT/backups" "$BACKUP_DIR"
require_file "$DB_PATH"
[[ ! -L "$DB_PATH" ]] || fail "$DB_PATH must be a regular file, not another symlink"

[[ -r "$DB_PATH" && -w "$DB_PATH" ]] || fail "$APP_USER needs read/write access to $DB_PATH"
[[ -r "$DATA_DIR" && -w "$DATA_DIR" && -x "$DATA_DIR" ]] || fail "$APP_USER needs rwx access to $DATA_DIR"
[[ -r "$BACKUP_DIR" && -w "$BACKUP_DIR" && -x "$BACKUP_DIR" ]] || fail "$APP_USER needs rwx access to $BACKUP_DIR"
require_private_mode "$DATA_DIR"
require_private_mode "$BACKUP_DIR"
require_private_mode "$DB_PATH"

data_fs="$(stat -f -c '%T' -- "$DATA_DIR")"
case "$data_fs" in
  nfs*|cifs|smb*|fuse.sshfs|fuse.s3fs)
    fail "SQLite WAL storage must not use a network filesystem ($data_fs)"
    ;;
esac
log "persistent data filesystem: $data_fs"

host="$(env_value HOST)"
port="$(env_value PORT)"
origins="$(env_value APP_ORIGINS)"
[[ "$host" == "127.0.0.1" ]] || fail "HOST must be 127.0.0.1 behind the local reverse proxy"
[[ "$port" == "4173" ]] || fail "PORT must be 4173 for the supplied Nginx and systemd templates"
[[ "$origins" == *"https://"* ]] || fail "APP_ORIGINS must contain the final HTTPS site origin"
[[ "$origins" != *"*"* ]] || fail "APP_ORIGINS must not contain a wildcard"

NODE_BIN="$(command -v node || true)"
[[ -n "$NODE_BIN" ]] || fail "node was not found on PATH"

node_version="$($NODE_BIN -p 'process.versions.node')"
node_major="${node_version%%.*}"
node_rest="${node_version#*.}"
node_minor="${node_rest%%.*}"
if ! { [[ "$node_major" == "20" && "$node_minor" -ge 19 ]] || [[ "$node_major" -ge 22 ]]; }; then
  fail "Node.js $node_version is unsupported; use Node.js 22.15 or newer"
fi
if [[ "$node_major" == "22" && "$node_minor" -lt 12 ]]; then
  fail "Node.js $node_version is unsupported; Vite requires Node.js 22.12 or newer"
fi

DB_PATH="$DB_PATH" "$NODE_BIN" --input-type=module <<'NODE'
import { Algorithm, hashSync, verifySync } from '@node-rs/argon2'
import Database from 'better-sqlite3'

const filename = process.env.DB_PATH
const db = new Database(filename, { readonly: true, fileMustExist: true })

try {
  const integrityCheck = db.pragma('integrity_check')
  if (integrityCheck.length !== 1 || integrityCheck[0].integrity_check !== 'ok') {
    throw new Error(`SQLite integrity_check failed: ${JSON.stringify(integrityCheck)}`)
  }

  const foreignKeyErrors = db.pragma('foreign_key_check')
  if (foreignKeyErrors.length) {
    throw new Error(`SQLite foreign_key_check failed: ${JSON.stringify(foreignKeyErrors.slice(0, 10))}`)
  }

  const users = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
  const questions = db.prepare('SELECT COUNT(*) AS count FROM questions WHERE archived_at IS NULL').get().count
  if (users < 1 || questions < 1) {
    throw new Error(`refusing an empty database (users=${users}, questions=${questions})`)
  }

  console.log(`[interview-margin preflight] SQLite ok (users=${users}, activeQuestions=${questions})`)
} finally {
  db.close()
}

const probe = 'interview-margin-native-probe'
const encoded = hashSync(probe, {
  algorithm: Algorithm.Argon2id,
  memoryCost: 8192,
  timeCost: 1,
  parallelism: 1,
  outputLen: 16,
})
if (!verifySync(encoded, probe)) throw new Error('Argon2 native verification failed')
console.log('[interview-margin preflight] better-sqlite3 and Argon2 native modules ok')
NODE

log "$MODE preflight passed for $DB_PATH"
