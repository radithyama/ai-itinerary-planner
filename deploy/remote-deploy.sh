#!/usr/bin/env bash
# Activates an uploaded release. Run on the VM as the deploy user by CI:
#   ssh deploy@vm 'bash -s' -- <sha> < deploy/remote-deploy.sh
# Expects /opt/planit/incoming/<sha>.tar.gz and /opt/planit/incoming/<sha>.env.
set -euo pipefail

SHA="${1:?release sha}"
APP_DIR=/opt/planit
RELEASE="$APP_DIR/releases/$SHA"
HEALTH="http://localhost:3001/planit/api/health?deep=1"
KEEP=3

cd "$APP_DIR"
previous=$(readlink -f current || true)

rm -rf "$RELEASE"
mkdir -p "$RELEASE"
tar -xzf "incoming/$SHA.tar.gz" -C "$RELEASE"

[[ -f shared/.env ]] && cp shared/.env shared/.env.prev
install -m 600 "incoming/$SHA.env" shared/.env
rm -f "incoming/$SHA.tar.gz" "incoming/$SHA.env"

ln -sfn "$RELEASE" current.tmp && mv -Tf current.tmp current
sudo /usr/bin/systemctl restart planit

for _ in {1..30}; do
  sleep 2
  body=$(curl -fsS --max-time 5 "$HEALTH" 2>/dev/null || true)
  if [[ "$body" == *'"status":"ok"'* && "$body" == *"\"version\":\"$SHA\""* ]]; then
    echo "Release $SHA is healthy: $body"
    # Prune old releases, never the active one.
    # (grep finds nothing to prune on the first few deploys, so don't let pipefail turn that into a failure)
    ls -1dt releases/*/ | tail -n +$((KEEP + 1)) | { grep -v "$SHA" || true; } | xargs -r rm -rf
    exit 0
  fi
done

echo "Release $SHA failed its health check. Last response: ${body:-<none>}" >&2
sudo /usr/bin/journalctl -u planit -n 40 --no-pager >&2 || true
if [[ -n "$previous" && -d "$previous" ]]; then
  echo "Rolling back to $previous" >&2
  ln -sfn "$previous" current.tmp && mv -Tf current.tmp current
  [[ -f shared/.env.prev ]] && cp shared/.env.prev shared/.env
  sudo /usr/bin/systemctl restart planit
fi
exit 1
