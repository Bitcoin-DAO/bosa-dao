#!/bin/bash
# End-to-end tests: a local relay (relay/ under wrangler), a mock chain API, the built app, Playwright.
# Needs: npm install in app/ and relay/, Playwright with Chromium, ffmpeg (camera test).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HERE/.."
RELAY="$APP/../relay"
OUT="$HERE/out"
mkdir -p "$OUT"
node -e '
const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
Object.assign(c, { site: "http://localhost:4173", passkeyDomain: "localhost", relays: ["ws://127.0.0.1:8787"], chainApi: ["http://127.0.0.1:3002/api"] });
require("fs").writeFileSync(process.argv[2], JSON.stringify(c, null, 2));
' "$APP/../config/bosa-dao.testnet4.example.json" "$OUT/dao.test.json"
echo '{}' > "$OUT/funded.json"

(cd "$RELAY" && rm -rf .wrangler && npx wrangler dev --local --port 8787 > "$OUT/relay.log" 2>&1) &
node "$HERE/esplora-mock.mjs" > "$OUT/esplora.log" 2>&1 &
(cd "$APP" && DAO_CONFIG="$OUT/dao.test.json" npx vite build --outDir "$OUT/dist" --emptyOutDir > "$OUT/build.log" 2>&1 && npx vite preview --outDir "$OUT/dist" --port 4173 --strictPort --host localhost > "$OUT/preview.log" 2>&1) &
cleanup() { pkill -P $$ || true; for p in $(ps -eo pid,args | grep -E "workerd|vite preview|esplora-mock" | grep -v grep | awk '{print $1}'); do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT
for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:8787/ && curl -s -o /dev/null http://localhost:4173/ && break; sleep 1; done

node "$HERE/founding.e2e.cjs"
node "$HERE/camera.e2e.cjs"
