# Custom GPT Connection Architecture for v1.2.0-beta and Beyond

**Status:** Architecture decision document for BuildFlow Custom GPT endpoint model.

**Audience:** Product architects, infrastructure decision-makers, and contributors.

**Decision made:** BuildFlow will implement a managed relay service to enable users to use the Custom GPT without requiring Cloudflare, Tailscale, ngrok, or manual DNS configuration.

---

## Executive Summary

The v1.2.0-beta Custom GPT connection model requires users to choose between:

1. **Current state (local-only):** No Custom GPT integration, local testing only
2. **Fallback path (user-managed tunnel):** Cloudflare/ngrok/Tailscale, optional for advanced users
3. **Preferred path (managed relay):** BuildFlow-managed `buildflow.prochat.tools` → user's local agent

**This decision:** Implement a managed relay to make path #3 the primary onboarding path, eliminating the need for users to manage their own tunnels.

---

## Problem: Why Users Shouldn't Need External Tunneling

### Current friction points

- **Cloudflare Tunnel:** Free but requires account, DNS setup, named tunnel configuration
- **ngrok:** Free tier works but requires account, URL is temporary
- **Tailscale:** Free but requires VPN setup, only works with Tailscale Funnel (public HTTPS path)
- **All options:** Add complexity to first-time user onboarding

### v1.2.0-beta requirement

> Users should not need Cloudflare, Tailscale, ngrok, DNS records, A records, or their own domain for normal BuildFlow onboarding.

### User experience goal

1. Clone repo
2. Install dependencies
3. Run `pnpm dev` or `pnpm local:restart`
4. Dashboard appears at `http://localhost:3054/dashboard`
5. Custom GPT works without additional setup
6. Data stays local; no file uploads

---

## Proposed Architecture: BuildFlow-Managed Relay

### High-level flow

```
User's Machine                          BuildFlow Servers
┌──────────────────┐                   ┌─────────────────────────┐
│   Local Stack    │                   │ buildflow.prochat.tools │
│                  │                   │  (Public HTTPS)         │
│  ┌────────────┐  │                   │                         │
│  │  Web App   │◄────────(a)──────────┤  OpenAPI endpoint       │
│  │ :3054      │  │   GET /api/openapi│                         │
│  └────────────┘  │                   │  ┌─────────────────┐   │
│                  │                   │  │ Managed Relay   │   │
│  ┌────────────┐  │                   │  │ (Stateless)     │   │
│  │  Agent     │  │                   │  │                 │   │
│  │ :3052      │  │                   │  │ • Device        │   │
│  └────────────┘  │                   │  │   registry      │   │
│                  │                   │  │ • Token store   │   │
│  ┌────────────┐  │                   │  │ • Session mgmt  │   │
│  │  Relay     │──────(b)◄─────────────│  │ • Command proxy│   │
│  │ :3053 (ws) │  │   WebSocket       │  │                 │   │
│  └────────────┘  │   (Outbound)      │  └─────────────────┘   │
└──────────────────┘                   └─────────────────────────┘
                                        
                ChatGPT (via HTTPS)
                        │
                        ├─(c) GET /api/openapi
                        │    (Get schema + auth)
                        │
                        └─(d) POST /api/actions/proxy/*
                             (Relay to local agent via ws)
```

### Key flows

**(a) Schema retrieval:**
- GPT import: GET `https://buildflow.prochat.tools/api/openapi`
- Returns: OpenAPI 3.1.0 schema with Bearer token auth
- Status: Public, no user context needed

**(b) Local agent outbound connection:**
- User's local CLI: Initiates WebSocket to managed relay on port 3053
- Authentication: Device token (generated on user's machine)
- Direction: **Outbound only** (user machine initiates; relay doesn't reach back)
- Benefit: No firewall/port exposure needed; user controls connection lifetime

**(c) Custom GPT setup:**
- User imports schema: `https://buildflow.prochat.tools/api/openapi`
- User enters bearer token: `<their-buildflow-action-token>`
- GPT stores token securely in Custom GPT settings

**(d) Action execution:**
- ChatGPT calls: `POST https://buildflow.prochat.tools/api/actions/proxy/status`
- Request includes: Bearer token + action parameters
- Managed relay:
  1. Validates bearer token → maps to device ID
  2. Looks up device in registry
  3. Routes request through WebSocket to user's local agent
  4. Waits for response (30-second timeout)
  5. Returns result to ChatGPT
- User's local agent: Receives request, executes locally, sends response back

---

## Minimum Viable Architecture for v1.2.0-beta

### What already exists in `packages/bridge`

The bridge package contains **relay implementation with full multi-user routing**:

✅ Device registration (`/api/register`)
- Generate device token
- Register device ID
- Return connection info

✅ WebSocket connection (`/api/bridge/ws`)
- Device authentication by bearer token
- Heartbeat/ping-pong
- Command routing

✅ Action proxy endpoint (`/api/actions/proxy/*`)
- **Multi-user token-scoped routing** — each request authenticated with bearer token and routed to that token's device
- Multiple concurrent devices supported
- Timeout handling (30 seconds)
- Request/response correlation

✅ Admin endpoints (`/api/admin/devices`, `/api/admin/requests`)
- Device status visibility per user
- Request audit logging

✅ Session management (`/api/sessions`)
- Session creation/closure
- Activity tracking
- Metadata storage

✅ Token store & device registry
- Persistent storage
- Token-to-deviceId mapping
- Device metadata

### What's required for v1.2.0-beta

**Deployed relay instance at `buildflow.prochat.tools`:**

✅ Deploy bridge server to Dokploy-managed VPS or equivalent (not required: AWS/Kubernetes)
✅ Configure HTTPS termination (Dokploy with Let's Encrypt, or managed service)
✅ Set `RELAY_ENABLE_DEFAULT_TOKENS=false` for production (default tokens disabled)
✅ Set `RELAY_ADMIN_TOKEN` for admin endpoint protection (ops/monitoring only)
✅ Implement logging and monitoring (request audit, device health)
✅ Token-scoped device routing implemented (each request bearer token → correct device)
✅ Multiple users can connect simultaneously (token isolation enforced)
✅ Test end-to-end: Custom GPT action → relay → local agent (with real bearer token routing)

**v1.2.0-beta relay readiness checklist:**

1. ✅ Deploy bridge as hosted relay service (Dokploy, DigitalOcean App Platform, etc.)
2. ✅ Configure HTTPS/WSS under `buildflow.prochat.tools` domain
3. ✅ Disable default/dev tokens in hosted mode (`RELAY_ENABLE_DEFAULT_TOKENS=false`)
4. ✅ Implement Bearer token → deviceId routing for action proxy (already done)
5. ✅ Return clear 401 for invalid/unregistered tokens
6. ✅ Return clear 503 for offline device with helpful message
7. ✅ Document local agent pairing flow (token generation → registration → WebSocket connection)
8. ✅ Run end-to-end Custom GPT → relay → local agent test (all 8 Custom GPT actions)
9. ✅ Run multi-user routing test (2 devices, 2 tokens, verify isolation)

**Future work (not v1.2.0-beta):** Rate limiting, token expiration, per-team quotas

### What remains future/Pro

❌ **For v1.2.0-beta, NOT needed (deferred to v1.3+):**

- Multi-user device isolation (currently single relay instance = single user context)
- Account system (users are identified by device token only, no login required)
- Billing/metering
- Per-user resource limits
- Hosted file storage
- Cloud sync of plans/artifacts

**These are Pro/SaaS features, not v1.2.0-beta blockers.**

**However, these ARE required v1.2.0-beta relay hardening tasks before launch:**
- Production auth token configuration (non-empty, strong credentials)
- Logging and monitoring (relay health, request audit trail)
- End-to-end testing with actual Custom GPT actions
- Documentation of device pairing + setup flow
- Clear error messages for offline/timeout/no-device scenarios

---

## Connection Model Decision Matrix

| Path | Setup | Complexity | Built-in | For Users |
|------|-------|-----------|----------|-----------|
| **Managed relay** | 1 click (schema import + token) | ~5 min | ✅ Yes | Default onboarding |
| **User tunnel** (Cloudflare) | Account + DNS + cli | ~15–30 min | ❌ No | Power users / Admins |
| **User tunnel** (ngrok) | Account + cli + copy URL | ~10 min | ❌ No | Quick testing |
| **User tunnel** (Tailscale) | VPN setup + Funnel config | ~20 min | ❌ No | Existing Tailscale users |
| **Local-only** | None | ~5 min | ✅ Yes | Development (no ChatGPT) |

---

---

## Design Principle: Dumb GPT, Dumb Relay, Smart Local App

This section documents the core architectural principle that guides BuildFlow's design:

### The Principle

1. **Custom GPT is dumb.** It contains no BuildFlow business logic, product features, or app-specific knowledge. It only exposes action names, accepts user requests as structured parameters, and submits them as read-only or write-only operations. GPT evolves slowly (requires Custom GPT import) and is difficult to update.

2. **Relay is dumb.** It contains no product logic, feature decisions, or business rules. It authenticates requests, routes them to the correct device based on bearer token → device mapping, enforces request size limits, rate-limits if needed, and logs safe metadata only (no request bodies, file contents, or response details). Relay is the thinnest possible proxy.

3. **Local BuildFlow app is smart.** It contains all product logic, validation, business rules, optimizations, and feature logic. The app runs on the user's machine, doesn't require deployment, and is the primary surface for innovation.

### Implications

- **Feature requests belong in the local app**, not in GPT or relay. Add them to the CLI, web app, or agent code.
- **GPT and relay changes should be rare** and compatibility-preserving. Changing either breaks existing user setups.
- **New data flows should stay local** unless impossible. Relay should only route, never enrich, transform, or apply logic.
- **Users update the local app frequently** (every session or daily). They update GPT rarely (once per major version or when features are removed/added).
- **Future hosted relay (Pro)** should follow the same principle: smart account system, dumb routing, and delegate all product logic to the local or hosted app layer.

### Example: Search Action

- **GPT's role:** Expose `POST /api/actions/search` with `query` parameter. Send to relay.
- **Relay's role:** Authenticate bearer token, find the device, route the request over WebSocket, return the response.
- **Local app's role:** Receive the search request, validate the query, search the local vault, rank results, respect user preferences, return structured results.

If we wanted to add "search with AI ranking" or "search with custom filters," we add that to the local app, not GPT or relay. GPT just forwards `query` to the same endpoint.

---

## Why the Managed Relay is Safe for v1.2.0-beta

### Trust model

- **Files stay local:** User's agent stays on their machine; only results are sent through relay
- **User controls token:** Token is a secret the user generates; they can rotate it anytime
- **WebSocket is outbound:** User machine initiates connection; no inbound firewall rules needed
- **Relay is stateless:** Relay doesn't store files or secrets; it only routes requests
- **Open source:** Bridge code is public; users can self-host if they want

### Scalability and limitations for v1.2.0-beta

**Supported:**
- Single public relay instance
- One device per token (device token maps to one WebSocket connection)
- ~30-second request timeout per action
- No persistent state per user (only device registry + audit logs)
- Minimal compute per request (routing + correlation only)
- Sequential device support (close first device, connect second device)

**NOT supported in Phase 5B (v1.2.0-beta):**
- ❌ Per-user resource limits (rate limiting, quotas)
- ❌ Token expiration and refresh flows
- ❌ Cloud sync or persistence of plans/artifacts
- ❌ End-to-end encryption (transport TLS only)

### Future improvements (Pro/SaaS)

- Multiple relay regions
- Per-user resource quotas
- Session persistence across device reconnections
- Direct managed execution (not just proxy)
- Hosted plan history
- Team relay coordination

---

## Implementation Roadmap

### Phase 1: Deploy public relay (v1.2.0-beta)

**Goal:** Single public relay instance supports free GitHub users

- [ ] **Task 1.1:** Deploy bridge server to `buildflow.prochat.tools` infrastructure
  - Set `RELAY_ADMIN_TOKEN` for admin endpoints (device management, audit logs)
  - Configure HTTPS termination
  - Enable health/readiness checks
  - Implement logging and monitoring
  - Device tokens are registered per user (not a global shared token)

- [ ] **Task 1.2:** Update web app to expose public relay option
  - Add `.env.NEXT_PUBLIC_RELAY_URL=https://buildflow.prochat.tools`
  - Update Custom GPT setup docs to reflect managed relay option

- [ ] **Task 1.3:** Document relay device pairing flow
  - Local CLI: Generate device token, register with relay, store connection info
  - Web app: Display device token, connection status
  - User: Import Custom GPT schema, enter token

- [ ] **Task 1.4:** Test end-to-end Custom GPT flow
  - Schema import
  - Bearer token authentication
  - Action execution (search, read, write)
  - Timeout handling

### Phase 2: Multi-device support (v1.2.1 / v1.3)

**Goal:** Support users with multiple local machines/agents

- [ ] **Task 2.1:** Extend relay to route by device ID
  - Change from "first connected device" to "device selected by token context"
  - Support session-based routing

- [ ] **Task 2.2:** Update Custom GPT setup for device selection
  - Allow user to specify which device for a given Custom GPT

- [ ] **Task 2.3:** Implement device switching in web dashboard

### Phase 3: Hosted relay for Pro/SaaS (Post v1.2.0)

**Goal:** Multi-user, managed relay for BuildFlow Pro

- [ ] **Task 3.1:** Implement account system
  - User registration
  - Account-level token management
  - Device quota per user

- [ ] **Task 3.2:** Multi-user relay coordination
  - Per-user device isolation
  - Request routing by user + device ID
  - Resource limits per user

- [ ] **Task 3.3:** Hosted infrastructure
  - Multiple relay regions
  - Load balancing
  - High availability

---

## What Docs Should Say Now

### For v1.2.0-beta users (default path)

> **Recommended:** BuildFlow Custom GPT with managed relay
>
> - Clone repo and run `pnpm dev`
> - Get your token from the dashboard or `.env.local`
> - Import Custom GPT schema from `https://buildflow.prochat.tools/api/openapi`
> - Paste your token into the Custom GPT's Bearer token field
> - Test: Ask ChatGPT "Get BuildFlow status"
>
> **That's it.** Your data stays on your machine. The relay is only a passthrough.

### For advanced users (optional tunnels)

> **Optional:** If you prefer to manage your own HTTPS endpoint:
>
> Set up a Cloudflare Tunnel, ngrok, or Tailscale Funnel pointing to `http://localhost:3054`.
> Then import the Custom GPT schema from your tunnel URL instead of the managed relay.
>
> This is useful if you:
> - Want complete control over the connection
> - Prefer not to use the public relay
> - Are testing relay alternatives

### For the beta release gate

> ✅ **Critical question resolved:** Users can connect Custom GPT via BuildFlow-managed relay without external tunnel setup.

---

## Relay Hardening Required for v1.2.0-beta

The bridge relay foundation exists (Phase 5B/5C), but v1.2.0-beta launch requires hardening before public deployment:

### Required hardening tasks:

1. **Infrastructure deployment** (~4 hours)
   - Deploy bridge to Dokploy-managed VPS or equivalent (DigitalOcean App Platform, etc.)
   - Do NOT require AWS/Kubernetes—simple Docker hosting acceptable for beta

2. **Security hardening** (~2 hours)
   - Set `RELAY_ADMIN_TOKEN` to a strong random secret (admin endpoints only)
   - Disable dev tokens: `RELAY_ENABLE_DEFAULT_TOKENS=false`
   - Enable HTTPS/WSS termination under `buildflow.prochat.tools` domain
   - Device tokens are user-generated and registered per user; no global proxy token
   - Implement request logging and audit trail (metadata only, no credentials)

3. **Testing and validation** (~2–4 hours)
   - End-to-end test: Custom GPT action → relay → local agent (all 8 Custom GPT actions)
   - Test device connection/disconnection lifecycle
   - Test multiple device error handling (verify 503 returned correctly)
   - Monitor relay health: request success rate, timeout rate, error patterns

4. **Documentation** (~2 hours)
   - Document local agent pairing flow: token generation → registration → WebSocket connection
   - Document relay setup requirements (Dokploy, HTTPS, tokens, monitoring)
   - Document v1.2.0-beta limitations (single device per token, no concurrent multi-device)

**Total estimated effort: 10–14 hours**

**No code changes required to the bridge, CLI, or web app** (foundation is complete and working).

---

## Launch scenarios for v1.2.0-beta

### Scenario A: Managed relay hardening complete by freeze (✅ Preferred)

- Launch with managed relay as default Custom GPT path
- Cloudflare/ngrok/Tailscale documented as advanced fallback
- Meets product goal: "no external tunnel for normal onboarding"
- Best user experience

### Scenario B: Managed relay not hardened by freeze (✅ Acceptable fallback)

- Launch with Cloudflare quick-tunnel as default Custom GPT path
- Managed relay available as future improvement in v1.2.1
- Cloudflare/ngrok documented as normal onboarding (not ideal, but honest)
- Still meets product goal via fallback (users can use Custom GPT)
- Beta is not blocked; UX is degraded

### Scenario C: Do not launch Custom GPT integration if relay not ready (⚠️ Not recommended)

- This violates the v1.2.0-beta goal: "users can use Custom GPT"
- Only choose this if both managed relay AND user-tunnel fallback are unreliable
- Unlikely scenario; Cloudflare quick-tunnel is always available

---

## Security Model

### Data flow guarantees

- ✅ **Files stay local:** User agent never uploads files to relay
- ✅ **Relay is stateless:** Relay doesn't store files, plans, or artifacts
- ✅ **Relay can't read user data:** Relay only proxies requests; it doesn't decrypt or parse user data
- ✅ **User controls token:** User generates and stores the token; they can rotate it anytime
- ✅ **HTTPS only:** All public relay communication is encrypted

### Token isolation

Each user gets their own bearer token (BUILDFLOW_ACTION_TOKEN):
- Token is generated locally (user's choice)
- Token is stored in user's `.env.local` (never uploaded)
- Token is used for Custom GPT authentication (ChatGPT stores it securely)
- Relay uses token to validate requests but doesn't store it

### Threat model

| Threat | Mitigation |
|--------|-----------|
| Relay compromise | User files stay local; only results are sent. User can rotate token. |
| Token theft | HTTPS prevents interception. ChatGPT stores securely. User can rotate. |
| Relay downtime | User can switch to local-only or manual tunnel setup. |
| Man-in-the-middle | HTTPS termination via Cloudflare or equivalent. |
| Device impersonation | Token-based auth; tokens are per-device. |

---

## Decision Rationale

### Why NOT user-managed tunnels as default

- Requires external account (Cloudflare, ngrok, Tailscale)
- Requires DNS knowledge (especially Cloudflare)
- Requires CLI setup for each user
- **Violates:** "Users should not need Cloudflare/Tailscale/ngrok for normal onboarding"

### Why BuildFlow-managed relay

- ✅ Single click: Import schema, paste token
- ✅ No external dependencies
- ✅ Stateless: Easy to scale and maintain
- ✅ Open source: Users can audit the code
- ✅ Trust: Files stay local; relay is only a passthrough
- ✅ Already built: Bridge code exists in Phase 5B/5C state (needs hardening for v1.2.0-beta hosted relay)

### Why it's safe for free users

- **No resource limits needed for v1.2.0-beta:** Single device per token, ~30-second timeouts
- **No billing complexity:** No metering, no rate limits (for v1.2.0-beta)
- **No data leakage:** Relay doesn't store user data
- **User opt-out:** Users can always use manual tunnels if they prefer

---

## Conclusion

**Recommendation:** Deploy the bridge relay foundation to `buildflow.prochat.tools` as the default Custom GPT connection path for v1.2.0-beta, pending completion of the relay hardening checklist below.

**Required for v1.2.0-beta managed relay launch:**
1. Deploy bridge to Dokploy-managed VPS or equivalent Docker hosting
2. Configure HTTPS/WSS termination
3. Disable development tokens; set production auth tokens
4. End-to-end test: Custom GPT action → relay → local agent (all 8 actions)
5. Document relay setup + device pairing flow
6. Verify error handling: clear 503 errors for offline/no-device scenarios

**Timeline:** Infrastructure deployment + hardening + testing = ~12–16 hours.

**Blocker status:** 
- ✅ NOT a blocker IF relay hardening is completed before v1.2.0-beta freeze
- ⚠️ BLOCKER IF relay must launch but hardening is incomplete (cannot ship with unvetted production relay)
- ✅ FALLBACK: Can ship v1.2.0-beta with Cloudflare quick-tunnel as default path if relay deployment is delayed (meets product goal via fallback, not ideal UX)

---

**Document version:** v1.2.0-beta (2026-04-27)

**Status:** Architecture decision made. Ready for implementation planning.
