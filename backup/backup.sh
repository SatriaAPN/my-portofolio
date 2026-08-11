#!/bin/sh
# Consistent SQLite snapshot -> gzip -> upload to Google Drive via rclone.
#
# Safe to run while the backend is actively writing: `.backup` uses SQLite's
# online-backup API, which produces a consistent single-file snapshot even
# under WAL-mode concurrent writes. A plain `cp portfolio.db` would NOT be safe
# here — it skips the -wal sidecar and can capture a torn/stale state.
set -eu

DB_PATH="${DB_PATH:-/data/portfolio.db}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
GDRIVE_DIR="${GDRIVE_DIR:-portfolio-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

if [ ! -f "${DB_PATH}" ]; then
  echo "[backup] ERROR: database not found at ${DB_PATH}" >&2
  exit 1
fi

ts="$(date +%Y%m%d-%H%M%S)"
snap="/tmp/portfolio-${ts}.db"
gz="${snap}.gz"
# Best-effort cleanup of the local temp copies no matter how we exit.
trap 'rm -f "${snap}" "${gz}"' EXIT

echo "[backup] snapshotting ${DB_PATH} -> ${snap}"
sqlite3 "${DB_PATH}" ".backup '${snap}'"

echo "[backup] verifying snapshot integrity"
if ! sqlite3 "${snap}" "PRAGMA integrity_check;" | grep -q '^ok$'; then
  echo "[backup] ERROR: integrity check failed; aborting (nothing uploaded)" >&2
  exit 1
fi

echo "[backup] gzipping"
gzip "${snap}"   # -> ${gz}

dest="${RCLONE_REMOTE}:${GDRIVE_DIR}/portfolio-${ts}.db.gz"
echo "[backup] uploading -> ${dest}"
rclone copyto "${gz}" "${dest}"

echo "[backup] pruning ${RCLONE_REMOTE}:${GDRIVE_DIR} copies older than ${RETENTION_DAYS}d"
# Non-fatal: the upload already succeeded, so a prune hiccup shouldn't fail the run.
rclone delete "${RCLONE_REMOTE}:${GDRIVE_DIR}" --min-age "${RETENTION_DAYS}d" || \
  echo "[backup] WARN: prune step failed (upload is safe)" >&2

echo "[backup] done"
