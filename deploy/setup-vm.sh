#!/usr/bin/env bash
# One-time (idempotent) setup for Planit on the portfolio VM, next to the existing portfolio.
# Usage (on the VM, as root): bash setup-vm.sh <deploy-public-key-file>
# Expects the portfolio's setup to have run already: Node 22, nginx + TLS, swap, `deploy` user.
set -euo pipefail

PUBKEY_FILE="${1:?path to the CI deploy public key}"
APP_USER=deploy
APP_DIR=/opt/planit
SRC="$(cd "$(dirname "$0")" && pwd)"
NGINX_SITE=/etc/nginx/sites-available/portfolio

id "$APP_USER" >/dev/null
install -d -o "$APP_USER" -g "$APP_USER" -m 755 "$APP_DIR" "$APP_DIR/releases" "$APP_DIR/incoming"
install -d -o "$APP_USER" -g "$APP_USER" -m 700 "$APP_DIR/shared"

# CI key, restricted to running commands (no port forwarding, agent or pty).
KEY="restrict $(cat "$PUBKEY_FILE")"
AUTH=/home/$APP_USER/.ssh/authorized_keys
install -d -m 700 -o "$APP_USER" -g "$APP_USER" /home/$APP_USER/.ssh
touch "$AUTH" && chown "$APP_USER:$APP_USER" "$AUTH" && chmod 600 "$AUTH"
grep -qF "$(awk '{print $2}' "$PUBKEY_FILE")" "$AUTH" || echo "$KEY" >> "$AUTH"

# Let the deploy user restart only this service.
cat > /etc/sudoers.d/planit-deploy <<SUDO
$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart planit, /usr/bin/systemctl status planit *, /usr/bin/journalctl -u planit *
SUDO
chmod 440 /etc/sudoers.d/planit-deploy
visudo -cf /etc/sudoers.d/planit-deploy

install -m 644 "$SRC/planit.service" /etc/systemd/system/planit.service
systemctl daemon-reload
systemctl enable planit   # started by the first deploy, once a release exists

# nginx: add Planit's locations to the portfolio's HTTPS server block.
install -m 644 "$SRC/nginx-planit.conf" /etc/nginx/snippets/planit.conf
install -m 644 "$SRC/nginx-planit-proxy.conf" /etc/nginx/snippets/planit-proxy.conf
if ! grep -q "snippets/planit.conf" "$NGINX_SITE"; then
  cp "$NGINX_SITE" "$NGINX_SITE.bak-$(date +%Y%m%d%H%M%S)"
  # Insert right after the ssl_session_cache line of the 443 server block.
  sed -i '/ssl_session_cache/a\    include snippets/planit.conf;' "$NGINX_SITE"
fi
if nginx -t; then
  systemctl reload nginx
else
  latest=$(ls -t "$NGINX_SITE".bak-* | head -1)
  echo "nginx config test failed, restoring $latest" >&2
  cp "$latest" "$NGINX_SITE"
  nginx -t && systemctl reload nginx
  exit 1
fi
echo "Planit VM setup complete."
