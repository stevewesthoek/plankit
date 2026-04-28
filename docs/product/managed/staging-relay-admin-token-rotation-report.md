# BuildFlow Managed Staging Relay Admin Token Rotation Report

## Date
2026-04-28

## Reason
The previous staging `RELAY_ADMIN_TOKEN` had been exposed in transcript/tool output, so the BuildFlow Staging app was rotated to a new secret.

## App Touched
- BuildFlow Staging only
- Dokploy application ID: `enij_FshYINrDID8QGpZX`
- Domain: `buildflow-staging.prochat.tools`

## Rotated Env Var
- `RELAY_ADMIN_TOKEN`

## Proven Facts
- The staging app still uses the managed relay topology.
- The staging app retains the required managed env vars:
  - `NODE_ENV=production`
  - `BUILDFLOW_BACKEND_MODE=relay-agent`
  - `RELAY_ENABLE_DEFAULT_TOKENS=false`
  - `BRIDGE_PORT=3053`
  - `RELAY_DATA_DIR=/var/lib/buildflow`
- The staging app still mounts `/var/lib/buildflow` from the `buildflow-data-staging` volume.
- The staging app still publishes port `3054 -> 3054`.

## Verification Results
- `https://buildflow-staging.prochat.tools/` -> `200`
- `https://buildflow-staging.prochat.tools/api/openapi` -> `200`
- `https://buildflow-staging.prochat.tools/api/admin/devices` with the new admin token -> `200`
- `https://buildflow.prochat.tools/` -> `200`

## Untouched Scope
- BuildFlow Local was not changed.
- Cloudflare was not changed.
- DNS was not changed.
- Tunnels were not changed.
- The non-staging managed app was not changed.

## Secret Handling
- The token value is not included here.
- No bearer strings, API keys, or private keys are recorded in this report.
