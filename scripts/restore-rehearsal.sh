#!/usr/bin/env bash
set -euo pipefail
# Restore into a NEW isolated Compose project, never into the running site's volumes.
env_file="${1:?Specify deployment environment file}"
backup_dir="$(cd "${2:?Specify backup directory}" && pwd)"
recovery_project="${3:?Specify a new recovery-* project name}"
[[ "$recovery_project" =~ ^recovery-[a-z0-9-]+$ ]] || { echo 'Project name must start with recovery-'; exit 1; }
if docker volume inspect "${recovery_project}_mysql_data" >/dev/null 2>&1; then
  echo 'Recovery database volume already exists. Choose another project name.'; exit 1
fi
(cd "$backup_dir" && sha256sum -c SHA256SUMS)
compose=(docker compose -p "$recovery_project" --env-file "$env_file")
"${compose[@]}" up -d --wait mysql
gzip -dc "$backup_dir/database.sql.gz" | "${compose[@]}" exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"'
"${compose[@]}" run --rm --no-deps --user root -v "$backup_dir/media.tar.gz:/tmp/restore-media.tar.gz:ro" --entrypoint sh api -c 'tar -xzf /tmp/restore-media.tar.gz -C /data && chown -R node:node /data/media'
"${compose[@]}" run --rm --no-deps api pnpm db:migrate
printf 'Restored into isolated project %s. Production volumes were not changed.\n' "$recovery_project"
