#!/usr/bin/env bash
set -euo pipefail
# Run from the repository root: bash scripts/backup.sh .local/production.env /safe/backups
env_file="${1:?Specify deployment environment file}"
backup_root="${2:?Specify backup destination outside the web root}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="$backup_root/$stamp"
umask 077
mkdir -p "$destination"
compose=(docker compose --env-file "$env_file")
# Stop all writers so the SQL and local-media archive refer to the same content state.
"${compose[@]}" stop gateway web api
trap '"${compose[@]}" start api web gateway >/dev/null' EXIT
"${compose[@]}" exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u"$MYSQL_USER" --single-transaction --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"' | gzip > "$destination/database.sql.gz"
"${compose[@]}" run --rm --no-deps --user root --entrypoint tar api -czf - -C /data media > "$destination/media.tar.gz"
(cd "$destination" && sha256sum database.sql.gz media.tar.gz > SHA256SUMS)
printf 'Saved database and media: %s\n' "$destination"
