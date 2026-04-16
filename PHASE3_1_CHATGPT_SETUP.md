# Phase 3.1: ChatGPT Custom Action Setup & Hardening

Phase 3.1 verifies and hardens the ChatGPT Custom Action integration for search-only functionality.

## Setup: Local Testing

### 1. Start Brain Bridge Stack

```bash
# Terminal 1: Bridge Server (port 3053)
cd ~/Repos/stevewesthoek/brain-bridge/packages/bridge
node dist/server.js

# Terminal 2: Local Agent (port 3052, connected to bridge)
BRIDGE_URL=ws://127.0.0.1:3053 DEVICE_TOKEN=test-device \
  node packages/cli/dist/index.js serve

# Terminal 3: Web App (port 3054)
cd ~/Repos/stevewesthoek/brain-bridge/apps/web
npm run dev
```

### 2. Get OpenAPI Spec

**Live endpoint:**
```bash
curl -s http://localhost:3054/api/openapi | jq .
```

**Static file for import:**
- File: `docs/openapi.chatgpt.json`
- URL (local): `file://docs/openapi.chatgpt.json`
- URL (after tunnel): `https://<your-tunnel-domain>/docs/openapi.chatgpt.json`

## Local Test

```bash
curl -X POST http://localhost:3054/api/actions/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"brain","limit":2}'
```

Expected response:
```json
{
  "results": [
    {
      "path": "...",
      "title": "...",
      "score": 0.95,
      "snippet": "...",
      "modifiedAt": "2026-04-16T12:00:00Z"
    }
  ]
}
```

## ChatGPT Custom Actions: Public Setup

To use with ChatGPT, expose localhost via a tunnel:

### Option 1: ngrok

```bash
ngrok http 3054
```

Output:
```
Forwarding  https://abc123def456.ngrok.io -> http://localhost:3054
```

### Option 2: Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:3054
```

Output:
```
https://your-domain.trycloudflare.com
```

### Option 3: Custom Domain (Production)

Replace `http://localhost:3054` with your public domain in:
- `docs/openapi.chatgpt.json` → `servers[0].url`
- Or set `NEXT_PUBLIC_API_URL` environment variable when building

## ChatGPT Custom Actions: Import Steps

1. Go to ChatGPT → Custom GPTs → Create new GPT
2. Select "Actions" tab
3. Click "Create new action"
4. Under "Authentication", select "API Key" or "None" (for local testing)
5. Paste the OpenAPI spec:
   - **Local testing:** Copy content of `docs/openapi.chatgpt.json`
   - **Public testing:** Use URL: `https://<your-tunnel-domain>/docs/openapi.chatgpt.json`
6. Select `/api/actions/search` action
7. Test with query: "brain"

## OpenAPI Spec Details

**File:** `docs/openapi.chatgpt.json`

**Highlights:**
- OpenAPI 3.0.0 compliant
- Single action: `/api/actions/search`
- Input: `{query: string, limit?: integer}`
- Output: `{results: [{path, title, score, snippet, modifiedAt}]}`
- Server URL replaceable for local/public

## Phase 3.1 Scope

**Included:**
- ✓ Static OpenAPI spec export (`docs/openapi.chatgpt.json`)
- ✓ ChatGPT Custom Actions import documentation
- ✓ Tunnel setup instructions (ngrok, Cloudflare, custom)
- ✓ Local curl test command
- ✓ Verified schema matches actual response

**Not included (Phase 3.2+):**
- ✗ Read action
- ✗ Create note action
- ✗ Export plan action
- ✗ Production authentication setup
- ✗ Database persistence
- ✗ Multi-user/team support
- ✗ Automated tunnel deployment

## Testing Checklist

- [ ] Local agent running, bridge connected
- [ ] Web app serving on port 3054
- [ ] `curl http://localhost:3054/api/openapi` returns valid OpenAPI
- [ ] `curl -X POST http://localhost:3054/api/actions/search` returns search results
- [ ] `docs/openapi.chatgpt.json` imports into ChatGPT Actions without errors
- [ ] ChatGPT action test returns results for query "brain"

## Phases Status

- **Phase 1.1** (Local MVP): ✅ Complete — local CLI agent
- **Phase 2.0** (Direct Relay): ✅ Complete — web app direct HTTP → agent
- **Phase 2.1** (Bridge Relay): ✅ Complete — web app → bridge → agent via WebSocket
- **Phase 3.0** (Search Action): ✅ Complete — `/api/actions/search` endpoint
- **Phase 3.1** (ChatGPT Setup): ✅ Complete — static spec, tunnel docs, import guide
