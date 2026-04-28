# BuildFlow Local No-Docker Verification Mode Implementation Report

## Date
2026-04-28

## Summary
A minimal dashboard-only verification command was added for throwaway-clone Local beta checks without starting the relay through Docker.

## Files changed
- `package.json`
- `scripts/verify-dashboard.mjs`
- `README.md`
- `docs/product/beta-release-gate.md`

## New command
- `pnpm local:verify:dashboard-only`

## Behavior
- Uses `LOCAL_DASHBOARD_BASE_URL`, defaulting to `http://127.0.0.1:${WEB_PORT:-3054}`
- Does not start the relay
- Does not touch Docker or OrbStack
- Verifies:
  - `GET /api/openapi`
  - `GET /dashboard`
- Leaves the default public beta path unchanged

## What it proves
- The dashboard is reachable on an alternate throwaway-clone port
- The dashboard OpenAPI surface responds
- The command can be used without the relay startup path

## What it does not prove
- Relay behavior
- Managed/Dokploy behavior
- Device registration or relay-agent routing
- Any change to the default `3052/3053/3054` public beta path

## Verification performed
- Package script inspection
- Source inspection only

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

## Secret handling
- No secrets, bearer tokens, raw env values, or full config files were printed.
