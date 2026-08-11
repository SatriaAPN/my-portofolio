# Database backups → Google Drive

Nightly, consistent snapshots of the SQLite database (`portfolio.db`) pushed to
Google Drive with [rclone].

## How it works

- A tiny one-shot image (`backup/`) bundles `sqlite3` + `rclone`.
- It's declared in `docker-compose.yml` as the `backup` service under the
  `backup` **profile**, so `docker compose up -d` never starts it.
- On each run it: takes a consistent snapshot via SQLite's online-backup API
  (`.backup` — safe under WAL writes), runs `PRAGMA integrity_check`, gzips it,
  uploads to `gdrive:portfolio-backups/portfolio-<timestamp>.db.gz`, then prunes
  remote copies older than `RETENTION_DAYS`.
- The gdrive OAuth token lives in the `rclone-config` Docker volume — set up
  once, reused forever. It is never committed to git.

Config knobs (in the `backup` service `environment:` block): `RCLONE_REMOTE`,
`GDRIVE_DIR`, `RETENTION_DAYS`, `TZ`.

## One-time setup on the VPS

Run these once, after the first deploy that includes the `backup` image.

### 1. Authorize Google Drive

The VPS is headless, so use rclone's remote-authorize flow:

```bash
cd ~/portfolio
docker compose --profile backup run --rm --entrypoint rclone backup config
```

In the prompts:
- `n` (new remote), name it **`gdrive`** (must match `RCLONE_REMOTE`).
- Storage: choose **`drive`** (Google Drive).
- Leave `client_id` / `client_secret` blank (fine for personal use).
- Scope: `1` (full access) or `2` (drive.file — only files rclone creates).
- When asked **"Use web browser to automatically authenticate?"** answer **`n`**
  (no browser on the server). rclone prints a command like
  `rclone authorize "drive"` — run **that** on your laptop (which has rclone +
  a browser), complete the Google login, and paste the token back into the
  server prompt.
- Confirm, then quit the config menu.

Verify:

```bash
docker compose --profile backup run --rm --entrypoint rclone backup lsd gdrive:
```

### 2. Add the nightly cron (host, not a container)

```bash
crontab -e
```

Add (runs at host-local midnight; logs to a file you can tail):

```cron
0 0 * * * cd ~/portfolio && docker compose --profile backup run --rm backup >> ~/portfolio-backup.log 2>&1
```

## Manual run / restore

Run a backup now:

```bash
cd ~/portfolio && docker compose --profile backup run --rm backup
```

Restore a snapshot (stop the backend first so nothing writes mid-restore):

```bash
cd ~/portfolio
docker compose --profile backup run --rm --entrypoint rclone backup \
  copyto gdrive:portfolio-backups/portfolio-YYYYmmdd-HHMMSS.db.gz /data/restore.db.gz
docker compose stop backend
# gunzip the restored file over the live DB inside the volume, then:
docker compose up -d backend
```

[rclone]: https://rclone.org/drive/
