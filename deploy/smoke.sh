#!/usr/bin/env bash
# Smoke-tests a running Planit instance.
# Usage: deploy/smoke.sh <base-url> [expected-version] [--deep]
#   deploy/smoke.sh https://radithyama.site/planit "$GITHUB_SHA" --deep
set -euo pipefail

BASE="${1:?base url required, e.g. https://radithyama.site/planit}"
EXPECTED_VERSION="${2:-}"
DEEP="${3:-}"
fail=0
jar=$(mktemp)
trap 'rm -f "$jar"' EXIT

# Browser-like request: follows redirects (including Clerk's dev-instance handshake) with a cookie jar.
browse() { curl -sL --max-redirs 10 -c "$jar" -b "$jar" --max-time 30 -H "Accept: text/html" "$@"; }

check() { # name, expected-status-regex, path, [expected final-url substring]
  local name="$1" want="$2" path="$3" final="${4:-}"
  local got url
  read -r got url < <(browse -o /dev/null -w '%{http_code} %{url_effective}\n' "$BASE$path" || echo "000 -")
  if [[ "$got" =~ ^($want)$ && ( -z "$final" || "$url" == *"$final"* ) ]]; then
    echo "  ok   $name ($got)"
  else
    echo "  FAIL $name: expected $want${final:+ at *$final*}, got $got at $url"
    fail=1
  fi
}

echo "Smoke testing $BASE"

health=$(curl -fsS --max-time 10 "$BASE/api/health${DEEP:+?deep=1}" || true)
echo "  health: ${health:-<no response>}"
if [[ "$health" != *'"status":"ok"'* ]]; then
  echo "  FAIL health check"
  fail=1
fi
if [[ -n "$EXPECTED_VERSION" && "$health" != *"\"version\":\"$EXPECTED_VERSION\""* ]]; then
  echo "  FAIL expected version $EXPECTED_VERSION"
  fail=1
fi

check "landing page" "200" ""
check "sign-in page" "200" "/sign-in"
check "unknown plan is 404" "404" "/plan/00000000-0000-0000-0000-000000000000"
check "planner redirects to sign-in" "200" "/travel-planner" "sign-in"
check "my trips redirects to sign-in" "200" "/plans" "sign-in"

# The landing page must reference its JS under the base path, and it must load.
asset=$(browse "$BASE" | grep -o '/[a-z/]*_next/static/[^"]*\.js' | head -1 || true)
if [[ -n "$asset" ]]; then
  origin=$(echo "$BASE" | grep -oE '^https?://[^/]+')
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$origin$asset" || echo 000)
  if [[ "$code" == 200 ]]; then echo "  ok   static asset ($code)"; else echo "  FAIL static asset $asset: $code"; fail=1; fi
else
  echo "  FAIL no static assets found in landing page"
  fail=1
fi

if (( fail )); then echo "Smoke test FAILED"; exit 1; fi
echo "Smoke test passed"
