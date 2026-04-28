# BuildFlow Managed Phase 1 Staging Action Routing Investigation

## Date
2026-04-28

## Scope
- Read-only investigation of the BuildFlow Managed staging action path.
- App: BuildFlow Staging
- Application ID: `enij_FshYINrDID8QGpZX`
- Domain: `buildflow-staging.prochat.tools`
- BuildFlow Local was not touched.
- No Dokploy config was mutated.
- No Docker, OrbStack, DNS, Cloudflare, tunnels, or non-staging apps were used or changed.

## Proven Facts
- Managed staging successfully proved:
  - device registration
  - offline -> online -> offline lifecycle
  - staging and production public endpoints remained `200`
- The smoke test reports show:
  - `POST /api/register` returned `201`
  - `/api/admin/devices` reflected the device state changes
  - `GET /api/actions/status` returned `500 Device command failed`
  - `GET /api/actions/context/active` returned `500 Device command failed`
- The staging relay logs show a healthy startup path for proxy, relay, and web.
- The failure is not a staging uptime issue; it is a request-routing / device-command compatibility issue.

## Relevant Files Inspected
- [`docs/product/managed/phase-1-staging-device-smoke-test-report.md`](/Users/Office/Repos/stevewesthoek/buildflow/docs/product/managed/phase-1-staging-device-smoke-test-report.md)
- [`docs/product/managed/phase-1-staging-device-smoke-test-plan.md`](/Users/Office/Repos/stevewesthoek/buildflow/docs/product/managed/phase-1-staging-device-smoke-test-plan.md)
- [`docs/product/managed/phase-1-staging-log-inspection-report.md`](/Users/Office/Repos/stevewesthoek/buildflow/docs/product/managed/phase-1-staging-log-inspection-report.md)
- [`packages/bridge/src/server.ts`](/Users/Office/Repos/stevewesthoek/buildflow/packages/bridge/src/server.ts)
- [`packages/cli/src/agent/bridge-client.ts`](/Users/Office/Repos/stevewesthoek/buildflow/packages/cli/src/agent/bridge-client.ts)
- [`apps/web/src/app/api/actions/status/route.ts`](/Users/Office/Repos/stevewesthoek/buildflow/apps/web/src/app/api/actions/status/route.ts)
- [`apps/web/src/app/api/actions/context/active/route.ts`](/Users/Office/Repos/stevewesthoek/buildflow/apps/web/src/app/api/actions/context/active/route.ts)
- [`apps/web/src/lib/actions/gpt.ts`](/Users/Office/Repos/stevewesthoek/buildflow/apps/web/src/lib/actions/gpt.ts)
- [`apps/web/src/lib/actions/transport.ts`](/Users/Office/Repos/stevewesthoek/buildflow/apps/web/src/lib/actions/transport.ts)
- [`apps/web/src/lib/actionAuth.ts`](/Users/Office/Repos/stevewesthoek/buildflow/apps/web/src/lib/actionAuth.ts)

## Exact Route / Command Flow: `GET /api/actions/status`
1. `apps/web/src/app/api/actions/status/route.ts`
2. `checkActionAuth(request)` accepts the Bearer token in relay-agent mode and forwards the bearer value in-memory.
3. `executeActionGET('/api/status', auth.bearerToken)` is called.
4. In relay-agent mode, `apps/web/src/lib/actions/transport.ts` converts this to:
   - `POST http://127.0.0.1:3053/api/actions/proxy/api/status`
5. `packages/bridge/src/server.ts` receives `/api/actions/proxy/api/status` and converts the path to:
   - `relayCommand = action_proxy:status`
6. The relay sends a WebSocket `command_request` message to the device:
   - `{"type":"command_request","requestId":"...","command":"action_proxy:status","params":{}}`
7. `packages/cli/src/agent/bridge-client.ts` receives `command_request`.
8. That client does not implement `action_proxy:status`.
9. The default branch returns `error = 'Unknown command: action_proxy:status'`.
10. The CLI agent sends `command_response` with that error.
11. The bridge rejects the pending request and the HTTP request becomes:
   - `500 Device command failed`

## Exact Route / Command Flow: `GET /api/actions/context/active`
1. `apps/web/src/app/api/actions/context/active/route.ts`
2. `checkActionAuth(request)` accepts the Bearer token in relay-agent mode and forwards the bearer value in-memory.
3. `getBuildFlowActiveContext(auth.bearerToken)` is called from `apps/web/src/lib/actions/gpt.ts`.
4. `getBuildFlowActiveContext` calls:
   - `executeAction('/api/get-active-sources', {}, userToken)`
5. In relay-agent mode, `apps/web/src/lib/actions/transport.ts` converts this to:
   - `POST http://127.0.0.1:3053/api/actions/proxy/api/get-active-sources`
6. `packages/bridge/src/server.ts` receives `/api/actions/proxy/api/get-active-sources` and converts the path to:
   - `relayCommand = action_proxy:get-active-sources`
7. The relay sends a WebSocket `command_request` message to the device:
   - `{"type":"command_request","requestId":"...","command":"action_proxy:get-active-sources","params":{}}`
8. `packages/cli/src/agent/bridge-client.ts` receives `command_request`.
9. That client does not implement `action_proxy:get-active-sources`.
10. The default branch returns `error = 'Unknown command: action_proxy:get-active-sources'`.
11. The CLI agent sends `command_response` with that error.
12. The bridge rejects the pending request and the HTTP request becomes:
   - `500 Device command failed`

## What the Bridge Sends to the CLI Agent
- For `/api/actions/status`:
  - `type: "command_request"`
  - `command: "action_proxy:status"`
  - `params: {}`
- For `/api/actions/context/active`:
  - `type: "command_request"`
  - `command: "action_proxy:get-active-sources"`
  - `params: {}`

## Does `packages/cli/src/agent/bridge-client.ts` Implement Those Command Names?
- No.
- It implements:
  - `health`
  - `workspaces`
  - `tree`
  - `grep`
  - `context`
  - `read`
  - `get-active-sources`
  - `set-active-sources`
  - `list-files`
  - `read-files`
  - `create-artifact`
  - `append-file`
  - `write-file`
  - `patch-file`
  - `create-plan`
  - `action_proxy:search`
  - `action_proxy:read`
  - `action_proxy:create`
  - `action_proxy:append`
- It does not implement:
  - `action_proxy:status`
  - `action_proxy:get-active-sources`

## Most Likely Cause of the `500`
- Primary cause: mismatched command name between bridge and CLI agent.
- The bridge prefixes all proxied commands as `action_proxy:*`.
- The CLI agent only handles a subset of those proxied command names.
- The relay itself is healthy; the 500 is produced when the device returns an error for an unknown command and the bridge turns that into `Device command failed`.

## Why This Is Not Mainly Staging Infra
- Registration works.
- WebSocket auth works.
- Device online/offline tracking works.
- The failure appears only when the bridge asks the agent to execute an unsupported command.
- That points to app/agent compatibility, not Dokploy, DNS, Cloudflare, or staging uptime.

## Smallest Safe Fix
- Smallest safe code change: add `action_proxy:status` and `action_proxy:get-active-sources` handlers to `packages/cli/src/agent/bridge-client.ts`, mapping them to existing read-only logic.
- For `action_proxy:status`, reuse the existing `health`-style result shape:
  - `status: 'ok'`
  - `deviceConnected: true/false`
- For `action_proxy:get-active-sources`, reuse the existing `get-active-sources` logic.
- Alternative fix: special-case these two read-only commands in `packages/bridge/src/server.ts` and forward them as `health` / `get-active-sources` instead of `action_proxy:*`.
- The CLI-side fix is the smallest compatibility patch because it preserves current relay behavior and only expands the accepted command surface.

## Test Plan for the Fix
1. Add the minimal command handlers in the CLI agent.
2. Run only code-level verification first if possible.
3. Re-run the staging-only smoke test:
   - register a fresh staging-only token
   - verify offline
   - connect isolated staging agent in a temp HOME
   - verify online
   - call `GET /api/actions/status`
   - call `GET /api/actions/context/active`
   - verify the device returns offline after stopping the agent
4. Confirm BuildFlow Local remains untouched.
5. Confirm `buildflow.prochat.tools` remains `200` before and after.

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
- Dokploy config

## Secret Handling Statement
- No token values, bearer headers, raw env payloads, or raw Dokploy app JSON are included in this report.
- This is a read-only investigation report only.
