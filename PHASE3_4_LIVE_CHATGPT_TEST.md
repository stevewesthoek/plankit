# Phase 3.4: ChatGPT Custom GPT Action UI Verification — Runbook

Phase 3.4 provides the complete runbook for manual ChatGPT Custom GPT Actions integration testing via a public HTTPS tunnel.

**Status:** Runbook ready. Manual ChatGPT UI import and testing has **not yet been performed** by the user.

This phase is **runbook-only**: Documentation and local verification provided. User performs manual ChatGPT Custom GPT setup and testing via ChatGPT UI.

⚠️ **Important:** Tunnel URLs are temporary and must NOT be committed to the repo. `/tmp/brainbridge-openapi-chatgpt.json` is for local use only.

## Automated Stack Setup

```bash
# Terminal 1: Bridge Server (port 3053)
cd ~/Repos/stevewesthoek/brain-bridge/packages/bridge
node dist/server.js

# Terminal 2: Local Agent (port 3052, connected to bridge)
BRIDGE_URL=ws://127.0.0.1:3053 DEVICE_TOKEN=test-device \
  node packages/cli/dist/index.js serve

# Terminal 3: Web App (port 3000)
cd ~/Repos/stevewesthoek/brain-bridge/apps/web
npm run dev

# Terminal 4: Start tunnel
cloudflared tunnel --url http://localhost:3000
```

## Tunnel Setup (One-Time)

```bash
# Install if needed
brew install cloudflare-warp

# Start tunnel (Terminal 4)
cloudflared tunnel --url http://localhost:3000

# Copy the output tunnel URL
# Example: https://onion-lan-folding-diamond.trycloudflare.com
```

## Local Endpoint Verification

```bash
# Verify local endpoints work before proceeding to tunnel
curl -s http://127.0.0.1:3000/api/openapi | jq '.info.title'
curl -s -X POST http://127.0.0.1:3000/api/actions/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"brain","limit":1}' | jq '.results[0].path'
```

Expected output:
- OpenAPI returns `"Brain Bridge API"`
- Search returns a file path like `"operations/runbooks/..."`

## Prepare OpenAPI for ChatGPT Import

1. Get the tunnel URL from cloudflared output in Terminal 4
2. Update the server URL in the OpenAPI spec:

```bash
TUNNEL_URL="https://your-tunnel-domain.trycloudflare.com"
jq '.servers[0].url = "'$TUNNEL_URL'"' docs/openapi.chatgpt.json > /tmp/brainbridge-openapi-chatgpt.json
cat /tmp/brainbridge-openapi-chatgpt.json
```

3. Verify it looks correct (servers[0].url should have your tunnel domain)

## Manual ChatGPT Custom GPT Setup

### Step 1: Access ChatGPT Custom GPTs

1. Go to https://chatgpt.com
2. Click your profile → **My GPTs**
3. Click **+ Create a GPT**

### Step 2: Import OpenAPI Schema

1. Go to the **Actions** tab
2. Click **Create new action**
3. Under **Schema**, paste the entire contents of `/tmp/brainbridge-openapi-chatgpt.json`
4. Click **Save** (ChatGPT will validate the schema)

You should see:
- ✓ Schema validated successfully
- Two actions visible: `/api/actions/search` and `/api/actions/read`

### Step 3: Test Search Action

In the ChatGPT chat box (bottom of Create GPT screen), type:

```
Search my brain for files about "brain" and return 2 results.
```

Expected response:
- ChatGPT calls `/api/actions/search` via the tunnel
- Returns 2 file paths, titles, and snippets
- Paths should be relative to your vault (e.g., `operations/runbooks/...`)

### Step 4: Test Read Action

In the same chat:

```
Read the first file from the search results above.
```

Expected response:
- ChatGPT calls `/api/actions/read` with the first path
- Returns the full file content
- Content should match what's in your local vault

## Troubleshooting

### "Request failed" or timeout

- Verify tunnel is still running: `ps aux | grep cloudflared | grep -v grep`
- Check tunnel URL hasn't changed (it's temporary, expires after inactivity)
- Verify local endpoints still work: `curl http://127.0.0.1:3000/api/openapi`
- Restart tunnel if needed

### "Invalid OpenAPI schema"

- Verify the schema is valid JSON: `jq . /tmp/brainbridge-openapi-chatgpt.json`
- Confirm both `/api/actions/search` and `/api/actions/read` paths are present
- Check that `servers[0].url` uses `https://` (not `http://`)

### "No results" from search

- Verify vault has files: Check `mind/` folder structure
- Test local search first: `curl -s -X POST http://127.0.0.1:3000/api/actions/search ...`
- Check agent is connected to bridge: Verify bridge/agent logs show connection

### "Path not found" from read

- Use paths exactly as returned by search (case-sensitive)
- Paths are relative to vault root
- Verify no `../` traversal attempts

## Phase 3.4 Scope

**Included:**
- ✓ Automated stack startup (bridge, agent, web app)
- ✓ Tunnel setup via cloudflared
- ✓ Local endpoint verification
- ✓ OpenAPI spec preparation for ChatGPT import
- ✓ Manual ChatGPT Custom GPT setup steps
- ✓ Test prompts and expected results
- ✓ Troubleshooting guide

**Not included:**
- ✗ Automated ChatGPT import (manual UI interaction required)
- ✗ Automated test result verification (user must observe outcomes)
- ✗ Production auth/hardening
- ✗ Persistent tunnel (temporary by design for MVP)
- ✗ Multiple vaults or team support

## Testing Checklist

- [ ] All three servers running (bridge, agent, web app)
- [ ] Tunnel created and URL captured
- [ ] Local endpoints return valid responses
- [ ] OpenAPI spec updated with tunnel URL
- [ ] ChatGPT Custom GPT created and actions imported
- [ ] Search test returns file paths
- [ ] Read test returns file content
- [ ] Both tests work through public tunnel (not localhost)

## Phases Status

- **Phase 1.1** (Local MVP): ✅ Complete
- **Phase 2.0** (Direct Relay): ✅ Complete
- **Phase 2.1** (Bridge Relay): ✅ Complete
- **Phase 3.0** (Search Action): ✅ Complete
- **Phase 3.1** (ChatGPT Setup): ✅ Complete
- **Phase 3.2** (Read Action): ✅ Complete
- **Phase 3.3** (ChatGPT Import Test): ✅ Complete — Runbook documented
- **Phase 3.4** (ChatGPT UI Test Runbook): ✅ Runbook ready — awaiting manual ChatGPT UI verification

## Next Steps

1. Ensure all servers are running
2. Create and run tunnel
3. Prepare OpenAPI spec with tunnel URL
4. Follow manual ChatGPT Custom GPT setup steps
5. Execute test prompts
6. Observe and verify results
7. Document outcomes

If tests pass, Brain Bridge MVP is feature-complete for ChatGPT integration.
