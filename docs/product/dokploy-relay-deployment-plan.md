# Dokploy Relay Deployment Plan for BuildFlow v1.2.0-beta

**Status:** Canonical deployment guide for BuildFlow-managed relay at `buildflow.prochat.tools`.

**Audience:** DevOps/infrastructure owner deploying BuildFlow relay on Dokploy for v1.2.0-beta.

**See also:**
- `docs/product/custom-gpt-connection-architecture.md` — Architecture decisions and Phase 5B limitations
- `docs/product/custom-gpt-self-hosting-model.md` — User setup paths and endpoint model

---

## Quick answer: What should Dokploy run?

**Service name:** `buildflow-relay`  
**Package:** `@buildflow/bridge` (TypeScript, Node.js 20+)  
**Port:** 3053 (internal), mapped to public HTTPS via reverse proxy (Dokploy default)  
**Build command:** `pnpm install && pnpm --dir packages/bridge build`  
**Start command:** `pnpm --dir packages/bridge start`  
**Data volume:** `/relay-data` (persistent, for device registry and audit logs)  
**Health check:** `GET /health` (200 OK + JSON with connected device count)  
**Readiness check:** `GET /ready` (200 OK + data directory writable test)

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
  - /api/register (POST, no auth required for device registration in beta)
  - /api/bridge/ws (WebSocket, authenticated via bearer token)
  - /api/actions/proxy/* (POST, requires RELAY_PROXY_TOKEN)
  - /api/admin/* (GET/POST, requires RELAY_ADMIN_TOKEN)
```

### Environment Variables

Set these in Dokploy secrets/environment:

```bash
# Required
NODE_ENV=production

# Bridge configuration
BRIDGE_PORT=3053
RELAY_DATA_DIR=/relay-data

# Authentication (Phase 5B hardening for v1.2.0-beta)
RELAY_ENABLE_DEFAULT_TOKENS=false
RELAY_ADMIN_TOKEN=<secret-32-char-hex>       # For /api/admin/* endpoints
RELAY_PROXY_TOKEN=<secret-32-char-hex>       # For /api/actions/proxy/* endpoints

# Example token generation (run locally, paste into Dokploy secrets UI):
# openssl rand -hex 16  # Generates 32 hex chars
```

**Token generation for Dokploy secrets:**
```bash
# Generate RELAY_ADMIN_TOKEN (secure random)
RELAY_ADMIN_TOKEN=$(openssl rand -hex 16)
echo "RELAY_ADMIN_TOKEN=$RELAY_ADMIN_TOKEN"

# Generate RELAY_PROXY_TOKEN (secure random, different from admin token)
RELAY_PROXY_TOKEN=$(openssl rand -hex 16)
echo "RELAY_PROXY_TOKEN=$RELAY_PROXY_TOKEN"

# Store both in Dokploy secrets panel:
# 1. Create secret named: RELAY_ADMIN_TOKEN → <value>
# 2. Create secret named: RELAY_PROXY_TOKEN → <value>
```

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

**Purpose:** Monitoring and debugging connected devices  
**No authentication required**  
**Response (200 OK):**
```json
{
  "status": "ok",
  "bridgeRunning": true,
  "port": 3053,
  "connectedDevices": 0,
  "devices": []
}
```

**With connected device:**
```json
{
  "status": "ok",
  "bridgeRunning": true,
  "port": 3053,
  "connectedDevices": 1,
  "devices": [
    {
      "id": "device-uuid-12345",
      "status": "online",
      "lastSeen": "2026-04-27T10:30:15.000Z",
      "lastHeartbeat": "2026-04-27T10:30:25.000Z"
    }
  ]
}
```

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
   - Relay validates `RELAY_PROXY_TOKEN` header
   - Relay sends command over WebSocket to connected agent
   - Agent processes (search local vault)
   - Agent sends result back over WebSocket
   - Relay returns result to ChatGPT (200 OK)

4. **Device disconnected**
   - If agent loses connection: WebSocket closes
   - Relay updates device status to `offline`
   - `/health` shows `"connectedDevices": 0`
   - Next Custom GPT action returns 503 (no connected device)

---

## Critical Limitation: Single Connected Device (Phase 5B)

### Current Behavior

The relay **does not support multiple local agents** connected simultaneously in Phase 5B.

**If a second device connects while one is active:**
```
GET /health
{
  "connectedDevices": 2,
  "devices": [
    { "id": "device-1", "status": "online" },
    { "id": "device-2", "status": "online" }
  ]
}

POST /api/actions/proxy/api/search
Response: 503
{
  "error": "Multiple connected devices not supported in Phase 5B. Use direct-agent mode for local-only execution."
}
```

**Code reference:** `packages/bridge/src/server.ts:360–373`

### Phase 5B Workaround

**For v1.2.0-beta:** Users must operate in one of two modes:

1. **Sequential mode** (recommended for beta)
   - User 1 runs agent locally with relay enabled
   - User 2 waits until User 1 closes their agent
   - User 2 then starts their agent and connects

2. **Local-only mode** (if relay not needed temporarily)
   - Set `BUILDFLOW_BACKEND_MODE=direct-agent`
   - Skip relay connection entirely
   - No Custom GPT routing, but local dashboard still works

### When Multi-Device Support Arrives

Phase 5C (v1.2.1 or later) will add:
- Per-device token mapping (relay knows which device owns which token)
- Per-device action routing (relay sends requests to specific device)
- Concurrent multi-device support

**For v1.2.0-beta:** This is documented as a known limitation, not a bug.

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

WebSocket (bearer token required):
  wss://buildflow.prochat.tools/api/bridge/ws
  Authorization: Bearer <BUILDFLOW_ACTION_TOKEN>

Action proxy (RELAY_PROXY_TOKEN required, used by CustomGPT):
  POST https://buildflow.prochat.tools/api/actions/proxy/api/search
  POST https://buildflow.prochat.tools/api/actions/proxy/api/read
  POST https://buildflow.prochat.tools/api/actions/proxy/api/write
  Authorization: Bearer <RELAY_PROXY_TOKEN>

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
- [ ] Secrets configured: `RELAY_ADMIN_TOKEN`, `RELAY_PROXY_TOKEN` (32-char hex each)
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

### Custom GPT Action Proxy Test (requires RELAY_PROXY_TOKEN)

- [ ] Test search action:
  ```bash
  curl -s -X POST https://buildflow.prochat.tools/api/actions/proxy/api/search \
    -H 'Authorization: Bearer <RELAY_PROXY_TOKEN>' \
    -H 'Content-Type: application/json' \
    -d '{"query":"test","limit":2}' | jq .
  ```
- [ ] Should return search results from connected agent (200 OK)
- [ ] Without valid token: should return 403 Forbidden

- [ ] Test read action:
  ```bash
  curl -s -X POST https://buildflow.prochat.tools/api/actions/proxy/api/read \
    -H 'Authorization: Bearer <RELAY_PROXY_TOKEN>' \
    -H 'Content-Type: application/json' \
    -d '{"path":"README.md"}' | jq .
  ```
- [ ] Should return file content or error from agent (200 OK or 400+ if file not found)

### Multi-Device Limitation Test

- [ ] Start second test machine with its own agent, different token
- [ ] First agent still connected
- [ ] Run: `curl -s https://buildflow.prochat.tools/health | jq '.connectedDevices'`
- [ ] Should show: `2` (two devices connected)
- [ ] Run action proxy test: `curl -X POST https://buildflow.prochat.tools/api/actions/proxy/api/search ...`
- [ ] Should return 503: `"Multiple connected devices not supported in Phase 5B"`
- [ ] Stop first agent (disconnect)
- [ ] Run action proxy again: should return 200 OK (second device now handles it)

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
   - Acceptable range: 0–1 (Phase 5B limit)
   - Alert if: > 1 (misconfiguration or multi-device attempt)

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

## Security Hardening (Phase 5B)

### Before v1.2.0-beta Launch

✅ **Required:**
- [ ] `RELAY_ENABLE_DEFAULT_TOKENS=false` (disables dev tokens in production)
- [ ] `RELAY_ADMIN_TOKEN` is set to strong random value (32 hex chars)
- [ ] `RELAY_PROXY_TOKEN` is set to strong random value, different from admin token
- [ ] HTTPS only: no HTTP (Dokploy enforces via Let's Encrypt)
- [ ] WSS only: WebSocket Secure (automatic via HTTPS domain)
- [ ] Device token isolation: each local agent token is independent (Bearer token model)
- [ ] No token reuse: if token is leaked, rotate and update in user's `.env.local`

### Not Required for v1.2.0-beta

❌ **Deferred to Phase 5C+:**
- Multi-device token mapping (added in future version)
- Rate limiting per device or token (added in future version)
- Token expiration and refresh (added in future version)
- Admin dashboard UI (CLI only for now)
- Data encryption at rest (files are in persistent volume, owned by pod)

---

## Troubleshooting

### "Multiple connected devices not supported in Phase 5B"

**Symptom:** Action proxy returns 503 error  
**Cause:** Two or more agents are connected simultaneously  
**Solution:**
- User 1: Disconnect agent (stop local BuildFlow)
- Wait 10 seconds for relay heartbeat timeout
- User 2: Connect their agent
- Verify: `curl https://buildflow.prochat.tools/health` shows `connectedDevices: 1`

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

## Version and Compatibility

**Bridge version for v1.2.0-beta:** `@buildflow/bridge@0.1.0`

**Node.js requirement:** 20.x LTS or later (type checking requires TypeScript 5.0+)

**Relay protocol version:** Phase 5B (supports single connected device)

**Breaking changes from Phase 5A:**
- Explicit `RELAY_PROXY_TOKEN` required for action proxy (added security layer)
- Explicit admin token configuration (no unauthenticated `/api/admin/*` in production)

---

## Next Steps After v1.2.0-beta Launch

1. **Monitor relay usage and request patterns**
   - Are users connecting successfully?
   - How many concurrent Custom GPT actions?
   - Any 503 errors due to multi-device attempts?

2. **Gather feedback on single-device limitation**
   - Do users need multi-device support during beta?
   - How many users are affected?

3. **Plan Phase 5C (multi-device support)**
   - Per-device token mapping
   - Concurrent device coordination
   - Removal of 503 multi-device error

4. **Plan Phase 2 (Pro SaaS relay)**
   - Hosted relay instances for Pro users
   - Team workspace routing
   - Advanced device management

---

**Document version:** v1.2.0-beta (2026-04-27)

**Status:** Canonical for v1.2.0-beta BuildFlow-managed relay deployment on Dokploy.

**Maintainer:** See CONTRIBUTING.md for questions or issues.
