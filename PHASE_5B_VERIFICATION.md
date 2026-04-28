# Status note: This document is historical/reference material. For the current roadmap and implementation plan, see `docs/product/roadmap.md` and `docs/product/implementation-plan.md`.

Migration safety note: commands, ports, relay modes, environment variables, and local runtime instructions in this historical document are reference-only and must not be used to stop, clean up, replace, or reconfigure Steve's current local BuildFlow setup during the Dokploy migration.

# Phase 5B Relay-Backed Execution — Verification Guide

This document describes how to verify the Phase 5B relay-backed execution implementation.

## Architecture Overview

**Phase 5B enables two execution modes:**

1. **direct-agent (default):** Web app (3054) → Agent (3052) directly
2. **relay-agent (new):** Web app (3054) → Relay (3053) → Agent (3052)

Both modes are now fully implemented and tested.

## Verification Steps

### Prerequisites

All three services must be running:
- Relay: `docker compose up -d` (port 3053)
- Agent: `cd packages/cli && BRIDGE_URL=ws://localhost:3053 DEVICE_TOKEN=test npx tsx src/index.ts serve` (port 3052)
- Web app: `cd apps/web && BUILDFLOW_ACTION_TOKEN=test npm start` (port 3054)

### Step 1: Verify Type Check and Build

```bash
pnpm type-check
pnpm build
```

Expected: Zero TypeScript errors, successful build of all packages.

**Current status:** ✅ Passing

### Step 2: Verify Direct-Agent Mode (Default)

```bash
# Start web app without setting BUILDFLOW_BACKEND_MODE
cd apps/web
npm start

# In another terminal, test the endpoint
curl -X POST http://localhost:3054/api/actions/search \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":1}'
```

Expected:
- Web app logs show backend mode = direct-agent
- Request goes directly to agent on 3052
- Results returned from agent

### Step 3: Verify Relay-Agent Mode

```bash
# Start web app with relay mode
cd apps/web
BUILDFLOW_BACKEND_MODE=relay-agent npm start

# In another terminal, test the endpoint
curl -X POST http://localhost:3054/api/actions/search \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":1}'
```

Expected:
- Web app logs show backend mode = relay-agent
- Request routed through relay at 3053
- Relay forwards to connected device
- Results returned from agent via relay

### Step 4: Verify No Device Connected Error

```bash
# Stop the agent (disconnect from relay)
# (Ctrl+C in agent terminal)

# Try relay-agent mode
BUILDFLOW_BACKEND_MODE=relay-agent
curl -X POST http://localhost:3054/api/actions/search \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":1}'
```

Expected:
- HTTP 503 response
- Error message: "No connected device available..."

### Step 5: Verify Multiple Devices Error (Phase 5B Limitation)

```bash
# Start two agents connecting to relay with different device tokens
# Agent 1: BRIDGE_URL=ws://localhost:3053 DEVICE_TOKEN=device1 npx tsx src/index.ts serve
# Agent 2: BRIDGE_URL=ws://localhost:3053 DEVICE_TOKEN=device2 npx tsx src/index.ts serve

# Try relay-agent mode
BUILDFLOW_BACKEND_MODE=relay-agent
curl -X POST http://localhost:3054/api/actions/search \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":1}'
```

Expected:
- HTTP 503 response
- Error message: "Multiple connected devices not supported in Phase 5B..."

### Step 6: Verify Timeout Handling

```bash
# Start relay and agent normally, but trigger a timeout
# Search for a query that takes >30 seconds (if such exists)

BUILDFLOW_BACKEND_MODE=relay-agent
curl -X POST http://localhost:3054/api/actions/search \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{"query":"...","limit":1}'
```

Expected:
- HTTP 504 response after ~30 seconds
- Error message: "Device command timeout after 30 seconds"

### Step 7: Verify Audit Logging

```bash
# Check relay audit log for action proxy entries
tail -f ~/.buildflow/relay.audit.log | grep "relay_action_proxy"
```

Expected output (example):
```json
{"timestamp":"2026-04-19T...","tool":"relay_action_proxy","status":"success","endpoint":"/api/search","deviceId":"device-...","requestId":"req-...","duration":45}
```

## Routing Logic Verification

The key insight: **Same URL pattern for both modes**

### Direct-Agent Mode
```
Request: POST http://localhost:3054/api/actions/search
Backend URL: http://127.0.0.1:3052
Transport calls: http://127.0.0.1:3052/api/search
Response: Direct from agent
```

### Relay-Agent Mode
```
Request: POST http://localhost:3054/api/actions/search
Backend URL: http://127.0.0.1:3053/api/actions/proxy
Transport calls: http://127.0.0.1:3053/api/actions/proxy/api/search
Relay extracts: /api/search
Relay sends WebSocket: { type: 'command_request', command: 'action_proxy:/api/search', params: {...} }
Response: From device via relay
```

## Code Verification Checklist

- [ ] `apps/web/src/lib/actions/config.ts` — getBackendUrl() returns relay proxy for relay-agent mode
- [ ] `apps/web/src/lib/actions/config.ts` — getBackendDebugInfo() works for both modes
- [ ] `packages/bridge/src/server.ts` — POST /api/actions/proxy/* endpoint implemented
- [ ] Relay endpoint extracts agentEndpoint correctly from URL path
- [ ] Relay checks for single connected device, rejects 0 or >1
- [ ] Relay returns clear 503 errors with helpful messages
- [ ] Relay reuses existing command/response/timeout infrastructure
- [ ] All error responses (400, 503, 504, 500) have appropriate messages
- [ ] Audit logging captures all action proxy calls
- [ ] `apps/web/src/lib/actions/transport.ts` — unchanged (✅ correct)
- [ ] Action route handlers in `apps/web/src/app/api/actions/` — unchanged (✅ correct)

## Expected Behavior Summary

| Mode | URL Called | Path | Handler |
|------|-----------|------|---------|
| direct-agent | http://127.0.0.1:3052/api/search | /api/search | Agent directly |
| relay-agent | http://127.0.0.1:3053/api/actions/proxy/api/search | /api/actions/proxy/api/search | Relay proxy endpoint |

## Phase 5B Limitations (By Design)

- **Single device only:** Exactly 1 connected device required; 0 or >1 returns 503
- **No device selection:** Not applicable; only one device available
- **Local deployment:** Relay URL hard-coded to 127.0.0.1:3053
- **Timeouts:** Reuses 30-second command timeout from relay infrastructure

These limitations are intentional for Phase 5B. Phase 5C+ will add multi-device support and configurable device selection.

## Rollback Plan

To disable relay-agent mode and fall back to direct-agent:
1. Set `BUILDFLOW_BACKEND_MODE=direct-agent` (or unset)
2. Relay endpoint `/api/actions/proxy/*` can remain; it won't be called
3. Action handlers and transport.ts are unchanged; no action needed
4. If needed, remove relay proxy endpoint by reverting server.ts

## Success Criteria ✅

Phase 5B relay-backed execution is verified when:
1. ✅ Type check and build pass with no errors
2. ✅ direct-agent mode routes requests to port 3052
3. ✅ relay-agent mode routes requests through port 3053 to device
4. ✅ No device connected returns 503 with clear message
5. ✅ Multiple devices return 503 with clear message
6. ✅ Timeout returns 504 with clear message
7. ✅ Audit logs capture all action proxy calls
8. ✅ No changes to transport.ts or action route handlers
9. ✅ Web app and relay run locally without modification
