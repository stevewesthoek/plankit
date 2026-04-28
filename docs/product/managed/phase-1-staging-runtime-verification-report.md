# BuildFlow Managed Phase 1 Staging Runtime Verification Report

## Date
2026-04-28

## Scope
- Verified only the Dokploy BuildFlow Staging app.
- Application ID: `enij_FshYINrDID8QGpZX`
- Domain: `buildflow-staging.prochat.tools`
- BuildFlow Local was not modified.
- No DNS, Cloudflare, tunnel, or non-staging Dokploy changes were made.

## Intended Phase 1 Criteria
- Managed staging uses relay-agent mode.
- Public domain is `buildflow-staging.prochat.tools`.
- Public proxy listens on port `3054`.
- Internal relay uses port `3053`.
- Internal web app uses port `3055`.
- Persistent data is mounted at `/var/lib/buildflow`.
- Required env keys are present:
  - `NODE_ENV`
  - `BUILDFLOW_BACKEND_MODE`
  - `RELAY_ENABLE_DEFAULT_TOKENS`
  - `BRIDGE_PORT`
  - `RELAY_DATA_DIR`
  - `RELAY_ADMIN_TOKEN`

## Dokploy App Verification
- App name: `BuildFlow Staging`
- Application ID matched: `enij_FshYINrDID8QGpZX`
- Status: `done`
- Domain includes `buildflow-staging.prochat.tools`
- Domain port mapping includes `3054 -> 3054`
- Mount includes `/var/lib/buildflow`
- Required env keys are present in the app config

## Public Endpoint Verification
- `GET https://buildflow-staging.prochat.tools/` -> `200`
- `GET https://buildflow-staging.prochat.tools/api/openapi` -> `200`
- `GET https://buildflow-staging.prochat.tools/health` -> `200`
- `GET https://buildflow-staging.prochat.tools/ready` -> `200`

## Admin Endpoint Verification
- `GET https://buildflow-staging.prochat.tools/api/admin/devices` -> `200`
- `GET https://buildflow-staging.prochat.tools/api/admin/requests` -> `200`
- Safe counts observed:
  - devices: `1`
  - requests: `4`

## Optional Device Smoke Test
- Not performed.
- Reason: the requested registration step would mutate staging state, so it was skipped to keep this pass read-only.

## Proven Facts
- The staging app is healthy and reachable.
- The staging app is configured for managed relay mode.
- The required admin and routing surfaces are present and responding.
- The persistent volume and required env keys are in place.

## Untouched Scope
- BuildFlow Local.
- Non-staging Dokploy applications.
- DNS and Cloudflare.
- Tunnels and local services.
- Any env var values.

## Remaining Blockers
- No live device registration or routed action smoke test was performed in this pass.

## Exact Next Step
- If a non-mutating verification pass is enough, proceed to commit this report.
- If a full end-to-end managed smoke test is required, run it only with an approved staging device and without touching BuildFlow Local.
