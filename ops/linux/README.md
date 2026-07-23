# Linux ECS operations

These files run one authoritative Interview Margin process behind a local Nginx
proxy. They deliberately refuse to start with a missing or empty database.

## Fixed layout

- Code: `/opt/interview-margin/current`
- Database: `/var/lib/interview-margin/data/interview.db`
- Backups: `/var/lib/interview-margin/backups`
- Environment: `/etc/interview-margin/app.env`
- Upstream: `127.0.0.1:4173`
- Service user: `interview-margin`

Use one Node process and a local block filesystem such as ext4 or XFS. Do not put
SQLite WAL files on NAS/NFS, run a PM2 cluster, or start a second ECS writer.

## Provision once

Install Node.js 22.15 or newer, Nginx, and build tools for native-module fallback.
Install dependencies on Linux with `npm ci --include=optional`; never copy
`node_modules` from Windows.

```bash
sudo useradd --system --home-dir /var/lib/interview-margin --shell /usr/sbin/nologin interview-margin
sudo install -d -o interview-margin -g interview-margin -m 0700 /var/lib/interview-margin/data
sudo install -d -o interview-margin -g interview-margin -m 0700 /var/lib/interview-margin/backups
sudo install -d -o root -g interview-margin -m 0750 /etc/interview-margin
sudo install -o root -g interview-margin -m 0640 app.env /etc/interview-margin/app.env
```

`app.env` must contain at least:

```dotenv
HOST=127.0.0.1
PORT=4173
APP_ORIGINS=https://interview.example.com,https://interview-margin.vercel.app
BOOTSTRAP_ADMIN_USERNAME=admin
# Configure OPENAI_API_KEY/OPENAI_MODEL or a server-side AI_FALLBACK_URL as needed.
```

Restore an online-consistent SQLite backup before the first service start. Keep
the service stopped while replacing the database and restrict the file to the
service user:

```bash
sudo install -o interview-margin -g interview-margin -m 0600 /secure/path/interview-backup.db \
  /var/lib/interview-margin/data/interview.db
```

The application currently resolves `data/` and `backups/` from its working
directory. Every release must therefore expose the persistent directories as
symlinks. Run these only when those release paths do not already exist:

```bash
sudo ln -s /var/lib/interview-margin/data /opt/interview-margin/current/data
sudo ln -s /var/lib/interview-margin/backups /opt/interview-margin/current/backups
```

Build the release before starting it:

```bash
cd /opt/interview-margin/current
npm ci --include=optional
npm test
npm run db:check
npm run build
sudo -u interview-margin /usr/bin/bash ops/linux/db-preflight.sh app
```

## systemd

```bash
sudo install -m 0644 ops/linux/interview-margin.service /etc/systemd/system/
sudo install -m 0644 ops/linux/interview-margin-backup.service /etc/systemd/system/
sudo install -m 0644 ops/linux/interview-margin-backup.timer /etc/systemd/system/
sudo systemd-analyze verify /etc/systemd/system/interview-margin.service \
  /etc/systemd/system/interview-margin-backup.service \
  /etc/systemd/system/interview-margin-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now interview-margin.service
sudo systemctl enable --now interview-margin-backup.timer
```

For a remotely managed Cloudflare Tunnel, install the official `cloudflared`
package, create a dedicated `cloudflared` system user, and put the connector
token in `/etc/cloudflared/interview-margin.token` with owner
`root:cloudflared` and mode `0640`. Install
`cloudflared-interview-margin.service`, but start it only after the old writer
has been stopped and the final SQLite backup has been restored:

```bash
sudo install -m 0644 ops/linux/cloudflared-interview-margin.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-interview-margin.service
```

Cloudflare Universal SSL provides and renews the public certificate for the
proxied hostname. The tunnel connects outbound from the ECS, so the application
and port 4173 remain private.

The timer runs an online SQLite backup around 03:00 and retains the newest 30
local files. Local retention is not disaster recovery; copy backups encrypted to
another disk or OSS and perform a restore drill. `server/backup.js` opens the
database through the current release and can apply that release's migrations and
seed updates, so create the pre-deployment safety backup with the old release.

## Nginx / BaoTa

Edit `nginx-interview-margin.conf`: replace the domain, certificate paths, and
optionally log paths. On Debian/Ubuntu it can be installed through
`sites-available`; in BaoTa/aaPanel use the panel-owned vhost file under
`/www/server/panel/vhost/nginx/` and merge the proxy `location` into the existing
SSL server block instead of duplicating panel certificate directives.

Preserve `Host` and `X-Forwarded-Proto`; the application uses them to validate
write-request origins and issue Secure cookies. Keep port 4173 on loopback and do
not open it in the ECS security group. If Cloudflare is in front of Nginx,
configure Nginx real-IP trust from Cloudflare's published ranges and verify that
rate limits see the visitor IP rather than one shared Cloudflare IP.

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -fsS http://127.0.0.1:4173/api/health
curl -fsSI http://127.0.0.1:4173/
curl -fsS https://interview.example.com/api/health
ss -lntp | grep 4173
pgrep -af 'node server/index.js'  # exactly one process
```

Inspect failures with:

```bash
journalctl -u interview-margin.service -n 200 --no-pager
journalctl -u interview-margin-backup.service -n 200 --no-pager
systemctl list-timers --all | grep interview-margin
```
