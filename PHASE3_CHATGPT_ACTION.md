# Phase 3.0: ChatGPT Custom Action (Search Proof)

Phase 3.0 adds a minimal ChatGPT Custom Action proof for searching the local vault. This is the first action integration—read, create, and export actions are not included yet.

## Setup

### 1. Start Bridge Server (Port 3053)

```bash
cd packages/bridge
node dist/server.js
```

### 2. Start Local CLI Agent (Port 3052)

In another terminal:

```bash
BRIDGE_URL=ws://127.0.0.1:3053 DEVICE_TOKEN=test-device node packages/cli/dist/index.js serve
```

Agent connects outbound to bridge and indexes local vault.

### 3. Start Web App (Port 3000)

In another terminal:

```bash
cd apps/web && npm run dev
```

Web app serves OpenAPI spec and action endpoints.

## OpenAPI Spec

**URL:** `http://localhost:3000/api/openapi`

The spec includes all action definitions for ChatGPT Custom Actions integration.

## Action: Search Vault

**Endpoint:** `POST /api/actions/search`

**URL:** `http://localhost:3000/api/actions/search`

### Request

```json
{
  "query": "brain",
  "limit": 10
}
```

### Response

```json
{
  "results": [
    {
      "path": "mind/home.md",
      "title": "Brain Dashboard",
      "score": 0.95,
      "snippet": "Main dashboard and entry point...",
      "modifiedAt": "2026-04-15T12:00:00Z"
    }
  ]
}
```

## Testing

### Curl Test

```bash
curl -X POST http://localhost:3000/api/actions/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"brain","limit":2}'
```

### ChatGPT Custom Actions Setup

1. Go to ChatGPT Custom Actions interface
2. Import schema from: `http://localhost:3000/api/openapi`
3. Select `/api/actions/search` action
4. Test with query: "search for brain"

## Phase 3.0 Scope

**Included:**
- ✓ Search action via ChatGPT
- ✓ OpenAPI spec with action definitions
- ✓ Forwards to local vault search

**Not included (Phase 3.1+):**
- ✗ Read action
- ✗ Create note action
- ✗ Export plan action
- ✗ Production authentication
- ✗ Database persistence
- ✗ Multi-user/team support

## Implementation Details

- **Endpoint:** `apps/web/src/app/api/actions/search/route.ts`
- **OpenAPI spec:** `apps/web/src/app/api/openapi/route.ts`
- **Behavior:** Forwards search query to local agent at `/api/search`
- **No auth required:** Optional `x-api-key` header for future use
- **Local only:** Connects to `LOCAL_AGENT_URL` (default: `http://127.0.0.1:3052`)

## Existing Endpoints Still Working

- `GET /api/relay/health` — Phase 2.0 direct relay health
- `POST /api/relay/search` — Phase 2.0 direct relay search
- `GET /api/bridge/health` — Phase 2.1 bridge health
- `POST /api/bridge/search` — Phase 2.1 bridge search
- Plus all other tool endpoints unchanged

## Phases Status

- **Phase 1.1** (Local MVP): ✅ Working — local CLI agent
- **Phase 2.0** (Direct Relay): ✅ Working — web app direct HTTP → agent
- **Phase 2.1** (Bridge Relay): ✅ Working — web app → bridge → agent via WebSocket
- **Phase 3.0** (ChatGPT Action): ✅ Working — search action for ChatGPT
