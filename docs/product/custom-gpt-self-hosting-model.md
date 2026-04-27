# Custom GPT Endpoint Model for v1.2.0-beta

**Status:** Canonical documentation for the BuildFlow Custom GPT endpoint architecture and self-hosted setup for v1.2.0-beta.

**Audience:** Self-hosted GitHub users, BuildFlow beta testers, and anyone deploying BuildFlow locally.

**See also:** [`docs/product/custom-gpt-connection-architecture.md`](./custom-gpt-connection-architecture.md) for architecture decisions and infrastructure details.

---

## Quick answer: How do I use the Custom GPT with my own local BuildFlow?

**For v1.2.0-beta, you have three options:**

1. **Use BuildFlow-managed relay** (RECOMMENDED: no tunnel setup needed)
   - URL: `https://buildflow.prochat.tools/api/openapi`
   - Token: your own `BUILDFLOW_ACTION_TOKEN` (generated locally, stored in `.env.local`)
   - **How it works:** Your local agent connects outbound to a managed relay; relay routes Custom GPT requests to your machine
   - **Status:** ✅ Works with default setup, data stays local, no external account needed
   - **See:** → Setup section below

2. **Use your local endpoint directly** (local testing, no ChatGPT)
   - URL: `http://127.0.0.1:3054/api/openapi`
   - Token: Your locally generated `BUILDFLOW_ACTION_TOKEN` (from env var on your machine)
   - **Limitation:** Custom GPT cannot reach `localhost` from ChatGPT's servers (different network, no public routing)
   - **Status:** Works for local development only, not for production ChatGPT use

3. **Use your own public HTTPS tunnel** (advanced, for power users)
   - Set up a tunnel (Cloudflare Tunnel, ngrok, Tailscale Funnel, etc.) to your local machine
   - Point the Custom GPT to your tunnel's HTTPS URL
   - Use your own `BUILDFLOW_ACTION_TOKEN`
   - **Status:** Fully works, optional for users who prefer to manage their own endpoint

---

## The endpoint model: What `https://buildflow.prochat.tools` does

### Current behavior

`https://buildflow.prochat.tools` is the **maintainer's public demonstration endpoint** only.

- **Routes to:** The maintainer's local BuildFlow stack (via Cloudflare Tunnel)
- **Authentication:** Requires the **maintainer's token**, not yours
- **Use case:** Demonstrating BuildFlow to new users with example context
- **Security model:** Bearer token (`Authorization: Bearer <token>`)
- **Your files:** NOT accessible through this endpoint unless you somehow run BuildFlow on the maintainer's machine

### Why it only serves the maintainer

BuildFlow uses simple bearer token authentication:

```typescript
// apps/web/src/lib/actionAuth.ts
const token = process.env.BUILDFLOW_ACTION_TOKEN

if (!authHeader || authHeader !== expectedBearer) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

- When you set your own `BUILDFLOW_ACTION_TOKEN` on your machine, the `/api/actions/*` endpoints will only accept **that token**
- The public `buildflow.prochat.tools` endpoint uses **a different token** (the maintainer's)
- If you send your token to the maintainer's endpoint, you'll get a 401 Unauthorized error
- If you send the maintainer's token to your local endpoint, you'll get a 401 error

**Result:** Each BuildFlow instance is isolated by token. You cannot access your local files through the maintainer's tunnel.

---

## Can a public Custom GPT safely access a user's local BuildFlow?

### No, not without a user-owned tunnel.

**Why:**

1. **ChatGPT runs on OpenAI's servers** — it cannot make HTTP requests to `127.0.0.1` or `localhost` on your machine
2. **The maintainer's tunnel only reaches the maintainer's machine** — it does not route to your machine
3. **BuildFlow has no relay/routing layer in v1.2.0-beta** that can multiplex requests to different user machines

### Relay/device coordination exists but is not configured for this

The bridge package (`packages/bridge/`) contains infrastructure for device registry and WebSocket-based routing:

```typescript
// packages/bridge/src/storage/device-registry.ts
export function saveDevice(device: PersistedDevice): void {
  // Stores device metadata locally
}
```

**However:**

- This infrastructure is **not wired up in the public endpoint** for v1.2.0-beta
- There is no public device discovery or per-user routing
- The v1.2.0-beta release focuses on **local-first setup**, not multi-device coordination
- **Status for v1.2.0-beta:** Device relay is infrastructure for future Pro/Team features, not available now

---

## The recommended v1.2.0-beta setup for self-hosted users

### Setup path: Local testing only (no Custom GPT)

**When:** You're testing BuildFlow locally and don't need ChatGPT integration yet.

**Steps:**

1. Clone the repo and run `pnpm dev` or `pnpm local:restart`
2. Agent runs on `http://127.0.0.1:3052`
3. Relay runs on `http://127.0.0.1:3053` (if `BUILDFLOW_BACKEND_MODE=relay-agent`)
4. Web/OpenAPI runs on `http://127.0.0.1:3054`
5. Use the dashboard at `http://localhost:3054/dashboard`
6. **Custom GPT:** Not usable yet (localhost is not reachable from ChatGPT)

**Token setup:**

```bash
# Generate a token (run once)
BUILDFLOW_ACTION_TOKEN=$(openssl rand -hex 32)
echo "BUILDFLOW_ACTION_TOKEN=$BUILDFLOW_ACTION_TOKEN"
# Store it in apps/web/.env.local
echo "BUILDFLOW_ACTION_TOKEN=$BUILDFLOW_ACTION_TOKEN" > apps/web/.env.local
```

**Verification:**

```bash
# Should return 200 with BuildFlow status
curl -H "Authorization: Bearer $BUILDFLOW_ACTION_TOKEN" \
  http://127.0.0.1:3054/api/actions/status
```

### Setup path: Custom GPT with your own tunnel (recommended for real usage)

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

---

## The maintainer endpoint: What works today

### `https://buildflow.prochat.tools/api/openapi`

**Current state:** A working example endpoint to import into ChatGPT.

**What it does:**
- Returns a valid OpenAPI 3.1.0 schema with the BuildFlow Custom GPT actions
- Accepts requests with the maintainer's bearer token
- Routes to the maintainer's local BuildFlow environment
- Demonstrates what BuildFlow does (searching, reading, writing to local context)

**What it doesn't do:**
- Serve your files
- Route to your machine
- Accept your token
- Support multi-device relay (yet)

**Use case:** 
- Seeing BuildFlow in action without setting up a tunnel
- Understanding the Custom GPT integration
- Sharing a demo with others (showing the maintainer's context)

---

## What changes after v1.2.0-beta

### v1.2.0 (stable Free GitHub)

- Same local-first model
- Docs refined based on beta feedback
- Tunnel setup recommendations clarified
- Troubleshooting for common tunnel configurations added

### Future: BuildFlow Pro and device relay (not in v1.2.0-beta)

The relay infrastructure in `packages/bridge/` is designed for:
- Per-user device registration
- Token-scoped device routing
- Multi-device coordination
- Hosted relay for Pro users

**Status for v1.2.0-beta:** Foundations exist, not exposed. Relay is infrastructure for future features.

---

## FAQ: Custom GPT endpoint and self-hosting

### Q: Can I use the maintainer's endpoint with my own token?

**A:** No. The maintainer's endpoint is hardcoded to accept only the maintainer's token. If you send your token, you'll get 401 Unauthorized.

### Q: Can I use the maintainer's endpoint to access my files without a tunnel?

**A:** No. The tunnel points to the maintainer's machine, not yours. Even with a valid token, your files are not on the maintainer's machine.

### Q: If I set up a tunnel, do I need to change anything in my code?

**A:** No. BuildFlow automatically works with any HTTPS URL pointing to `http://127.0.0.1:3054` on your machine. Just update the Custom GPT to use your tunnel URL.

### Q: Is the token sent to ChatGPT in plaintext?

**A:** No. The token is sent via HTTPS `Authorization: Bearer` header (not in the URL). ChatGPT stores the token securely in the Custom GPT's authentication settings.

### Q: Can I use the relay without a tunnel?

**A:** Not in v1.2.0-beta. The relay (`http://127.0.0.1:3053`) is for local agent coordination. For ChatGPT access, you need an HTTPS tunnel (network requirement, not BuildFlow limitation).

### Q: What if I use the wrong token?

**A:** You'll get a 401 Unauthorized error. Verify your token matches the `BUILDFLOW_ACTION_TOKEN` env var on your machine.

### Q: Can multiple users share one tunnel?

**A:** Technically yes, but **not recommended**. Each user should set their own token and have their own tunnel. Sharing a tunnel + token = sharing full file access to both BuildFlow instances.

### Q: What about CORS or preflight requests?

**A:** BuildFlow returns appropriate CORS headers. Preflight (OPTIONS) requests are handled by the web layer. If you get a CORS error, verify your tunnel is correctly proxying HTTPS requests.

### Q: Do I need to keep the tunnel running?

**A:** Yes. When ChatGPT calls your Custom GPT, it needs to reach your tunnel to get your files. If the tunnel is down, the Custom GPT won't work.

---

## Beta blockers (v1.2.0-beta release gates)

Before v1.2.0-beta is marked ready, these must be true:

- [ ] OpenAPI schema is valid and importable into ChatGPT Custom GPT editor
- [ ] Local endpoint returns 200 for `/api/openapi` with valid token
- [ ] Local endpoint returns 401 without token or with wrong token
- [ ] `https://buildflow.prochat.tools/api/openapi` returns 200 (public endpoint working)
- [ ] Custom GPT actions execute successfully against both local (via tunnel) and maintainer endpoints
- [ ] Bearer token authentication works for all documented scenarios
- [ ] Documentation clearly distinguishes maintainer endpoint, local endpoint, and self-hosted tunnel
- [ ] At least one fresh-install user has tested Custom GPT setup from the README without help

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

**Public endpoint (maintainer only):**
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
