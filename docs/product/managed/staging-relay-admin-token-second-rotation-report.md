# BuildFlow Managed Staging Relay Admin Token Second Rotation Report

## Date
2026-04-28

## Reason
The prior BuildFlow Staging `RELAY_ADMIN_TOKEN` appeared in tool output during runtime verification, so the staging secret was rotated again.

## App Touched
- BuildFlow Staging only
- Dokploy application ID: `enij_FshYINrDID8QGpZX`
- Domain: `buildflow-staging.prochat.tools`

## What Changed
- Only `RELAY_ADMIN_TOKEN` was replaced.
- All other staging env keys were preserved.
- No non-staging Dokploy app was modified.

## Verification Results
- `GET https://buildflow-staging.prochat.tools/` -> `200`
- `GET https://buildflow-staging.prochat.tools/api/openapi` -> `200`
- `GET https://buildflow-staging.prochat.tools/health` -> `200`
- `GET https://buildflow-staging.prochat.tools/ready` -> `200`
- `GET https://buildflow-staging.prochat.tools/api/admin/devices` with the rotated token -> `200`

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

## Secret Handling
- The new token was generated and used only in memory.
- No token values, bearer headers, API keys, or raw Dokploy app JSON are included here.
- The staging env was updated by full env replacement with all existing keys preserved except the rotated admin token.

## Remaining Notes
- This report records the second rotation only.
- No additional infrastructure changes were required.
