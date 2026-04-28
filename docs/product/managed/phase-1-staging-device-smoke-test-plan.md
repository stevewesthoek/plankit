# BuildFlow Managed Phase 1 Staging Device Smoke Test Plan

## Purpose
Prove the managed staging relay can register a fresh staging-only device, accept a staging-only agent connection, and route a read-only action request.

## Scope
- Staging only
- App: BuildFlow Staging
- Application ID: `enij_FshYINrDID8QGpZX`
- Domain: `buildflow-staging.prochat.tools`

## Explicit Non-Goals
- Do not touch BuildFlow Local
- Do not touch `buildflow.prochat.tools`
- Do not touch non-staging Dokploy apps
- Do not change DNS, Cloudflare, tunnels, Docker, OrbStack, local ports, or local services
- Do not reuse any production/local token
- Do not expose token values in logs or docs

## Proposed Smoke Test Steps
1. Generate a fresh staging-only device token.
2. Register it against:
   - `POST https://buildflow-staging.prochat.tools/api/register`
3. Verify the device appears offline in `/api/admin/devices` using the staging admin token in memory only.
4. Start an isolated staging agent in a way that does not touch BuildFlow Local.
5. Use a non-3054 local port if a local agent HTTP port is required.
6. Set:
   - `BRIDGE_URL=wss://buildflow-staging.prochat.tools/api/bridge/ws`
   - `DEVICE_TOKEN=<fresh-staging-token>`
7. Verify the device transitions from offline to online.
8. Run only read-only action checks first:
   - `GET /api/actions/status`
   - `GET /api/actions/context/active` if available
9. Stop the isolated staging agent.
10. Verify the device returns offline or disconnected.

## Safety Gates
- Confirm BuildFlow Local remains running and untouched before and after.
- Confirm `buildflow.prochat.tools` remains `200` before and after.
- Confirm staging endpoints remain `200` before and after.
- Abort if any command would touch port `3054`, Docker, OrbStack, DNS, Cloudflare, or non-staging Dokploy apps.

## Expected Outcomes
- Device registration succeeds.
- Offline state is visible before agent connection.
- Online state is visible after agent connection.
- Read-only action request reaches the connected staging agent.
- No production or local impact.

## Rollback
- Stop the isolated staging agent.
- Leave the staging device token unused or rotate/purge later if supported.
- No production rollback should be required because production and Local are untouched.

## Open Questions
- What exact isolated agent command should be used?
- Should the staging token be purged afterward, or is leaving it registered acceptable?
- Which read-only action endpoint is the safest definitive routing proof?

## Secret Handling
- Do not print token values, bearer headers, or raw env payloads.
- Keep the staging admin token in memory only if the test is later approved.
- This document is a plan only and does not authorize execution.
