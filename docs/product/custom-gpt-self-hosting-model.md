# Custom GPT Endpoint Model for v1.2.0-beta

**Status:** Canonical documentation for the BuildFlow Custom GPT endpoint architecture and self-hosted setup for v1.2.0-beta.

**Audience:** Self-hosted GitHub users, BuildFlow beta testers, and anyone deploying BuildFlow locally.

**See also:** [`docs/product/custom-gpt-connection-architecture.md`](./custom-gpt-connection-architecture.md) for architecture decisions and infrastructure details.

---

## Quick answer: How do I use the Custom GPT with my own local BuildFlow?

**For v1.2.0-beta, you have two options:**

### Option 1: Use BuildFlow-managed relay (RECOMMENDED for most users) ✅

**URL:** `https://buildflow.prochat.tools/api/openapi`  
**Token:** Your own `BUILDFLOW_ACTION_TOKEN` (generated locally, stored in `.env.local`)

**How it works:**
- Your local BuildFlow agent connects outbound to `buildflow.prochat.tools` (managed relay)
- Relay registers your device and maintains a persistent WebSocket connection
- Custom GPT sends requests to relay with your token
- Relay routes requests to your device based on token
- Results return to Custom GPT (your data stays on your machine)

**Setup:**
```bash
# 1. Generate your token (do this once)
BUILDFLOW_ACTION_TOKEN=$(openssl rand -hex 32)

# 2. Set in your .env.local
echo "BUILDFLOW_ACTION_TOKEN=$BUILDFLOW_ACTION_TOKEN" > apps/web/.env.local

# 3. Enable relay mode and start
export BUILDFLOW_BACKEND_MODE=relay-agent
pnpm local:start

# 4. Verify connection
curl https://buildflow.prochat.tools/health
# Should show: "connectedDevices": 1

# 5. Import Custom GPT at https://chatgpt.com/gpts/editor
# URL: https://buildflow.prochat.tools/api/openapi
# Auth: Bearer token (from above)
```

**Status:** ✅ Works out of the box, no tunnel setup, data stays local, no external account needed

### Option 2: Use your own public HTTPS tunnel (for users who prefer self-hosting)

**When:** You want complete control over your endpoint and don't use the managed relay.

**Setup:**
- Install tunnel provider: Cloudflare, ngrok, Tailscale Funnel, or similar
- Point tunnel to `http://localhost:3054`
- Use tunnel's HTTPS URL in Custom GPT OpenAPI import
- Use your own `BUILDFLOW_ACTION_TOKEN`

**Status:** ✅ Fully works, optional, for advanced users only

---

## The endpoint model: How the managed relay routes to your device

### How `https://buildflow.prochat.tools` works with your token

`https://buildflow.prochat.tools` is a **public relay endpoint** that routes requests to connected user devices.

- **Registration:** When you start BuildFlow with relay mode enabled, your local agent registers with the relay using your `BUILDFLOW_ACTION_TOKEN`
- **Connection:** Relay stores a mapping: `token → deviceId` and opens a WebSocket connection to your agent
- **Routing:** When Custom GPT sends a request with your token, relay looks up your device and forwards the command
- **Execution:** Your local agent processes the request against your files
- **Response:** Results return to relay, which sends them back to Custom GPT
- **Security:** Each token is independent; relay cannot route one user's requests to another user's device

### Multi-user isolation

- **Each user has their own token** (generated locally, never shared)
- **Each token maps to one device** (your local agent)
- **Relay validates token before routing** (401 Unauthorized if token is invalid or not registered)
- **Your files only:** Only your device can access your files; relay is just a pass-through

**Example:**
```
User A's token "abc123..." → routes to User A's device
User B's token "def456..." → routes to User B's device
Unknown token "xyz789..." → returns 401 Unauthorized
```

### Privacy model

- **Your files stay local** on your machine only
- **Queries and results transit relay memory** while processing (not persisted)
- **Relay has in-memory access during transit** (no end-to-end encryption in v1.2.0-beta)
- **Transport is HTTPS/WSS** (encrypted in transit over network)
- **Audit logs contain metadata only** (no payloads, queries, or file content)

**Honest statement:** The relay operator technically has in-memory visibility of requests while they're being routed. This is a trade-off for not requiring you to set up and manage your own tunnel. If you prefer complete privacy, use the tunnel option (Option 2 above) instead.

---

## Recommended setup: Use the managed relay (most users)

**Steps:**

1. Clone the repo: `git clone https://github.com/stevewesthoek/buildflow.git`

2. Generate your token (run once):
   ```bash
   BUILDFLOW_ACTION_TOKEN=$(openssl rand -hex 32)
   echo "BUILDFLOW_ACTION_TOKEN=$BUILDFLOW_ACTION_TOKEN" > apps/web/.env.local
   ```

3. Set relay mode and start:
   ```bash
   export BUILDFLOW_BACKEND_MODE=relay-agent
   pnpm install
   pnpm local:start
   ```

4. Verify relay connection:
   ```bash
   # Should show: "connectedDevices": 1
   curl https://buildflow.prochat.tools/health
   ```

5. Create Custom GPT:
   - Go to https://chatgpt.com/gpts/editor (ChatGPT Plus required)
   - Click "Create new action"
   - Click "Import from URL"
   - Enter: `https://buildflow.prochat.tools/api/openapi`
   - Set auth type: Bearer token
   - Paste your `BUILDFLOW_ACTION_TOKEN` (from step 2)
   - Click "Import"
   - Test with: "Get BuildFlow status"

6. Test end-to-end:
   - Ask ChatGPT: "List my BuildFlow sources"
   - Ask ChatGPT: "Search my context for [something]"

---

## Alternative setup: Use your own tunnel (for power users)

**When:** You want to use the Custom GPT with your own local BuildFlow instance.

**Steps:**

1. **Set up a public HTTPS tunnel to your local machine**

   **Option A: Cloudflare Tunnel (recommended for beta)**
   
   Quick and free. See [Cloudflare Tunnel documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) for full setup.
   
   Quick setup:
   ```bash
   # Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/
   cloudflared tunnel --url http://localhost:3054
   # This generates a public HTTPS URL instantly
   ```
   
   For a permanent named tunnel, see the provider docs.

   **Option B: ngrok (simple, free tier available)**
   ```bash
   ngrok http 3054
   # Returns: https://xxxx-xxxx-xxxx-xxxx.ngrok.io
   # Use this URL in the Custom GPT import
   ```

   **Option C: Tailscale Funnel (advanced, requires public HTTPS)**
   
   Note: Tailscale private IPs are **not reachable by ChatGPT**. Use only if:
   - You configure Tailscale Funnel/Serve to expose a public HTTPS path
   - See [Tailscale Funnel docs](https://tailscale.com/kb/1457/funnel/)
   - Then use your Tailscale public HTTPS URL in the Custom GPT (similar to ngrok)

2. **Generate your token** (do this once per machine):
   ```bash
   BUILDFLOW_ACTION_TOKEN=$(openssl rand -hex 32)
   echo "BUILDFLOW_ACTION_TOKEN=$BUILDFLOW_ACTION_TOKEN"
   echo "BUILDFLOW_ACTION_TOKEN=$BUILDFLOW_ACTION_TOKEN" > apps/web/.env.local
   ```

3. **Start BuildFlow locally:**
   ```bash
   pnpm local:restart
   ```

4. **Verify the local endpoint works:**
   ```bash
   curl -H "Authorization: Bearer $BUILDFLOW_ACTION_TOKEN" \
     http://127.0.0.1:3054/api/actions/status
   ```

5. **Create a Custom GPT in ChatGPT:**
   - Go to https://chatgpt.com/gpts/editor (requires ChatGPT Plus)
   - Scroll to "Actions" and click "Create new action"
   - Click "Import from URL"
   - Enter your tunnel URL (use the HTTPS URL from your tunnel provider):
     - **Cloudflare:** `https://<your-cloudflare-tunnel-url>/api/openapi`
     - **ngrok:** `https://<your-ngrok-url>.ngrok.io/api/openapi`
     - **Tailscale Funnel:** `https://<your-tailscale-public-url>/api/openapi`
   - Set authentication: **Bearer token**
   - Paste your `<your-buildflow-action-token>` (from `apps/web/.env.local`)
   - Click "Import"
   - Test with: "Get BuildFlow status"

6. **Test end-to-end:**
   - In the GPT, ask: "List my BuildFlow sources"
   - In the GPT, ask: "Search my context for [something]"
   - Verify your local files appear

**Important notes for tunnel users:**
- Keep the tunnel running while you use the Custom GPT. If the tunnel stops, Custom GPT requests will fail.
- For persistent setup, create a permanent named tunnel (see your tunnel provider's docs) and run it in the background.
- Some tunnel providers (ngrok free tier) have short session limits; upgrade or use Cloudflare for longer sessions.

---

---

## Privacy and Security Model for the Managed Relay

### What data transits the relay

**During your Custom GPT requests:**
- Queries (e.g., "search my context for...")
- Search results and file contents
- Write operations and artifact creation

**These transit the relay in memory while being processed, then are discarded. They are not persisted to disk.**

### What's NOT logged

- Search queries
- File content
- Response bodies
- Bearer tokens
- Raw error messages from your device

**What IS logged (metadata only):**
- Request ID and timestamp
- Action name (e.g., "action_proxy:search")
- Status (success/error/timeout)
- Duration

### Privacy trade-off

The managed relay at `https://buildflow.prochat.tools` is convenient for users who don't want to set up a tunnel. The trade-off:

- ✅ No tunnel setup or DNS configuration needed
- ✅ Files stay on your machine
- ✅ Transport is encrypted (HTTPS/WSS)
- ⚠️ Relay operator has in-memory access to requests while routing

**If you need stronger privacy:** Use Option 2 (your own tunnel). That way, you control the endpoint and keep complete privacy.

---

## What changes after v1.2.0-beta

### v1.2.0 (stable Free GitHub)

- Same managed relay model
- Performance monitoring and rate limiting added
- Docs refined based on beta feedback
- Support for multiple local agents per user (future version)

### Future: BuildFlow Pro and advanced relay features

- Team device sharing
- Advanced rate limiting and quotas
- Custom relay endpoints for Pro users
- Optional end-to-end encryption

---

## FAQ: Custom GPT endpoint and self-hosting

### Q: How does the managed relay route my requests to my device?

**A:** The relay stores a mapping of token → device. When you start BuildFlow with relay mode, your device connects to the relay via WebSocket. When Custom GPT sends a request with your token, the relay looks it up and forwards the command to your device's WebSocket connection. Results return to relay, which sends them back to ChatGPT. No tunneling needed.

### Q: Is my token secure?

**A:** Your token is:
- Generated locally (never leaves your machine initially)
- Sent to relay only when your device connects (WebSocket over WSS)
- Used to authenticate each Custom GPT request (Bearer token, HTTPS header)
- Never logged by the relay in plaintext

Do not share your token. If compromised, rotate it by generating a new one and restarting BuildFlow.

### Q: Will the relay operator access my files?

**A:** No. Your files stay on your machine. However, the relay operator technically has in-memory visibility of request/response data while routing. This is a trade-off for convenience (no tunnel setup). If you prefer complete privacy, use your own tunnel instead.

### Q: What if I set up my own tunnel instead?

**A:** You can set up Cloudflare Tunnel, ngrok, or Tailscale Funnel pointing to your local BuildFlow at `http://localhost:3054`. Then use your tunnel URL in the Custom GPT import. You maintain complete control of your endpoint.

### Q: Is the token sent over HTTPS?

**A:** Yes. The token is sent via `Authorization: Bearer` header over HTTPS (never in URL or plaintext). ChatGPT stores it securely in the Custom GPT's authentication settings.

### Q: What if I use the wrong token?

**A:** You'll get a 401 Unauthorized error. Verify your token matches the `BUILDFLOW_ACTION_TOKEN` env var and that your device is connected (check `curl https://buildflow.prochat.tools/health`).

### Q: Can multiple users use the same relay instance?

**A:** Yes. Each user has their own token and their own connected device. The relay isolates them by token—no cross-contamination.

**A:** Technically yes, but **not recommended**. Each user should set their own token and have their own tunnel. Sharing a tunnel + token = sharing full file access to both BuildFlow instances.

### Q: What about CORS or preflight requests?

**A:** BuildFlow returns appropriate CORS headers. Preflight (OPTIONS) requests are handled by the web layer. If you get a CORS error, verify your tunnel is correctly proxying HTTPS requests.

---

## Beta readiness checklist (v1.2.0-beta)

Before v1.2.0-beta is marked ready:

- [ ] OpenAPI schema is valid and importable into ChatGPT Custom GPT editor
- [ ] Managed relay endpoint at `https://buildflow.prochat.tools/api/openapi` returns 200
- [ ] Custom GPT actions execute successfully through managed relay with valid token
- [ ] Custom GPT returns 401 Unauthorized without token or with invalid token
- [ ] Bearer token authentication works end-to-end
- [ ] Multi-user routing is verified (multiple devices connected simultaneously)
- [ ] At least one fresh-install user has tested managed relay setup from the README without help
- [ ] Tunnel setup documentation is available for advanced users who prefer self-hosting

---

## Security considerations

### Local token management

- Your `BUILDFLOW_ACTION_TOKEN` gives **full read/write access** to all connected sources
- Store it in `.env.local` or your shell profile, not in git
- Rotate it if you share your machine
- Consider different tokens for different use cases (if you run multiple instances)

### Tunnel security

- Use HTTPS always (tunnel providers enforce this)
- Keep your tunnel credentials (Cloudflare, ngrok, etc.) secret
- Tunnel URLs are semi-public (anyone with the URL can reach your machine)
- Restrict tunnel access to your IP if the provider supports it (ngrok does)
- BuildFlow still validates your token, so unauthorized access requires both the URL and the token

### What ChatGPT can see

When you use BuildFlow with ChatGPT:
- ChatGPT sees only the files you explicitly search/read through the Custom GPT
- ChatGPT does **not** see your folder structure, hidden files, or unread context
- The Custom GPT can write new artifacts to your local `.buildflow/` folder, but only if you allow it in the action
- Your token is used by ChatGPT to authenticate requests to your BuildFlow endpoint

### What stays local

- Source files (repos, notes, markdown) — not uploaded
- Indexing and search — happens on your machine
- File reads/writes — routed through your local agent
- Context scanning — local only

---

## Verification checklist for v1.2.0-beta Custom GPT setup

**Local setup:**
```bash
# 1. Type-check passes
pnpm --dir apps/web type-check

# 2. Services start
pnpm local:restart

# 3. Local endpoint returns 200 with auth
curl -H "Authorization: Bearer $BUILDFLOW_ACTION_TOKEN" \
  http://127.0.0.1:3054/api/actions/status

# 4. Local endpoint returns 401 without auth
curl http://127.0.0.1:3054/api/actions/status

# 5. OpenAPI schema is valid JSON
curl -H "Authorization: Bearer $BUILDFLOW_ACTION_TOKEN" \
  http://127.0.0.1:3054/api/openapi | jq '.info.title'
```

**Public endpoint (if deployed):**
```bash
# 6. Public endpoint returns 200
curl https://buildflow.prochat.tools/api/openapi | jq '.info.title'

# 7. Public endpoint returns 401 without auth
curl https://buildflow.prochat.tools/api/actions/status
```

**Custom GPT (if testing):**
- [ ] Can import OpenAPI schema from your tunnel URL
- [ ] Can authenticate with your token
- [ ] Can call getBuildFlowStatus successfully
- [ ] Can call listBuildFlowSources successfully
- [ ] Can read a file from a connected source

---

## Next steps

1. **For local testing:** Follow the "Local testing only" setup above
2. **For Custom GPT use:** Pick a tunnel (Cloudflare/ngrok/Tailscale) and follow the tunnel setup steps
3. **For contributions:** Test the endpoint model and report any gaps in the docs or setup
4. **For Pro/team features:** Watch the roadmap; relay support for multi-user scenarios is planned post-v1.2

---

**Document version:** v1.2.0-beta (2026-04-27)

**Status:** Canonical for v1.2.0-beta release gate and Custom GPT setup documentation.

**Maintainer:** See CONTRIBUTING.md for questions or issues.
