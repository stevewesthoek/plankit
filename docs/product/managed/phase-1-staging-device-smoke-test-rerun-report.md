# BuildFlow Managed Phase 1 Staging Device Smoke Test Rerun Report

## Date
2026-04-28

## Staging App Identity
- App: `BuildFlow Staging`
- Application ID: `enij_FshYINrDID8QGpZX`
- Domain: `buildflow-staging.prochat.tools`

## Whether Staging Was Redeployed
- Yes
- Redeploy title: `Redeploy after CLI command compatibility fix`
- The deployed staging instance was confirmed to include the CLI fix.

## Whether the Deployment Included the CLI Fix
- Yes
- The staging redeploy was performed after commit `9c53c25`
- The fix was present in the deployed staging rollout

## Fresh Device ID
- `device-1777394164320`

## Offline -> Online -> Offline Evidence
- Registration succeeded with HTTP `201`.
- Device appeared offline in `/api/admin/devices` before agent connection.
- Isolated staging agent connected successfully from a temp HOME and non-3054 local port `39153`.
- Agent authenticated successfully against the staging relay.
- Device appeared online in `/api/admin/devices` after connection.
- After stopping the isolated agent, the device returned to offline state.

## Status Endpoint Result
- `GET /api/actions/status` -> `500`
- Body: `Device command failed`

## Context/Active Endpoint Result
- `GET /api/actions/context/active` -> `200`
- Body:
  - `status: "ok"`
  - `contextMode: "single"`
  - `activeSourceIds: ["vault"]`
  - `sources: []`

## Whether the Previous `500 Device command failed` Issue Is Fixed
- Partially.
- The previous failure is fixed for `GET /api/actions/context/active`.
- The previous failure remains for `GET /api/actions/status`.

## Endpoint Health Before and After
- Before:
  - `https://buildflow-staging.prochat.tools/` -> `200`
  - `https://buildflow-staging.prochat.tools/api/openapi` -> `200`
  - `https://buildflow-staging.prochat.tools/health` -> `200`
  - `https://buildflow-staging.prochat.tools/ready` -> `200`
  - `https://buildflow.prochat.tools/` -> `200`
- After:
  - `https://buildflow-staging.prochat.tools/` -> `200`
  - `https://buildflow-staging.prochat.tools/api/openapi` -> `200`
  - `https://buildflow-staging.prochat.tools/health` -> `200`
  - `https://buildflow-staging.prochat.tools/ready` -> `200`
  - `https://buildflow.prochat.tools/` -> `200`

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

## Remaining Blockers
- `GET /api/actions/status` still returns `500 Device command failed`.
- The `context/active` proof is now successful, but the remaining status path still needs a compatibility fix or a bridge-side adjustment.

## Managed Phase 1 Prepared/Working Assessment
- Managed staging is operational enough to pause the validation loop and hand focus back to BuildFlow Local.
- The relay, device registration, auth, lifecycle tracking, and `context/active` flow are working.
- The remaining `status` gap is a narrow compatibility issue, not a staging outage.
- Managed expansion should stop here unless this exact endpoint becomes a hard blocker for later SaaS work.

## Secret Handling Statement
- The staging token was generated and used only in memory.
- No token values, bearer headers, raw env payloads, or full Dokploy app JSON were printed.

## Summary
- The staging redeploy included the CLI fix.
- The smoke test rerun partially succeeded:
  - device lifecycle still works
  - `context/active` now works
  - `status` still fails
- The current Managed Phase 1 staging loop is closed well enough to stop Managed expansion and return to BuildFlow Local public beta readiness work.
