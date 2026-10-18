#!/usr/bin/env bash
# One-time (idempotent) Postgres setup for Planit on the portfolio VM.
# Usage (on the VM, as root), with the app password on stdin:
#   printf '%s' "$PASSWORD" | bash setup-postgres.sh
# Postgres listens on localhost only; CI reaches it through an SSH tunnel for migrations.
set -euo pipefail

DB=planit
ROLE=planit
read -r PASSWORD || true  # no trailing newline is fine
[[ ${#PASSWORD} -ge 24 ]] || { echo "password must be at least 24 characters" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
if ! command -v psql >/dev/null; then
  apt-get update -y
  apt-get install -y postgresql
fi

VERSION=$(ls /etc/postgresql | sort -V | tail -1)
CONF_DIR=/etc/postgresql/$VERSION/main/conf.d
install -d "$CONF_DIR"
# Sized for an e2-small (2 GB RAM) shared with two Node apps.
cat > "$CONF_DIR/planit.conf" <<CONF
listen_addresses = 'localhost'
max_connections = 20
shared_buffers = 64MB
effective_cache_size = 256MB
work_mem = 4MB
maintenance_work_mem = 32MB
CONF
systemctl enable postgresql
systemctl restart postgresql

sudo -u postgres psql -v ON_ERROR_STOP=1 -v pw="$PASSWORD" <<SQL
SELECT 'CREATE ROLE $ROLE LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$ROLE')\gexec
ALTER ROLE $ROLE WITH LOGIN PASSWORD :'pw';
SELECT 'CREATE DATABASE $DB OWNER $ROLE' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB')\gexec
SQL

# Daily compressed dump at 03:15, keeping a week.
install -d -o postgres -g postgres -m 700 /var/backups/planit
cat > /etc/cron.d/planit-backup <<'CRON'
15 3 * * * postgres pg_dump -Fc planit > /var/backups/planit/planit-$(date +\%F).dump && find /var/backups/planit -name '*.dump' -mtime +7 -delete
CRON
chmod 644 /etc/cron.d/planit-backup

echo "Postgres $VERSION ready: database $DB, role $ROLE (localhost only)."
