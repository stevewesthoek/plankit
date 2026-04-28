# BuildFlow Managed Phase 1 Staging Device Smoke Test Report

## Date
2026-04-28

## Scope
- Staging only
- App: BuildFlow Staging
- Application ID: `enij_FshYINrDID8QGpZX`
- Domain: `buildflow-staging.prochat.tools`
- BuildFlow Local was not touched.

## Fresh Staging Token
- Redacted
- Generated in memory only for this smoke test

## Device ID
- `device-1777393389937`

## Offline -> Online -> Offline/Disconnected Evidence
- Registration succeeded with HTTP `201`.
- Device appeared offline in `/api/admin/devices` immediately after registration.
- Isolated staging agent connected successfully from a temp HOME and non-3054 local port `39152`.
- Agent authenticated successfully against the staging relay.
- Device appeared online in `/api/admin/devices` after connection.
- After stopping the isolated agent, the device returned to offline state.

## Read-Only Action Results
- `GET /api/actions/status` -> `500`
  - body: `Device command failed`
- `GET /api/actions/context/active` -> `500`
  - body: `Device command failed`

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

## Any Blockers or Unexpected Behavior
- Unexpected behavior: the read-only action checks returned `500 Device command failed`.
- The staging relay itself remained healthy and the device lifecycle behaved as expected.
- The action routing proof is therefore incomplete and should be revisited with a command path the staging agent explicitly supports.

## Secret Handling Statement
- The staging token was generated and used only in memory.
- No token values, bearer headers, raw env payloads, or full Dokploy app JSON were printed.

## Summary
- The staging-only device smoke test succeeded for registration, connection, and lifecycle observation.
- The read-only action probes did not succeed and remain the only unresolved piece.
