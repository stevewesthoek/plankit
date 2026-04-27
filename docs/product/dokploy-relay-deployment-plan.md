# Dokploy Relay Deployment Plan for BuildFlow v1.2.0-beta

**Status:** Canonical deployment guide for BuildFlow-managed relay at `buildflow.prochat.tools`.

**Audience:** DevOps/infrastructure owner deploying BuildFlow relay on Dokploy for v1.2.0-beta.

**Key change (2026-04-27):** apps/web now uses request-token passthrough in relay-agent mode. The web layer forwards incoming bearer tokens from ChatGPT requests directly to the bridge instead of validating against a global token. This enables secure multi-user isolation without token sharing.

**See also:**
- `docs/product/custom-gpt-connection-architecture.md` — Architecture decisions
- `docs/product/custom-gpt-self-hosting-model.md` — User setup paths and endpoint model

---

## Deployment Topology

### User-Facing View (Simplified)

From the user's perspective, BuildFlow is **one application**:

```
User's Machine:
  $ pnpm local:start
  → BuildFlow starts (web + agent + relay)
  → Open http://localhost:3054 (dashboard)
  → Connect to Custom GPT with one token
  → Plan, handoff, execute — all integrated
```

For managed relay (v1.2.0-beta), users do NOT need to:
- Set up Cloudflare, ngrok, Tailscale, or any tunnel
- Configure DNS or domains
- Manage multiple "apps" or ports
- Run separate relay service on their machine

Everything "just works" with `pnpm local:start`.

### Internal Architecture (Technical)

Internally, BuildFlow has three components connected by well-defined boundaries:

```
Custom GPT (ChatGPT)                        Users' Local Agents
    ↓                                                ↑
    ↓ HTTPS/WSS                                     ↓ WSS
    ↓                                                ↓
Public Endpoint: https://buildflow.prochat.tools (reverse proxy with path routing)
    ↓ Path-based routing ↓
    ├─ /api/openapi, /api/actions/* → apps/web:3054
    ├─ /api/register, /api/bridge/ws, /health, /api/admin/* → bridge:3053
    │
[Dokploy Container]
    ├─ apps/web (port 3054)
    │   ├─ Serves Custom GPT OpenAPI schema
    │   ├─ Handles Custom GPT action requests
    │   └─ Calls bridge at localhost:3053 for relay-mode actions
    │
    └─ packages/bridge (port 3053)
        ├─ Registers devices (/api/register)
        ├─ Accepts WebSocket connections (/api/bridge/ws)
        ├─ Routes actions to connected devices
        ├─ Provides health/ready status (/health, /ready)
        └─ Maintains audit logs and device registry
        
                                ↑ WebSocket connection
                                ↑ (persists while device is online)
                                |
                          User's Local Agent
                          (runs on user's machine)
```

**Key points:**
- **Both apps/web and bridge are publicly accessible** at `https://buildflow.prochat.tools` via path-based routing.
- **apps/web** serves the Custom GPT integration (OpenAPI schema, action endpoints).
- **bridge** handles device registration, WebSocket connections, and relay routing.
- **User's local agent** connects outbound to the bridge. The user's machine does not accept inbound connections.
- Both services are exposed through one public domain for simplicity.
- No tunnel, DNS, or DNS A records required for users.

**Dokploy deployment details:**
- Run **two separate services** in the same container or cluster:
  - `buildflow-web` (apps/web, port 3054)
  - `buildflow-bridge` (packages/bridge, port 3053)
- Configure **path-based routing** at the reverse proxy layer:
  - `/api/openapi`, `/api/actions/*`, `/dashboard` → web:3054
  - Everything else → bridge:3053
- Environment in apps/web: `BUILDFLOW_BACKEND_MODE=relay-agent` to forward actions to bridge
- Environment in bridge: `RELAY_ENABLE_DEFAULT_TOKENS=false`, `RELAY_ADMIN_TOKEN=<secret>`, `BRIDGE_PORT=3053`
- Rate limiting required at reverse proxy layer (not in relay code)

---

## Design Principle: Dumb GPT, Dumb Relay, Smart Local App

**See also:** [Architecture Decision: Design Principle](./custom-gpt-connection-architecture.md#design-principle-dumb-gpt-dumb-relay-smart-local-app)

In brief:
- **GPT** has no business logic; it only submits requests and exposes action names.
- **Relay** has no product logic; it authenticates, routes, and logs metadata only.
- **Local app** has all the intelligence and is where features live.

**Deployment implication:** The relay deployed here is intentionally stateless and dumb. Do not add feature logic, caching, or business rules to the relay. Keep all that in the local BuildFlow app.

---

## Quick answer: What should Dokploy run?

Dokploy must run **TWO services** behind one public domain:

| Component | Port | Purpose | Public |
|-----------|------|---------|--------|
| apps/web | 3054 | Custom GPT OpenAPI schema, action endpoints, dashboard | Yes |
| packages/bridge | 3053 | Device registration, WebSocket routing, admin endpoints | Yes |

**Build and start:**
```bash
# apps/web (relay-aware token passthrough)
Build: pnpm install && pnpm --dir apps/web build
Start: BUILDFLOW_BACKEND_MODE=relay-agent pnpm --dir apps/web start

# packages/bridge
Build: pnpm install && pnpm --dir packages/bridge build
Start: pnpm --dir packages/bridge start
```

**Routing (at public domain https://buildflow.prochat.tools):**
- `/api/openapi`, `/api/actions/*`, `/dashboard` → apps/web:3054
- `/api/register`, `/api/bridge/ws`, `/health`, `/ready`, `/api/admin/*` → bridge:3053

**Data volume:** `/relay-data` (persistent storage for bridge device registry and audit logs)

**Key architecture point:** In relay-agent mode, apps/web acts as a **token passthrough proxy**. It accepts the incoming bearer token from ChatGPT requests and forwards that exact same token to the bridge (no global `BUILDFLOW_ACTION_TOKEN` required for routing). This enables multi-user isolation — each user's token maps to their registered device, and requests are routed correctly even with multiple simultaneous users.

---

## Dokploy Service Configuration

### Basic Service Setup

```yaml
# Dokploy service configuration for buildflow-relay

Service Name: buildflow-relay
Description: BuildFlow managed relay for Custom GPT endpoint routing

# Build settings
Source Repository: https://github.com/stevewesthoek/buildflow
Build Trigger: main branch (tag releases as v1.2.0-relay-* or similar)
Build Command: pnpm install && pnpm --dir packages/bridge build
Build Context: . (repo root)
Build Output Directory: packages/bridge/dist/

# Runtime settings
Start Command: pnpm --dir packages/bridge start
Node Version: 20.x LTS or later
Port Exposure: 3053 (container internal)

# Public endpoint
Public Domain: buildflow.prochat.tools
Protocol: HTTPS (automatic via Dokploy's Let's Encrypt)
Public Paths:
  - /health (GET, no auth, for monitoring)
  - /ready (GET, no auth, for liveness probe)
  - /api/register (POST, no auth required; protected by body size limit 4KB, input validation, rate-limiting)
  - /api/bridge/ws (WebSocket, authenticated via user bearer token)
  - /api/actions/proxy/* (POST, authenticated via user bearer token, routes to registered device)
  - /api/admin/* (GET/POST, requires RELAY_ADMIN_TOKEN)

**Note on /api/register:** This endpoint is unauthenticated to enable new device registration. Protection comes from:
1. **Body size limit:** 4 KB max (prevents buffer exhaustion)
2. **Input validation:** token format (16-256 chars, printable ASCII only), deviceId format validation
3. **Rate limiting:** Must be configured at reverse proxy layer to prevent registration spam
```

### Environment Variables

Set these in Dokploy secrets/environment:

**For apps/web (relay mode):**
```bash
NODE_ENV=production
BUILDFLOW_BACKEND_MODE=relay-agent   # Enable relay-agent mode (forward tokens to bridge)
```

**For packages/bridge:**
```bash
NODE_ENV=production

# Bridge configuration
BRIDGE_PORT=3053
RELAY_DATA_DIR=/relay-data

# Authentication (security hardening for v1.2.0-beta)
RELAY_ENABLE_DEFAULT_TOKENS=false
RELAY_ADMIN_TOKEN=<secret-32-char-hex>       # For /api/admin/* endpoints (ops/monitoring only)

# Example token generation (run locally, paste into Dokploy secrets UI):
# openssl rand -hex 16  # Generates 32 hex chars
```

**Token generation for Dokploy secrets:**
```bash
# Generate RELAY_ADMIN_TOKEN (secure random, for ops/admin endpoints only)
RELAY_ADMIN_TOKEN=$(openssl rand -hex 16)
echo "RELAY_ADMIN_TOKEN=$RELAY_ADMIN_TOKEN"

# Store in Dokploy secrets panel:
# 1. Create secret named: RELAY_ADMIN_TOKEN → <value>
```

**Multi-user token routing:**
- apps/web in relay-agent mode is a **token passthrough proxy**: it accepts incoming Bearer tokens from ChatGPT and forwards them unchanged to the bridge
- User-facing action routing (`/api/actions/proxy/*`) uses each user's own bearer token, not a shared token
- Each user's token is registered independently with the bridge and maps to their local device
- This ensures complete request isolation and prevents cross-user routing errors
- **No global `BUILDFLOW_ACTION_TOKEN` is needed for relay-agent mode hosted routing**

### Persistent Volume

**Mount path:** `/relay-data`  
**Size:** 10GB (or scale based on device registry + audit log growth)  
**Backup:** Daily snapshots (Dokploy default or manual via hosting provider)

**What gets persisted:**
```
/relay-data/
  devices.json              # Device registry (ID, token mapping)
  tokens.json               # Token store (admin/proxy tokens)
  sessions/                 # Session metadata (timestamp, status)
  audit/                    # Request audit logs (all action proxy calls)
  logs/                     # Service logs (startup, errors, state transitions)
```

---

## Health and Readiness Endpoints

### Health Check: `GET /health`

**Purpose:** Operational status and connected device count  
**No authentication required**  
**Response (200 OK):**
```json
{
  "status": "ok",
  "bridgeRunning": true,
  "port": 3053,
  "connectedDevices": 0
}
```

**With connected devices:**
```json
{
  "status": "ok",
  "bridgeRunning": true,
  "port": 3053,
  "connectedDevices": 2
}
```

**Privacy note:** This endpoint returns only aggregate count and operational status. Individual device IDs, connection times, and metadata are not exposed publicly. Admin endpoint `/api/admin/devices` is available with `RELAY_ADMIN_TOKEN` for detailed device information.

**Dokploy health check configuration:**
```
Endpoint: /health
Method: GET
Interval: 30s
Timeout: 10s
Retries: 3
Success Threshold: 200 OK
```

### Readiness Check: `GET /ready`

**Purpose:** Liveness probe for deployment (Dokploy restart on failure)  
**No authentication required**  
**Response (200 OK):**
```json
{
  "ready": true,
  "dataDir": "/relay-data"
}
```

**Response (503 Service Unavailable):**
```json
{
  "ready": false,
  "reason": "data_dir_not_writable"
}
```

**When 503 is returned:**
- Data directory `/relay-data` is not writable (check volume mount, permissions)
- Startup incomplete (check pod logs)
- Dokploy will restart the container automatically

**Dokploy readiness probe configuration:**
```
Endpoint: /ready
Method: GET
Interval: 60s
Timeout: 10s
Success Threshold: 200 OK
Failure Threshold: 3
```

---

## Local Agent Pairing Flow

### How a local BuildFlow agent connects to the managed relay

**Local agent setup (user's machine):**
```bash
# Step 1: User installs BuildFlow locally and sets a token
BUILDFLOW_ACTION_TOKEN=$(openssl rand -hex 32)
echo "BUILDFLOW_ACTION_TOKEN=$BUILDFLOW_ACTION_TOKEN" > apps/web/.env.local

# Step 2: User points their agent to the relay
export BUILDFLOW_RELAY_URL=https://buildflow.prochat.tools
export BUILDFLOW_RELAY_TOKEN=$BUILDFLOW_ACTION_TOKEN

# Step 3: User starts the local agent (with relay mode)
export BUILDFLOW_BACKEND_MODE=relay-agent
pnpm local:restart
```

**What happens on the relay:**

1. **Device registration** (WebSocket `/api/bridge/ws`)
   - Agent initiates WebSocket: `wss://buildflow.prochat.tools/api/bridge/ws`
   - Agent sends auth message: `{ type: 'auth', deviceToken: '<token>' }`
   - Relay accepts and stores: `{ deviceId: 'uuid', token: '<token>', status: 'online' }`

2. **Device connected**
   - Relay updates in-memory device registry
   - `/health` now shows `"connectedDevices": 1`
   - Relay is ready to proxy Custom GPT actions

3. **Custom GPT action flow**
   - ChatGPT → `POST https://buildflow.prochat.tools/api/actions/proxy/api/search`
   - Relay authenticates bearer token (user's device token)
   - Relay looks up device ID associated with that token
   - Relay sends command over WebSocket to that user's connected agent
   - Agent processes (search local vault)
   - Agent sends result back over WebSocket
   - Relay returns result to ChatGPT (200 OK)

4. **Device disconnected**
   - If agent loses connection: WebSocket closes
   - Relay updates device status to `offline`
   - `/health` shows `"connectedDevices": 0`
   - Next Custom GPT action returns 503 (no connected device)

---

## Multi-User Device Routing

### Current Behavior

The relay supports multiple local agents connected simultaneously and routes Custom GPT actions to the correct device based on each user's bearer token.

**When multiple devices are connected:**
```
GET /health
{
  "status": "ok",
  "connectedDevices": 2
}

POST /api/actions/proxy/api/search
Authorization: Bearer <user-a-token>
Response: 200 ✓ (routed to user A's device)

POST /api/actions/proxy/api/search
Authorization: Bearer <user-b-token>
Response: 200 ✓ (routed to user B's device)
```

**Code reference:** `packages/bridge/src/server.ts` — `authenticateUserDevice()` function authenticates each request with the bearer token and looks up the associated device.

### How Token-Based Routing Works

1. User registers their token: `POST /api/register { deviceToken: "...", deviceId?: "..." }` → relay maps token → deviceId
2. User's local agent connects: WebSocket auth with same `deviceToken` → relay receives `auth_response` with assigned `deviceId`
3. Custom GPT sends action: `POST /api/actions/proxy/api/search Authorization: Bearer <token>` → relay calls `tokenStore.validateToken(token)` → gets `deviceId` → sends command to that device's WebSocket
4. Device responds via WebSocket → relay routes result back to Custom GPT

Each user/token combination is completely isolated. No cross-contamination of requests.

---

## Expected Public URLs

### Public Endpoint Mapping

```
Domain: buildflow.prochat.tools
HTTPS: automatic (Dokploy + Let's Encrypt)
HTTP: redirects to HTTPS

Public endpoints (no auth required for registration):
  https://buildflow.prochat.tools/health
  https://buildflow.prochat.tools/ready

Device registration (beta, unauthenticated):
  POST https://buildflow.prochat.tools/api/register

WebSocket (bearer token required, token is user's device token):
  wss://buildflow.prochat.tools/api/bridge/ws
  Authorization: Bearer <user-device-token>

Action proxy (user bearer token required, routes to that user's registered local device):
  POST https://buildflow.prochat.tools/api/actions/proxy/api/search
  POST https://buildflow.prochat.tools/api/actions/proxy/api/read
  POST https://buildflow.prochat.tools/api/actions/proxy/api/write
  Authorization: Bearer <user-device-token>
  → Relay validates token, looks up deviceId, routes to that device's WebSocket

Admin (RELAY_ADMIN_TOKEN required, ops/monitoring):
  GET https://buildflow.prochat.tools/api/admin/devices
  GET https://buildflow.prochat.tools/api/admin/requests
  Authorization: Bearer <RELAY_ADMIN_TOKEN>
```

### SSL/TLS Verification

- Dokploy auto-provisions Let's Encrypt certificates for `buildflow.prochat.tools`
- Renewal happens automatically before expiry
- No manual certificate management required

---

## Beta Readiness Checklist

Before marking v1.2.0-beta relay ready, complete these tests:

### Pre-Deployment

- [ ] `pnpm --dir packages/bridge type-check` passes
- [ ] `pnpm --dir packages/bridge build` produces `dist/server.js`
- [ ] Start command `node dist/server.js` runs without errors
- [ ] Local `http://127.0.0.1:3053/health` returns 200 OK

### Dokploy Deployment

- [ ] Service is created and building from main branch
- [ ] Environment variables set: `NODE_ENV=production`, `RELAY_ENABLE_DEFAULT_TOKENS=false`
- [ ] Secrets configured: `RELAY_ADMIN_TOKEN` (32-char hex)
- [ ] Persistent volume `/relay-data` is mounted and writable
- [ ] Health check endpoint: `GET /health` returns 200 OK
- [ ] Readiness check endpoint: `GET /ready` returns 200 OK
- [ ] Domain `buildflow.prochat.tools` resolves and HTTPS works

### Device Registration & Connection

- [ ] Fresh clone of buildflow repo on test machine
- [ ] Generate test token: `BUILDFLOW_ACTION_TOKEN=$(openssl rand -hex 32)`
- [ ] Set mode: `export BUILDFLOW_BACKEND_MODE=relay-agent`
- [ ] Set relay URL: `export BUILDFLOW_RELAY_URL=https://buildflow.prochat.tools`
- [ ] Set relay token: `export BUILDFLOW_RELAY_TOKEN=$BUILDFLOW_ACTION_TOKEN`
- [ ] Start local agent: `pnpm local:restart`
- [ ] Verify connection: `curl -s https://buildflow.prochat.tools/health | jq '.connectedDevices'`
- [ ] Should show: `1` (one device connected)

### Custom GPT Action Proxy Test (per-device token routing)

- [ ] Test search action with user token via web:
  ```bash
  curl -s -X POST https://buildflow.prochat.tools/api/actions/search \
    -H 'Authorization: Bearer <user-device-token>' \
    -H 'Content-Type: application/json' \
    -d '{"query":"test","limit":2}' | jq .
  ```
- [ ] Should return search results from that user's device (200 OK or 503 if device offline)
- [ ] With invalid/unregistered token: should return 401 Unauthorized

- [ ] Test status action:
  ```bash
  curl -s -X GET https://buildflow.prochat.tools/api/actions/status \
    -H 'Authorization: Bearer <user-device-token>' | jq .
  ```
- [ ] Should return device status from that user's device (200 OK or 503 if offline)

- [ ] Test list-sources action:
  ```bash
  curl -s -X GET https://buildflow.prochat.tools/api/actions/sources \
    -H 'Authorization: Bearer <user-device-token>' | jq .
  ```
- [ ] Should return source list from that user's device (200 OK or 503 if offline)

### Multi-User Routing Test

- [ ] Start second test machine with its own agent and different token
- [ ] First agent still connected
- [ ] Run: `curl -s https://buildflow.prochat.tools/health | jq '.connectedDevices'`
- [ ] Should show: `2` (two devices connected simultaneously)
- [ ] Run action proxy test with User A's token: should route to User A's device
- [ ] Run action proxy test with User B's token: should route to User B's device
- [ ] Stop User A's agent (disconnect)
- [ ] Run action proxy with User A's token: should return 503 "device not connected"
- [ ] Run action proxy with User B's token: should still work (routes to User B)

### Audit & Monitoring

- [ ] Admin endpoint works:
  ```bash
  curl -s -H 'Authorization: Bearer <RELAY_ADMIN_TOKEN>' \
    https://buildflow.prochat.tools/api/admin/devices | jq '.devices | length'
  ```
- [ ] Should list registered devices
- [ ] Check audit logs in `/relay-data/audit/`: requests are being logged
- [ ] Verify logs are readable and not causing volume bloat

### Cold Start & Recovery

- [ ] Manually restart Dokploy service
- [ ] Verify startup completes: logs show `✓ All startup checks passed`
- [ ] `/health` returns 200 (even with 0 connected devices)
- [ ] `/ready` returns 200
- [ ] Reconnect agent: device re-registers in `/health`

---

## Rollback and Fallback Plan

### Rollback Scenario: Relay Service Fails

**If the relay goes down unexpectedly:**

1. **Users still have local-only mode** (no Custom GPT, but dashboard/agent work)
   ```bash
   export BUILDFLOW_BACKEND_MODE=direct-agent
   pnpm local:restart
   # Agent and web still work on 3052/3054
   # Custom GPT requests return 503 (no relay) until relay recovers
   ```

2. **Dokploy automatic restart**
   - Service fails 3 times within 5 minutes
   - Dokploy restarts container automatically
   - Monitor logs: `buildflow-relay` service logs in Dokploy dashboard

3. **Manual rollback** (if deploy introduces regression)
   - Dokploy maintains previous image in registry
   - Rollback to prior commit: click "Redeploy" for previous build
   - DNS still points to same domain (no user reconfiguration needed)
   - Service comes up with prior relay binary

4. **Fallback for users during outage**
   - Temporary recommendation: use user-managed tunnel
   - Users can set up Cloudflare Tunnel on their local machine:
     ```bash
     cloudflared tunnel --url http://localhost:3054
     # Use the public HTTPS URL in Custom GPT instead
     ```
   - This is fully functional but requires user setup

### Data Loss Prevention

**Device registry and audit logs are persistent:**
- `/relay-data` volume survives container restart
- Device registrations are recovered after restart
- Audit trail is retained for debugging

**If volume is corrupted:**
- Restore from backup snapshot (Dokploy hosting provider handles)
- Service will re-initialize on startup if data files are missing
- Devices will re-register with relay when they reconnect

---

## Build and Deploy Commands

### Local verification (before pushing to Dokploy)

```bash
# Type check the bridge package
pnpm --dir packages/bridge type-check

# Build the bridge
pnpm --dir packages/bridge build

# Verify build output exists
ls -la packages/bridge/dist/server.js

# Test the bridge locally
NODE_ENV=development \
  BRIDGE_PORT=3053 \
  RELAY_ENABLE_DEFAULT_TOKENS=true \
  node packages/bridge/dist/server.js &

# Verify health endpoint
curl -s http://127.0.0.1:3053/health | jq .

# Stop local bridge
kill %1
```

### Dokploy deployment trigger

**Option 1: GitHub webhook (automatic)**
- Dokploy monitors `main` branch
- On push to main: builds and deploys automatically
- Builds tagged as: `buildflow-relay:main-<short-commit-hash>`

**Option 2: Manual redeploy**
- In Dokploy dashboard: click "Redeploy" on `buildflow-relay` service
- Pulls latest from `main`, rebuilds, redeploys

**Option 3: Staged release (release branches)**
- Create branch: `release/relay-v1.2.0-beta`
- Dokploy can monitor this branch separately if needed
- Tag releases: `git tag v1.2.0-relay-001`

---

## Monitoring and Observability

### Key Metrics to Watch

1. **Connected devices count**
   - Endpoint: `GET /health` → `connectedDevices` field
   - Acceptable range: 0–N (multi-user relay supported in v1.2.0-beta)
   - Alert if: > 100 (possible DoS or misconfiguration)

2. **Action proxy request rate**
   - Source: `/relay-data/audit/*.json` (request audit logs)
   - Count per hour, per device
   - Alert if: 0 for > 30 min (possible silent failure)

3. **Data directory writability**
   - Endpoint: `GET /ready` → must return 200
   - Alert if: returns 503 (volume issue)

4. **WebSocket connection health**
   - Source: logs, device heartbeat timestamps
   - Alert if: device reports no heartbeat for > 2 min

### Log Locations

```
/relay-data/logs/startup.log      # Initialization and config validation
/relay-data/logs/relay.log        # Runtime events (device connection, errors)
/relay-data/audit/*.json          # Action proxy request audit (one file per day)
```

### Dokploy Dashboard Monitoring

- View service logs: `buildflow-relay` → "Logs" tab
- View connected devices: `curl https://buildflow.prochat.tools/health`
- View admin status: `curl -H "Authorization: Bearer <RELAY_ADMIN_TOKEN>" https://buildflow.prochat.tools/api/admin/devices`

---

## Security Hardening for v1.2.0-beta

### Before v1.2.0-beta Launch

✅ **Required:**
- [ ] `RELAY_ENABLE_DEFAULT_TOKENS=false` (disables dev tokens in production)
- [ ] `RELAY_ADMIN_TOKEN` is set to strong random value (32 hex chars)
- [ ] HTTPS only: no HTTP (Dokploy enforces via Let's Encrypt)
- [ ] WSS only: WebSocket Secure (automatic via HTTPS domain)
- [ ] Device token isolation: each local agent token is independent (Bearer token model)
- [ ] No token reuse: if token is leaked, rotate and update in user's `.env.local`
- [ ] Body size limits enforced: max 4 KB for registration, max 64 KB for proxy actions (prevents DoS)

### Rate Limiting (Deploy-Level Requirement)

⚠️ **Required at Dokploy/reverse proxy layer:**
- `/api/register` should be rate-limited (max requests per IP per minute)
- `/api/actions/proxy/*` should be rate-limited per token (max requests per minute)
- WebSocket connections should be rate-limited or monitored for abuse
- **Implementation:** Use Dokploy's reverse proxy rules or nginx rate-limiting module
- **Reason:** Relay code enforces body size limits and auth, but does not implement request rate-limiting

### Not Required for v1.2.0-beta

❌ **Deferred to future versions:**
- Token expiration and refresh (added in future version)
- Admin dashboard UI (CLI only for now)
- Data encryption at rest (files are in persistent volume, owned by pod)

---

## Troubleshooting

### "Your device is not connected to the relay"

**Symptom:** Action proxy returns 503 error  
**Cause:** Device registered with token is offline/disconnected, or token not registered  
**Solution:**
- Verify token is registered: `curl -s -H "Authorization: Bearer <token>" https://buildflow.prochat.tools/api/actions/proxy/api/status`
- If 401: token not registered or invalid
- If 503: token registered but device offline — start your local BuildFlow with relay mode: `BUILDFLOW_BACKEND_MODE=relay-agent pnpm local:restart`

### "No connected device available"

**Symptom:** Action proxy returns 503 error  
**Cause:** No agent is connected to the relay  
**Solution:**
- User: Start local BuildFlow with relay mode enabled
- Verify: `curl https://buildflow.prochat.tools/health` shows `connectedDevices: 1`
- If still 503: check local agent logs for connection errors

### "Data directory not writable"

**Symptom:** `/ready` returns 503  
**Cause:** Volume mount or permissions issue  
**Solution:**
- Check Dokploy dashboard: is `/relay-data` volume mounted?
- Check volume size: is there free space?
- Dokploy restart: service should recover after volume is fixed

### "Relay admin token required" or "Invalid proxy token"

**Symptom:** Admin or proxy endpoint returns 403 Forbidden  
**Cause:** Token header missing or incorrect  
**Solution:**
- Verify token in Dokploy secrets panel
- Verify header is: `Authorization: Bearer <token>` (not `<token>` alone)
- Check token value matches what was set in Dokploy

---

## Privacy and Security Model

### What traverses the relay

Payloads (search queries, file content results, write operations) transit through the relay's in-memory HTTP/WebSocket proxying as part of normal request handling. They are **not persisted** to disk, audit logs, or any external system.

**During transmission, the relay operator has technical access to in-memory traffic.** BuildFlow does not offer end-to-end encryption in v1.2.0-beta — only transport-level TLS (HTTPS/WSS) protects payloads in transit.

### What stays local

- Your file storage and index (on your machine only)
- Source content scanning and processing
- Artifact generation and plan creation
- Local agent execution and environment detection

### What's logged

Audit logs contain only **metadata**, never payloads:
- `requestId`: unique request identifier
- `deviceId`: device/user identifier (internal, not a secret)
- `command`: action name (e.g., `action_proxy:search`)
- `status`: outcome (success/error/timeout)
- `duration`: execution time in milliseconds
- `timestamp`: RFC 3339 timestamp
- `error`: error category (e.g., "invalid_token", "device_offline"), not the full error message or stack trace

**Never logged:** bearer tokens, file contents, search queries, response bodies, or any user payload data.

---

## Version and Compatibility

**Bridge version for v1.2.0-beta:** `@buildflow/bridge@0.1.0`

**Node.js requirement:** 20.x LTS or later (type checking requires TypeScript 5.0+)

**Relay protocol version:** Phase 5C (supports multi-user token-scoped routing)

**Breaking changes from Phase 5A:**
- User-device routing by bearer token (each device isolated to its registered token)
- Explicit admin token configuration (no unauthenticated `/api/admin/*` in production)
- No multi-device 503 error — multiple users can connect simultaneously

---

## Future Admin Dashboard (Phase 2+)

**Not built for v1.2.0-beta, but designed for:**

A future admin dashboard will monitor relay health and operational metrics. Current audit logs and metadata are designed to support it safely:

**What the dashboard will show:**
- Relay health: uptime, connected device count, error rates
- Device metrics: connection count, last seen timestamp, request count per device
- Request telemetry: total requests, success/error/timeout breakdown, response latencies, failure categories
- Abuse signals: repeated 401s, 503s, or rate-limit hits per token

**What the dashboard will NEVER show (privacy by design):**
- File contents, search results, code snippets, or response bodies
- Prompts, queries, or user input
- Bearer tokens or any credential material
- Raw device errors or stack traces
- Request bodies or action parameters

**Current safeguards (to support future dashboard):**
- Audit logs contain only metadata: `requestId`, `deviceId`, `command`, `status`, `duration`, `timestamp`, `error` (category only, not message)
- Never log tokens, file paths, response bodies, or user input
- All errors returned to client are generic: "Backend service unavailable" instead of implementation details

**If adding new metrics to relay in the future:**
- Follow this privacy model strictly
- Any new field must be auditable (what is it, why do we log it, does it reveal user data?)
- Test: would this field be safe to show to a non-eng relay operator?

---

## Next Steps After v1.2.0-beta Launch

1. **Monitor relay usage and request patterns**
   - Are users connecting successfully?
   - How many concurrent Custom GPT actions?
   - Any routing errors or token mismatches?

2. **Gather feedback on multi-user routing**
   - Is token-scoped routing working as expected?
   - Any interference between simultaneous users?
   - Performance impact of multiple concurrent devices?

3. **Plan Phase 2 (Pro SaaS relay)**
   - Hosted relay instances for Pro users
   - Team workspace routing
   - Advanced device management
   - Request rate limiting and quotas
   - Admin dashboard for relay operators

---

**Document version:** v1.2.0-beta (2026-04-27)

**Status:** Canonical for v1.2.0-beta BuildFlow-managed relay deployment on Dokploy.

**Maintainer:** See CONTRIBUTING.md for questions or issues.
