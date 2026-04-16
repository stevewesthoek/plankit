# Brain Bridge Phase 2.0 — Minimal SaaS Relay

**Status:** ✅ **MVP RELAY COMPLETE**

**Objective:** Prove the web app can relay search requests to the local agent.

---

## What Works (Phase 2.0)

✅ **Web app runs locally on port 3054**
- Next.js development server
- Can receive HTTP requests

✅ **Local agent runs on port 3052**
- CLI with all 6 endpoints
- `/health` shows status

✅ **Web app can relay to local agent**
- `POST /api/relay/health` — Check if local agent is reachable
- `POST /api/relay/search` — Forward search queries to local agent

✅ **Phase 2.0 relay proof**
1. Start local agent
2. Start web app
3. Query web app relay endpoint
4. Relay forwards to local agent and returns results

---

## What Does NOT Work Yet (Phase 2.1+)

❌ **WebSocket bridge relay** — Planned for Phase 2.1 (optional optimization)
❌ **Device registration** — Local dev only, no auth
❌ **Multi-vault support** — Single vault per local agent
❌ **ChatGPT integration** — Phase 3+
❌ **Team collaboration** — Phase 3+
❌ **Production deployment** — Phase 3+

---

## Quick Start

### Terminal 1: Start Local Agent

```bash
cd ~/Repos/stevewesthoek/brain-bridge/packages/cli
node dist/index.js serve
```

**Output:**
```
[Brain Bridge] Starting local agent server...
[Brain Bridge] No device token configured. Local agent running in standalone mode.
[Brain Bridge] Brain Bridge agent is running!
[Brain Bridge] Local server: http://127.0.0.1:3052
[Brain Bridge] Press Ctrl+C to stop.
```

### Terminal 2: Start Web App

```bash
cd ~/Repos/stevewesthoek/brain-bridge/apps/web
npm run dev
```

**Output:**
```
  ▲ Next.js 14.2.35
  - Local:        http://localhost:3054
  ...
```

### Terminal 3: Test Relay Health

```bash
curl -s http://localhost:3054/api/relay/health | jq .
```

**Response:**
```json
{
  "status": "ok",
  "webAppRunning": true,
  "localAgentUrl": "http://127.0.0.1:3052",
  "localAgentReachable": true,
  "localAgentHealth": {
    "status": "ok",
    "port": 3052,
    "vaultPath": "/tmp/brainbridge-demo",
    "indexedFiles": 4,
    "version": "0.1.0"
  },
  "timestamp": "2026-04-16T11:00:00.000Z"
}
```

### Terminal 3: Test Relay Search

```bash
curl -s -X POST http://localhost:3054/api/relay/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"brain","limit":2}' | jq .
```

**Response:**
```json
{
  "results": [
    {
      "path": "BrainBridge/Inbox/demo-plan.md",
      "title": "demo-plan",
      "score": 0.001,
      "snippet": "...",
      "modifiedAt": "..."
    }
  ]
}
```

---

## Architecture (Phase 2.0)

```
User
  ↓
Web App (port 3054)
  ├── GET /api/relay/health
  │    └─→ queries Local Agent /health
  │
  └── POST /api/relay/search
       └─→ forwards request to Local Agent /api/search
            └─→ returns search results
```

**No WebSocket relay server yet.** Direct HTTP forwarding is sufficient for MVP.

---

## Configuration

### Environment Variables

**Web App** (`.env.local`):
```bash
LOCAL_AGENT_URL=http://127.0.0.1:3052
```

**Local Agent** (automatic):
- Port: 3052 (fixed)
- Vault path: Configured via `brainbridge connect`

---

## Demo Script

Run full Phase 2.0 proof:

```bash
#!/bin/bash

# Terminal 1: Start local agent
cd ~/Repos/stevewesthoek/brain-bridge/packages/cli
node dist/index.js serve &
AGENT_PID=$!
sleep 2

# Terminal 2: Start web app
cd ~/Repos/stevewesthoek/brain-bridge
pnpm dev &
WEB_PID=$!
sleep 5

# Check relay health
echo "Checking relay health..."
curl -s http://localhost:3054/api/relay/health | jq .

echo ""
echo "Testing relay search..."
curl -s -X POST http://localhost:3054/api/relay/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"brain","limit":2}' | jq .

# Cleanup
kill $AGENT_PID $WEB_PID
```

---

## Files Changed (Phase 2.0)

- `apps/web/src/lib/bridge.ts` — Updated to directly relay to local agent
- `apps/web/src/app/api/relay/health/route.ts` — NEW: Health check endpoint
- `apps/web/src/app/api/relay/search/route.ts` — NEW: Search relay endpoint
- `packages/bridge/` — NEW: Directory placeholder (WebSocket relay for Phase 2.1)

---

## Next Steps

### Phase 2.1 (Optional)
- Build WebSocket bridge server in `packages/bridge/`
- Implement device registry and message routing
- Replace direct HTTP with WebSocket relay for real-time updates

### Phase 3
- Add ChatGPT Custom Action
- Wire OpenAPI spec
- Add production auth
- Deploy to cloud

---

## Testing Checklist

- ✅ Local agent starts on 3052
- ✅ Web app starts on 3054
- ✅ `/api/relay/health` returns status
- ✅ `/api/relay/search` relays queries
- ✅ Search results returned correctly
- ✅ Phase 1 demo still works (local-only)

---

## Constraints Maintained

✅ No ChatGPT integration  
✅ No production auth required  
✅ No team features  
✅ No multi-vault  
✅ Bare-minimal relay proof  
✅ Local dev only  
✅ Phase 1 backward compatible  

---

**Status:** MVP relay working. Ready for Phase 2.1 (WebSocket optimization) or Phase 3 (ChatGPT).
