#!/bin/bash
set -euo pipefail

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [ -n "$pids" ]; then
    kill $pids || true
  fi
}

kill_port 3052
kill_port 3053
kill_port 3054

rm -rf apps/web/.next

pnpm --dir packages/cli build
pnpm --dir apps/web build

pnpm --dir packages/cli dev serve >/tmp/buildflow-cli.log 2>&1 &
CLI_PID=$!
pnpm --dir apps/web start >/tmp/buildflow-web.log 2>&1 &
WEB_PID=$!

cleanup() {
  kill "$CLI_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3052/health >/dev/null && curl -sf http://127.0.0.1:3054/api/openapi >/dev/null; then
    break
  fi
  sleep 1
done

echo "3052:"
lsof -nP -iTCP:3052 -sTCP:LISTEN || true
echo "3053:"
lsof -nP -iTCP:3053 -sTCP:LISTEN || true
echo "3054:"
lsof -nP -iTCP:3054 -sTCP:LISTEN || true
