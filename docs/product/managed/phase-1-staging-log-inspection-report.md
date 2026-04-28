# BuildFlow Managed Phase 1 Staging Log Inspection Report

## Date
2026-04-28

## Proven Facts
- Scope was limited to the Dokploy BuildFlow Staging app only.
- App name: `BuildFlow Staging`
- Application ID: `enij_FshYINrDID8QGpZX`
- Domain: `buildflow-staging.prochat.tools`
- BuildFlow Local was not touched.
- No Dokploy config was mutated.
- No deployment, redeploy, restart, stop, or start action was triggered.

## Log Inspection Findings
- Latest deployment status: `done`
- Latest deployment title: `Staging admin token rotation`
- Service logs show the full startup chain:
  - proxy startup on `3054`
  - relay startup on `3053`
  - web startup on `3055`
- Service logs show the relay startup details:
  - data directory readiness for `/var/lib/buildflow`
  - admin endpoint authentication enabled
  - relay HTTP endpoint on `localhost:3053`
  - relay WebSocket endpoint on `ws://localhost:3053`
  - health and ready endpoints exposed on the relay
- Service logs show the web startup details:
  - Next.js/web startup on `3055`
  - ready in a few hundred milliseconds
- Service logs show the proxy startup details:
  - proxy listening on `0.0.0.0:3054`
  - production topology ready
- Service logs also include a clean shutdown/restart sequence from an earlier rollout cycle:
  - SIGTERM received
  - relay stopped
  - web stopped
  - shutdown completed
- No unhandled exceptions, crashes, or repeated restart loops were seen in the sampled service logs.
- No `/ready` or `/health` failures were seen in the sampled startup logs.
- No auth failure was seen after the second token rotation in the sampled logs.

## Endpoint Verification
- `GET https://buildflow-staging.prochat.tools/` -> `200`
- `GET https://buildflow-staging.prochat.tools/api/openapi` -> `200`
- `GET https://buildflow-staging.prochat.tools/health` -> `200`
- `GET https://buildflow-staging.prochat.tools/ready` -> `200`
- `GET https://buildflow-staging.prochat.tools/api/admin/devices` -> `200`
- `GET https://buildflow-staging.prochat.tools/api/admin/requests` -> `200`

## Whether Any Crash, Restart, or Auth Issues Were Found
- Crash issues: none found in the sampled runtime logs
- Restart issues: a clean shutdown/restart cycle was observed, but not a failure loop
- Auth issues: none found after the second token rotation

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

## Remaining Blockers
- This pass did not exercise a live managed device registration or routed action path.
- Log coverage is read-only and sampled; it does not replace a real device smoke test.

## Recommended Next Step
- **A) staging-only managed device smoke test**

## Secret Handling
- No token values, bearer headers, raw env payloads, or raw Dokploy app JSON are included here.
- Only safe status and startup facts are recorded.
