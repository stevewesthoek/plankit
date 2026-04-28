# BuildFlow Local Dashboard-Only Throwaway-Clone Verification Report

## Date
2026-04-28

## Scope
Verify the no-Docker dashboard-only Local beta path in a throwaway clone without touching the current BuildFlow Local runtime on port `3054`.

## Commands run
- `pwd`
- `git rev-parse --show-toplevel`
- `git status --short`
- `git log --oneline -3`
- `lsof -nP -iTCP:3054 -sTCP:LISTEN || true`
- `lsof -nP -iTCP:3154 -sTCP:LISTEN || true`
- `git clone /Users/Office/Repos/stevewesthoek/buildflow /tmp/buildflow-local-beta-dashboard-only`
- `pnpm install` in `/tmp/buildflow-local-beta-dashboard-only`
- `env PORT=3154 pnpm --dir /tmp/buildflow-local-beta-dashboard-only/apps/web dev`
- `curl -i -sS http://127.0.0.1:3154/api/openapi`
- `curl -i -sS http://127.0.0.1:3154/dashboard`
- `LOCAL_DASHBOARD_BASE_URL=http://127.0.0.1:3154 WEB_PORT=3154 pnpm local:verify:dashboard-only`

## Ports used
- Existing Local runtime: `3054`
- Throwaway dashboard port: `3154`

## Port isolation result
- `3154` was free before the throwaway clone start.
- `3054` remained occupied by the existing Local runtime during the test.
- `3154` was used only by the throwaway clone dashboard process.

## Verification result
- Dashboard-only verification passed.
- `GET /api/openapi` on `3154` returned `200`.
- `GET /dashboard` on `3154` returned `200`.
- The dashboard-only verifier reported success.

## What this proved
- A throwaway clone can verify the Local dashboard on an alternate port without touching the current runtime.
- The no-Docker dashboard-only command works with `WEB_PORT=3154` and `LOCAL_DASHBOARD_BASE_URL=http://127.0.0.1:3154`.

## What this did not prove
- Relay startup
- Full relay-agent routing
- Managed/Dokploy behavior
- Docker or OrbStack behavior

## Untouched scope
- Current BuildFlow Local runtime
- Managed
- Dokploy
- DNS
- Cloudflare
- tunnels
- `buildflow.prochat.tools`
- Docker
- OrbStack

## Blockers
- None for dashboard-only verification.
- Full no-Docker relay verification remains a separate future task.

## Secret handling
- No secrets, bearer tokens, raw env values, or full config files were printed.
