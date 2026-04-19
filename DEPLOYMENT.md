# Deployment Readiness MVP

This document describes the runtime contract and deployment workflow for Brain Bridge Relay Server.

## Overview

Brain Bridge Relay is a WebSocket bridge that:
- Receives device connections from local agents
- Routes commands between external requesters and local devices
- Maintains session state with audit logging
- Validates configuration on startup
- Provides health and readiness probes for orchestrators

## Runtime Contract

### Environment Variables

| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `BRIDGE_PORT` | int | 3053 | no | Relay server listen port |
| `RELAY_DATA_DIR` | string | `~/.brainbridge` | no | Data directory for state persistence |
| `RELAY_ADMIN_TOKEN` | string | — | no | Bearer token for admin endpoints; enables auth if set |
| `RELAY_ENABLE_DEFAULT_TOKENS` | string | `"true"` | no | Enable default development tokens for testing |
| `NODE_ENV` | string | `development` | no | Runtime environment (`development` or `production`) |

### Data Directory

All persistent state is stored in `RELAY_DATA_DIR` (defaults to `~/.brainbridge`):

```
RELAY_DATA_DIR/
├── relay-tokens.json       # Device authentication tokens
├── relay-devices.json      # Device registry (online/offline tracking)
├── relay-requests.json     # Request audit log (JSON array)
├── relay-sessions.log      # Session audit log (newline-delimited JSON)
└── relay.audit.log         # Server startup and runtime events
```

For containerized deployments, mount a persistent volume at this path.

### Required Preconditions

On startup, the relay validates:

1. **Port validity** — `BRIDGE_PORT` is 1–65535
2. **Data directory writability** — Can create/read/delete files in `RELAY_DATA_DIR`
3. **Config correctness** — All config paths are absolute or safe relative paths

If any check fails, the server exits with code 1 and logs a clear error.

### Startup Behavior

```
[Startup] Loading configuration...
[Startup] Configuration loaded:
  • bridgePort: 3053
  • dataDir: /var/lib/brainbridge
  • relayAdminToken: [REDACTED]
  • enableDefaultTokens: false
  • nodeEnv: production
[Startup] Testing data directory writability...
[Startup] ✓ Data directory ready: /var/lib/brainbridge
[Startup] ✓ All startup checks passed
[Bridge] Loading persisted state...
[Bridge] ✓ Default tokens disabled
[Bridge] ✓ Admin endpoint authentication enabled
[Bridge] Relay running on http://127.0.0.1:3053
```

All logs go to stderr. Status info goes to stdout.

### Endpoints

#### Health Probe
```
GET /health
```

Returns 200 with current status:
```json
{
  "status": "ok",
  "bridgeRunning": true,
  "port": 3053,
  "connectedDevices": 2,
  "devices": [
    {
      "id": "device-123",
      "status": "active",
      "lastSeen": "2026-04-18T10:30:00.000Z",
      "lastHeartbeat": "2026-04-18T10:30:15.000Z"
    }
  ]
}
```

**Use case:** Monitoring, dashboards, manual checks

#### Readiness Probe
```
GET /ready
```

Returns 200 if relay is ready for traffic:
```json
{
  "ready": true,
  "dataDir": "/var/lib/brainbridge"
}
```

Returns 503 if not ready:
```json
{
  "ready": false,
  "reason": "data_dir_not_writable"
}
```

**Use case:** Kubernetes readiness probes, load balancer health checks, orchestrator startup validation

The readiness check:
- Validates the relay completed startup
- Tests that the data directory is still writable (creates and deletes a temp file)
- Confirms the relay can persist state

#### Device Registration
```
POST /api/register
```

Registers a new device with a one-time token. Returns WebSocket URL and device ID.

#### Admin Endpoints
```
POST   /api/sessions              # Create session
GET    /api/sessions              # List sessions
GET    /api/sessions/{id}         # Get session details
POST   /api/sessions/{id}/close   # Close session
GET    /api/admin/devices         # List all devices
GET    /api/admin/requests        # View request audit log
```

These endpoints require `Authorization: Bearer <token>` if `RELAY_ADMIN_TOKEN` is set.

#### Command Execution
```
POST /api/commands              # Route command to device (legacy)
POST /api/commands/session      # Route command via session (new)
```

## Deployment Workflows

### 1. Local Hosted (No Docker)

**Setup:**

```bash
# Clone and install
git clone <repo> brain-bridge
cd brain-bridge
pnpm install

# Configure environment
export BRIDGE_PORT=3053
export RELAY_DATA_DIR=~/.brainbridge
export RELAY_ADMIN_TOKEN=dev-token-123
export RELAY_ENABLE_DEFAULT_TOKENS=false

# Build
pnpm build

# Start relay (in foreground for testing)
cd packages/bridge
pnpm start
```

**Verify:**

```bash
# Health check
curl http://localhost:3053/health

# Readiness check (should pass after startup)
curl http://localhost:3053/ready

# Admin endpoint with auth
curl -H "Authorization: Bearer dev-token-123" \
  http://localhost:3053/api/sessions
```

**For production persistence:**

```bash
# Create persistent data directory
mkdir -p /var/lib/brainbridge
chmod 700 /var/lib/brainbridge

# Set environment
export RELAY_DATA_DIR=/var/lib/brainbridge
export RELAY_ADMIN_TOKEN=<generate-strong-token>
export RELAY_ENABLE_DEFAULT_TOKENS=false
export NODE_ENV=production

# Run
cd packages/bridge
pnpm start
```

### 2. Docker Hosted

**Build and run:**

```bash
# Build image
docker build -t brainbridge:latest .

# Run container
docker run -d \
  --name brainbridge-relay \
  -p 3053:3053 \
  -e RELAY_ADMIN_TOKEN=prod-token-123 \
  -e RELAY_ENABLE_DEFAULT_TOKENS=false \
  -v brainbridge-data:/var/lib/brainbridge \
  brainbridge:latest

# Verify
docker logs brainbridge-relay
docker exec brainbridge-relay curl -s http://localhost:3053/ready | jq .
```

**With environment file:**

```bash
# Create .env.deployment
cat > .env.deployment << 'EOF'
BRIDGE_PORT=3053
RELAY_ADMIN_TOKEN=prod-token-123
RELAY_ENABLE_DEFAULT_TOKENS=false
NODE_ENV=production
EOF

# Run with env file
docker run -d \
  --name brainbridge-relay \
  -p 3053:3053 \
  --env-file .env.deployment \
  -v brainbridge-data:/var/lib/brainbridge \
  brainbridge:latest
```

### 3. Docker Compose

**Start stack:**

```bash
# Configure env
cat > .env.deployment << 'EOF'
RELAY_ADMIN_TOKEN=prod-token-123
RELAY_ENABLE_DEFAULT_TOKENS=false
NODE_ENV=production
EOF

# Start
docker-compose up -d

# View logs
docker-compose logs relay

# Verify readiness
docker-compose exec relay curl http://localhost:3053/ready
```

**Stop stack:**

```bash
docker-compose down
# Data persists in Docker volume
```

## Verification Checklist

After deployment, verify:

- [ ] Relay starts without errors
- [ ] `/health` returns 200
- [ ] `/ready` returns 200
- [ ] Data directory exists and is writable
- [ ] Admin endpoints require token if `RELAY_ADMIN_TOKEN` set
- [ ] Logs show "Startup checks passed"
- [ ] No sensitive values (like tokens) in stdout

## Troubleshooting

### Startup Fails: "Data directory not writable"

**Cause:** The relay cannot write to `RELAY_DATA_DIR`.

**Fix:**
```bash
# Verify directory exists and is writable
ls -la $(echo $RELAY_DATA_DIR)
chmod 700 $RELAY_DATA_DIR

# If running in container, check volume mount
docker inspect brainbridge-relay | grep -A 5 Mounts
```

### Readiness Check Returns 503

**Cause:** Data directory became read-only after startup.

**Fix:**
```bash
# Check filesystem permissions
df -h $RELAY_DATA_DIR
ls -la $RELAY_DATA_DIR

# Restart relay
docker restart brainbridge-relay
```

### Admin Endpoint Returns 403

**Cause:** Token is missing or invalid.

**Fix:**
```bash
# Verify token env var is set
echo $RELAY_ADMIN_TOKEN

# Check bearer token header
curl -v -H "Authorization: Bearer $RELAY_ADMIN_TOKEN" \
  http://localhost:3053/api/sessions
```

### High Memory or Disk Usage

**Cause:** Request or session audit logs grew too large.

**Fix:**
```bash
# Check log sizes
ls -lh $RELAY_DATA_DIR/*.json

# Manually clean old logs (optional, auto-rotate coming in next phase)
rm $RELAY_DATA_DIR/relay-requests.json
# Relay will recreate on next write
```

## Known Limitations

1. **No multi-instance clustering** — Single relay per deployment; horizontal scaling TBD
2. **No external secret management** — Tokens via env vars only (use container secrets for prod)
3. **No structured logging** — Plain text logs; structured logging TBD
4. **No log rotation policy** — Request audit may grow indefinitely; rotation coming in 2E
5. **No database persistence** — State lost on relay restart (in-memory only); persistence TBD
6. **Development tokens optional** — Can be disabled via `RELAY_ENABLE_DEFAULT_TOKENS=false`

## Next Phase

Deployment 2E will add:
- Database-backed session persistence
- Structured JSON logging with log rotation
- Horizontal scaling support
- External secret store integration
- Kubernetes manifests and Helm charts
