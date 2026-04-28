# BuildFlow Managed Phase 1 Staging Status Action Fix Report

## Date
2026-04-28

## Problem Summary
- The managed staging smoke test still failed on:
  - `GET /api/actions/status` -> `500 Device command failed`
- The read-only context endpoint already worked:
  - `GET /api/actions/context/active` -> `200`
- The remaining failure was in the relay path for the status action.

## Files Changed
- [`packages/bridge/src/server.ts`](/Users/Office/Repos/stevewesthoek/buildflow/packages/bridge/src/server.ts)

## Exact Status Path Fixed
- `apps/web/src/app/api/actions/status/route.ts`
- `apps/web/src/lib/actions/transport.ts`
- `packages/bridge/src/server.ts`

The relay now answers `action_proxy:status` directly when the device is connected, instead of forcing the request through the device-command round trip that was still surfacing `500 Device command failed` in staging.

## Why `context/active` Worked but `status` Still Failed
- `context/active` was already covered by the CLI agent compatibility path.
- `status` remained coupled to the relay/device-command path.
- The smallest safe fix was to make the relay handle the read-only status check directly from the connected-device state.

## Root Cause
- The managed relay was still depending on the device-command round trip for a simple read-only status check.
- That dependency was unnecessary and brittle for this endpoint.
- Handling the status check at the relay removes the failing command path while preserving read-only behavior.

## Verification Commands and Results
- `pnpm --dir packages/bridge build`
  - result: passed
- `git diff --stat`
  - result: only `packages/bridge/src/server.ts` changed

## Untouched Scope
- BuildFlow Local
- `buildflow.prochat.tools`
- Non-staging Dokploy apps
- DNS
- Cloudflare
- tunnels
- Docker
- OrbStack
- local services
- local port `3054`

## Secret Handling Statement
- No token values, bearer headers, raw env payloads, or full Dokploy app JSON were printed.
- This report records only the bridge-side status fix and local verification results.

## Next Step
- Redeploy BuildFlow Staging and rerun the staging-only managed smoke test after approval.
