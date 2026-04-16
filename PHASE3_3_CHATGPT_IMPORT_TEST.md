# Phase 3.3: ChatGPT Custom Action Import Test & Runbook

Phase 3.3 is a verification and documentation phase for importing Brain Bridge search/read actions into a ChatGPT Custom GPT.

This phase does NOT add new actions—it provides the runbook for manual ChatGPT UI testing.

## Local Verification (Automated)

### 1. Start Brain Bridge Stack

```bash
# Terminal 1: Bridge Server (port 3053)
cd ~/Repos/stevewesthoek/brain-bridge/packages/bridge
node dist/server.js

# Terminal 2: Local Agent (port 3052)
BRIDGE_URL=ws://127.0.0.1:3053 DEVICE_TOKEN=test-device \
  node packages/cli/dist/index.js serve

# Terminal 3: Web App (port 3000)
cd ~/Repos/stevewesthoek/brain-bridge/apps/web
npm run dev
```

### 2. Verify Local Endpoints

```bash
# Check OpenAPI spec
curl -s http://127.0.0.1:3000/api/openapi | jq '.openapi, .paths | keys'

# Test search action
curl -s -X POST http://127.0.0.1:3000/api/actions/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"brain","limit":2}'

# Test read action
curl -s -X POST http://127.0.0.1:3000/api/actions/read \
  -H 'Content-Type: application/json' \
  -d '{"path":"mind/home.md"}'
```

Expected responses:
- Search returns `{results: [...]}`
- Read returns `{path: "mind/home.md", content: "..."}`

## Public Tunnel Setup (Manual)

### Option A: Cloudflare Tunnel (Recommended)

```bash
# Install (if needed)
brew install cloudflare-warp

# Start tunnel to localhost:3000
cloudflared tunnel --url http://localhost:3000
```

Output:
```
Tunneling ingress from https://abc123def456.trycloudflare.com
```

**Copy the URL:** `https://abc123def456.trycloudflare.com`

### Option B: ngrok

```bash
# Install (if needed)
brew install ngrok

# Authenticate (one-time)
ngrok config add-authtoken <your-ngrok-token>

# Start tunnel
ngrok http 3000
```

Output:
```
Forwarding  https://abc123-xyz789.ngrok.io -> http://localhost:3000
```

**Copy the URL:** `https://abc123-xyz789.ngrok.io`

## ChatGPT Custom GPT Import (Manual)

### Step 1: Create Import OpenAPI File

```bash
# Copy the static spec with tunnel URL
cp docs/openapi.chatgpt.json /tmp/brainbridge-openapi-chatgpt.json

# Edit the file to replace server URL
# Change servers[0].url from "http://localhost:3000" to your actual tunnel URL
# For example: "https://abc123def456.trycloudflare.com"
```

Or do it programmatically:

```bash
TUNNEL_URL="https://your-tunnel-domain.trycloudflare.com"
jq '.servers[0].url = "'$TUNNEL_URL'"' docs/openapi.chatgpt.json > /tmp/brainbridge-openapi-chatgpt.json
```

### Step 2: Import into ChatGPT

1. Go to https://chatgpt.com
2. Click your profile → **My GPTs**
3. Click **+ Create a GPT**
4. Go to the **Actions** tab
5. Click **Create new action**
6. Under **Schema**, paste the contents of `/tmp/brainbridge-openapi-chatgpt.json`
7. Click **Save** (it will validate the schema)

### Step 3: Test in ChatGPT

#### Test Prompt 1: Search

```
Search my brain for files about brain and return two results.
```

Expected response:
- ChatGPT calls `/api/actions/search` with query "brain"
- Returns 2 file paths, titles, and snippets

#### Test Prompt 2: Read

```
Read the first file from the previous search.
```

Expected response:
- ChatGPT calls `/api/actions/read` with the path from the search result
- Returns full file content

## Verify Tunnel Endpoint (Manual)

```bash
TUNNEL_URL="https://your-tunnel-domain.trycloudflare.com"

# Test OpenAPI
curl -s $TUNNEL_URL/api/openapi | jq '.openapi'

# Test search
curl -s -X POST $TUNNEL_URL/api/actions/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"brain","limit":2}' | jq .

# Test read
curl -s -X POST $TUNNEL_URL/api/actions/read \
  -H 'Content-Type: application/json' \
  -d '{"path":"mind/home.md"}' | jq .
```

All should return valid responses with 200 status.

## Phase 3.3 Scope

**Included:**
- ✓ Local stack verification (search + read working)
- ✓ Tunnel setup documentation (Cloudflare + ngrok)
- ✓ ChatGPT Custom GPT import steps
- ✓ Manual test prompts and expected results
- ✓ Runbook for end-to-end verification

**Not included:**
- ✗ New actions (search and read only)
- ✗ Create/append/export actions
- ✗ Production authentication
- ✗ Database persistence
- ✗ Multi-user/team support
- ✗ Automated tunnel setup or deployment

## Known Limitations

- **Tunnel URL is temporary:** Cloudflare and ngrok tunnels expire after periods of inactivity. For production, use a custom domain.
- **No persistent auth:** Tunnel has no authentication. For production, add API key or OAuth.
- **Local-only vault:** The vault is still local to your machine. For production, move vault to a server.
- **Development only:** This is a development/testing setup. Not intended for production use.

## Troubleshooting

### "Search/read returns empty or error"

- Verify vault is connected: `node packages/cli/dist/index.js status`
- Check vault path exists: `ls $VAULT_PATH` (from config)
- Verify web app is running: `curl http://127.0.0.1:3000/api/openapi`

### "Tunnel not responding"

- Check tunnel is still running in original terminal
- Verify tunnel URL hasn't expired
- Try restarting tunnel

### "ChatGPT import fails"

- Verify OpenAPI spec is valid JSON: `jq . /tmp/brainbridge-openapi-chatgpt.json`
- Confirm server URL is correct (use actual tunnel domain, not localhost)
- Check both `/api/actions/search` and `/api/actions/read` are in spec

## Phase Summary

- **Phase 1.1** (Local MVP): ✅ Complete
- **Phase 2.0** (Direct Relay): ✅ Complete
- **Phase 2.1** (Bridge Relay): ✅ Complete
- **Phase 3.0** (Search Action): ✅ Complete
- **Phase 3.1** (ChatGPT Setup): ✅ Complete
- **Phase 3.2** (Read Action): ✅ Complete
- **Phase 3.3** (ChatGPT Import Test): ✅ Complete — Manual testing ready

## Next Steps

1. Start the Brain Bridge stack locally
2. Expose port 3000 via Cloudflare or ngrok tunnel
3. Follow the ChatGPT Custom GPT import steps
4. Test with the provided prompts
5. Share the GPT or publish with your team
