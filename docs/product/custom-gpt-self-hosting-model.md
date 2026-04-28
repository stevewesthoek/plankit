# Custom GPT Endpoint Model for v1.2.0-beta

**Status:** Canonical documentation for the BuildFlow Custom GPT endpoint model and self-hosting setup for v1.2.0-beta.

**Audience:** Self-hosted GitHub users, BuildFlow beta testers, and anyone deploying BuildFlow locally.

**See also:** [`docs/product/custom-gpt-connection-architecture.md`](./custom-gpt-connection-architecture.md) for architecture decisions and mode boundaries.

---

## Quick answer: How do I use the Custom GPT with my own BuildFlow?

For v1.2.0-beta, there are two product modes:

1. **BuildFlow Local** - the free GitHub path. Fully self-hosted. You own the local agent, web app, relay, and any endpoint or tunnel you choose.
2. **BuildFlow Managed** - the future paid convenience path. BuildFlow operates the managed relay infrastructure.

If you are using the free GitHub beta, start with **BuildFlow Local**. You do not need BuildFlow Managed to run BuildFlow locally or to use the dashboard at `http://127.0.0.1:3054/dashboard`.

## BuildFlow Local: fully self-hosted

**Use this when:** you want the free GitHub version and want to keep everything under your control.

**Endpoint examples:**
- `http://localhost:3054/api/openapi` for local-only use
- `https://<your-domain>/api/openapi` for a tunnel, reverse proxy, or public domain you control
- `https://buildflow.prochat.tools/api/openapi` is not the default free GitHub endpoint; it belongs to the managed path

**Token:** your own `BUILDFLOW_ACTION_TOKEN` (generated locally, stored in `.env.local`)

**How it works:**
- Your local BuildFlow agent, web app, and relay run on your machine.
- You expose your own endpoint if you want Custom GPT access.
- Custom GPT sends requests to your endpoint with your token.
- Your local setup routes requests to the agent.
- Results return to Custom GPT, and your data stays on your machine.

**If ChatGPT needs to call back into your machine, the endpoint must be one you control**:
- a user-owned HTTPS domain
- a tunnel you run yourself
- or a reverse proxy you operate locally

**Setup:**
```bash
# 1. Generate your token
BUILDFLOW_ACTION_TOKEN=$(openssl rand -hex 32)

# 2. Store it locally
echo "BUILDFLOW_ACTION_TOKEN=$BUILDFLOW_ACTION_TOKEN" > apps/web/.env.local

# 3. Start BuildFlow locally
pnpm local:start

# 4. Verify your local endpoint
curl -H "Authorization: Bearer $BUILDFLOW_ACTION_TOKEN" \
  http://127.0.0.1:3054/api/actions/status

# 5. Import the OpenAPI schema into your Custom GPT
# Use your own /api/openapi URL
```

**Status:** ✅ Fully self-hosted. No BuildFlow-operated relay required.

### Applies to BuildFlow Local: setup details

1. Generate a token locally and keep it in `apps/web/.env.local`.
2. Start the local stack with `pnpm local:start` or the repo's local helper.
3. Import your own `/api/openapi` URL into the Custom GPT.
4. Use a public endpoint you control if you need ChatGPT access.

### Applies to BuildFlow Local: tunnel and reverse proxy options

Use any of the following if you want a public HTTPS endpoint while staying self-hosted:

- Cloudflare Tunnel
- ngrok
- Tailscale Funnel
- Caddy
- Traefik
- Nginx
- Any reverse proxy or domain you control

These are optional self-hosting choices, not BuildFlow Managed requirements.

## Self-hosted tunnel or reverse proxy

**Use this when:** you want BuildFlow Local plus a public HTTPS endpoint.

**Examples:**
- Cloudflare Tunnel
- ngrok
- Tailscale Funnel
- Caddy
- Traefik
- Nginx
- Any public reverse proxy or domain you control

**Setup:**
- Point the tunnel or proxy to `http://localhost:3054`
- Use the HTTPS URL in the Custom GPT OpenAPI import
- Use your own `BUILDFLOW_ACTION_TOKEN`

**Status:** ✅ Fully works and remains part of BuildFlow Local.

## BuildFlow Managed: future paid convenience path

**Use this when:** you want the BuildFlow-operated managed relay and hosted convenience path.

**Endpoint examples:**
- `https://buildflow-staging.prochat.tools/api/openapi` for staging validation
- the future managed production endpoint when enabled

**How it works:**
- BuildFlow operates the relay infrastructure.
- Your local agent still runs on your machine.
- The managed relay routes requests to your device using `BRIDGE_URL` and `DEVICE_TOKEN`.
- This is the BuildFlow Managed path, not the free GitHub default.

**Status:** ✅ Future paid convenience path; not required for free GitHub use.

### Applies to BuildFlow Managed: token and routing model

- The local agent still runs on the user's machine.
- The managed relay uses `BRIDGE_URL` plus a device token.
- The managed relay stores token-to-device mappings.
- Requests transit the BuildFlow-operated relay only in Managed mode.

---

## BuildFlow Local endpoint model

BuildFlow Local keeps the endpoint ownership with the user.

- **Registration:** your local runtime registers only with your own endpoint or tunnel.
- **Connection:** any relay connection is under your control.
- **Routing:** your own deployment decides how Custom GPT requests reach the agent.
- **Execution:** your local agent processes the request against your files.
- **Response:** results return to Custom GPT through your endpoint.

### Privacy model for BuildFlow Local

- Your files stay local on your machine only.
- Requests and results do not need to transit BuildFlow-operated relay infrastructure.
- Transport is encrypted if you choose HTTPS/WSS.
- Audit logs are under your control if you host the endpoint yourself.

**Honest statement:** if you choose a public endpoint you operate, that endpoint can observe requests in flight. That is your own trade-off, not BuildFlow Managed.

---

## BuildFlow Managed endpoint model

BuildFlow Managed uses the BuildFlow-operated relay to connect ChatGPT to your local agent.

- **Registration:** your local runtime connects outward to the managed relay using a device token.
- **Connection:** the relay stores a mapping from token to device and maintains the WebSocket connection.
- **Routing:** ChatGPT sends a request with your token; the relay forwards it to your device.
- **Execution:** your local agent processes the request against your files.
- **Response:** the relay returns the result to Custom GPT.

### Privacy model for BuildFlow Managed

- Your files stay on your machine.
- Queries and results transit managed relay memory while being processed.
- Relay traffic is encrypted in transit.
- BuildFlow Managed can log safe metadata for support and operations.

**Honest statement:** BuildFlow Managed trades some in-flight visibility for convenience. That trade-off applies only to the managed path, not to BuildFlow Local.

### Applies to Both: token security

- Tokens should be generated locally with a cryptographically strong random source.
- Tokens should be rotated if exposed.
- Tokens should not be copied from Local into Managed or vice versa.
- The free GitHub path does not require a BuildFlow-operated relay token.

---

## Which path should a free GitHub user use?

Use **BuildFlow Local**.

That means:
- your own local endpoint, tunnel, or domain
- your own relay if you want a relay
- no dependency on BuildFlow-operated relay infrastructure

BuildFlow Managed is for future paid convenience and staging validation, not the default free path.

### Not restored / needs product decision

- Whether the docs should include a dedicated “token rotation” procedure with exact CLI commands.
- Whether the managed path should document user-facing billing and account setup now or wait for the SaaS launch.
