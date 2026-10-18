#!/usr/bin/env bash
# One-time (idempotent) setup for Planit on the portfolio VM, next to the existing portfolio.
# Serves https://planit.radithyama.site (DNS A record -> VM) and redirects radithyama.site/planit.
# Usage (on the VM, as root): bash setup-vm.sh <deploy-public-key-file>
# Expects the portfolio's setup to have run already: Node 22, nginx + TLS, swap, `deploy` user.
set -euo pipefail

PUBKEY_FILE="${1:?path to the CI deploy public key}"
APP_USER=deploy
APP_DIR=/opt/planit
SRC="$(cd "$(dirname "$0")" && pwd)"
NGINX_SITE=/etc/nginx/sites-available/portfolio
DOMAIN=planit.radithyama.site
SITE=/etc/nginx/sites-available/planit

id "$APP_USER" >/dev/null
install -d -o "$APP_USER" -g "$APP_USER" -m 755 "$APP_DIR" "$APP_DIR/releases" "$APP_DIR/incoming"
install -d -o "$APP_USER" -g "$APP_USER" -m 700 "$APP_DIR/shared"

# CI key: commands plus a tunnel to local Postgres only (for migrations); no other
# forwarding, agent or pty. Re-running replaces the key's line so options stay current.
KEY_BODY=$(awk '{print $2}' "$PUBKEY_FILE")
[[ "$KEY_BODY" == AAAA* ]] || { echo "not an SSH public key: $PUBKEY_FILE" >&2; exit 1; }
KEY="restrict,port-forwarding,permitopen=\"127.0.0.1:5432\" $(cat "$PUBKEY_FILE")"
AUTH=/home/$APP_USER/.ssh/authorized_keys
install -d -m 700 -o "$APP_USER" -g "$APP_USER" /home/$APP_USER/.ssh
touch "$AUTH" && chown "$APP_USER:$APP_USER" "$AUTH" && chmod 600 "$AUTH"
grep -vF "$KEY_BODY" "$AUTH" > "$AUTH.tmp" || true
echo "$KEY" >> "$AUTH.tmp"
install -m 600 -o "$APP_USER" -g "$APP_USER" "$AUTH.tmp" "$AUTH" && rm -f "$AUTH.tmp"

# Let the deploy user restart only this service.
cat > /etc/sudoers.d/planit-deploy <<SUDO
$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart planit, /usr/bin/systemctl status planit *, /usr/bin/journalctl -u planit *
SUDO
chmod 440 /etc/sudoers.d/planit-deploy
visudo -cf /etc/sudoers.d/planit-deploy

install -m 644 "$SRC/planit.service" /etc/systemd/system/planit.service
systemctl daemon-reload
systemctl enable planit   # started by the first deploy, once a release exists

# nginx: Planit gets its own server block on planit.radithyama.site.
reload_nginx_or_restore() { # restores the given backups if the new config doesn't pass nginx -t
  if nginx -t; then
    systemctl reload nginx
  else
    echo "nginx config test failed, restoring previous config" >&2
    for f in "$@"; do
      if [[ -f "$f.bak" ]]; then
        mv "$f.bak" "$f"
      elif [[ "$f" == "$SITE" ]]; then
        rm -f "$SITE" /etc/nginx/sites-enabled/planit   # brand-new Planit site: just drop it
      fi                                                # never delete anything else
    done
    nginx -t && systemctl reload nginx
    exit 1
  fi
}

install -m 644 "$SRC/nginx-planit-proxy.conf" /etc/nginx/snippets/planit-proxy.conf
install -d -m 755 /var/www/letsencrypt

# 1. Certificate. Port 80 only first, then a webroot challenge so nginx (and the
#    portfolio) never stops. Renewals reuse the webroot through certbot's timer.
if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  [[ -f "$SITE" ]] && cp "$SITE" "$SITE.bak"
  install -m 644 "$SRC/nginx-planit-http.conf" "$SITE"
  ln -sf "$SITE" /etc/nginx/sites-enabled/planit
  reload_nginx_or_restore "$SITE"
  certbot certonly --webroot -w /var/www/letsencrypt -d "$DOMAIN" --non-interactive \
    --deploy-hook "systemctl reload nginx"
fi

# 2. Full site (HTTP redirect + HTTPS proxy).
[[ -f "$SITE" ]] && cp "$SITE" "$SITE.bak"
install -m 644 "$SRC/nginx-planit-site.conf" "$SITE"
ln -sf "$SITE" /etc/nginx/sites-enabled/planit

# 3. Old radithyama.site/planit links redirect to the subdomain. The portfolio's
#    HTTPS block includes snippets/planit.conf (added on first setup).
cp /etc/nginx/snippets/planit.conf /etc/nginx/snippets/planit.conf.bak 2>/dev/null || true
install -m 644 "$SRC/nginx-planit-redirect.conf" /etc/nginx/snippets/planit.conf
if ! grep -q "snippets/planit.conf" "$NGINX_SITE"; then
  cp "$NGINX_SITE" "$NGINX_SITE.bak"
  sed -i '/ssl_session_cache/a\    include snippets/planit.conf;' "$NGINX_SITE"
fi
reload_nginx_or_restore "$SITE" /etc/nginx/snippets/planit.conf "$NGINX_SITE"
rm -f "$SITE.bak" /etc/nginx/snippets/planit.conf.bak "$NGINX_SITE.bak"

echo "Planit VM setup complete."
