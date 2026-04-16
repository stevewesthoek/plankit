# Phase 2.1: Outbound Bridge Relay

Phase 2.1 adds an outbound WebSocket bridge relay that allows the web app and other clients to reach the local agent without direct localhost access.

## Architecture

```
Web App (port 3054)
    ├─→ /api/relay/search (Phase 2.0: direct HTTP → local agent)
    └─→ /api/bridge/search (Phase 2.1: HTTP → relay → agent via WebSocket)

Bridge Relay (port 3053)
    ├─→ HTTP /health endpoint (status, device count, agent health)
    └─→ WebSocket server for device connections

Local CLI Agent (port 3052)
    ├─→ Connects outbound to bridge via WebSocket
    └─→ Exposes /api/search, /health for tool execution
```

## Running Phase 2.1

### 1. Start Bridge Server

```bash
cd packages/bridge
npm run start
# or
node dist/server.js
```

Bridge listens on `http://127.0.0.1:3053` with WebSocket at `ws://127.0.0.1:3053`.

### 2. Start Local CLI Agent

```bash
BRIDGE_URL=ws://127.0.0.1:3053 DEVICE_TOKEN=test-device node packages/cli/dist/index.js serve
```

Agent connects to bridge and registers with device token.

### 3. Start Web App

```bash
cd apps/web && npm run dev
```

Web app runs on `http://127.0.0.1:3054`.

## Endpoints

### Bridge Health
**GET** `/api/bridge/health`

Response:
```json
{
  "status": "ok",
  "bridgeRunning": true,
  "port": 3053,
  "localAgentUrl": "http://127.0.0.1:3052",
  "agentHealthy": true,
  "connectedDevices": 1,
  "agentHealth": {
    "status": "ok",
    "port": 3052,
    "vaultPath": "/tmp/vault",
    "indexedFiles": 4,
    "version": "0.1.0"
  }
}
```

### Bridge Search
**POST** `/api/bridge/search`

Request:
```json
{
  "query": "search term"
}
```

Response:
```json
{
  "results": [...]
}
```

## Implementation Details

### Bridge Server (`packages/bridge/src/server.ts`)

- **HTTP Server**: Handles `/health` endpoint on port 3053
- **WebSocket Server**: Accepts device connections, routes tool calls
- **Device Registry**: `Map<deviceId, WebSocket>` tracks connected agents
- **Pending Calls**: `Map<messageId, { resolve, reject, timeout }>` handles request/response pairing
- **Tool Routing**: `callToolOnDevice(tool, input)` sends requests to first connected device

### CLI Agent (`packages/cli/src/commands/serve.ts`)

- Reads `BRIDGE_URL` environment variable
- Reads `DEVICE_TOKEN` environment variable (or uses config.deviceToken)
- Creates `BridgeClient(bridgeUrl, deviceToken)` if configured
- Falls back to SaaS bridge if no bridge URL
- Falls back to standalone if neither configured

### Web App Endpoints

- `GET /api/bridge/health`: Proxies to bridge `/health` endpoint
- `POST /api/bridge/search`: Routes search query to local agent via bridge

## Testing

```bash
# Check bridge status
curl http://127.0.0.1:3053/health | jq .

# Via web app
curl http://127.0.0.1:3054/api/bridge/health | jq .

# Search via web app
curl -X POST http://127.0.0.1:3054/api/bridge/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}'
```

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `BRIDGE_URL` | (none) | Bridge relay WebSocket URL (e.g., `ws://127.0.0.1:3053`) |
| `DEVICE_TOKEN` | (none) | Device authentication token for bridge |
| `BRIDGE_PORT` | `3053` | Port for bridge server (bridge only) |
| `LOCAL_AGENT_URL` | `http://127.0.0.1:3052` | Local agent URL for bridge health checks |

## Phases Status

- **Phase 1.1** (Local MVP): ✅ Working — local CLI agent on port 3052
- **Phase 2.0** (Direct Relay): ✅ Working — web app direct HTTP → agent
- **Phase 2.1** (Bridge Relay): ✅ Working — web app → bridge → agent via WebSocket
