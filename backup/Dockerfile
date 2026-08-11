# syntax=docker/dockerfile:1

# One-shot "snapshot the SQLite DB and ship it to Google Drive" image.
# Bundles the two CLIs the backup script needs: sqlite3 (for a consistent
# online backup) and rclone (for the gdrive upload). Deliberately tiny — this
# container runs, does its job, and exits.
FROM alpine:3.20

# sqlite  -> provides the `sqlite3` CLI (the `.backup` online-backup command)
# rclone  -> Google Drive upload + retention pruning
# tzdata  -> so the TZ env var produces correct local timestamps in filenames
RUN apk add --no-cache sqlite rclone tzdata

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# rclone reads its remote definitions + OAuth token from here. The path is
# backed by a Docker volume (see docker-compose.yml) so the one-time gdrive
# authorization survives container restarts and redeploys.
ENV RCLONE_CONFIG=/config/rclone/rclone.conf

ENTRYPOINT ["/usr/local/bin/backup.sh"]
