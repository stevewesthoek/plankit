# Dokploy Relay Deployment Plan for BuildFlow Managed

**Status:** Managed-only infrastructure plan for BuildFlow Managed.

**Audience:** DevOps/infrastructure owner planning and verifying BuildFlow Managed relay/server deployment on Dokploy without interrupting Steve's current local BuildFlow setup.

**Current URL state:** `buildflow.prochat.tools` is part of the managed relay story, but this document does not change any live infrastructure.

**Temporary staging URL:** `https://buildflow-staging.prochat.tools` is the managed staging route. Use this route first to test the BuildFlow Managed relay/server in parallel while Steve's local BuildFlow remains live.

**Managed production URL:** `https://buildflow.prochat.tools` is the intended managed production endpoint, but it is not the default BuildFlow Local endpoint.

**Local safety rule:** Steve's local BuildFlow setup must not be stopped, cleaned up, removed, or decommissioned automatically.

**Protected local configuration:** Do not edit `apps/web/.env.local`. Do not read or print secret values from it. Do not change, reuse, regenerate, replace, or copy Steve's current local `BUILDFLOW_ACTION_TOKEN` into Dokploy.

**See also:**
- `docs/product/custom-gpt-connection-architecture.md` - Architecture decisions
- `docs/product/custom-gpt-self-hosting-model.md` - User setup paths and endpoint model

---

## Managed readiness phases

**Phase 1 - Local production remains live**

Steve's current local BuildFlow setup remains live.

Do not touch the local runtime, Cloudflare tunnel, DNS, `apps/web/.env.local`, or Steve's local `BUILDFLOW_ACTION_TOKEN`.

**Phase 2 - Prepare managed deployment without production DNS**

Prepare the managed deployment without changing any live local endpoints.

This phase may document intended Dokploy settings, but it must not provision, switch DNS, stop local services, or modify Steve's local machine.

**Phase 3 - Staging verification on temporary URL**

Test the managed deployment at:

https://buildflow-staging.prochat.tools

Use staging-only tokens and staging-only configuration. Do not use Steve's local `BUILDFLOW_ACTION_TOKEN`.

**Phase 4 - Managed relay production readiness after explicit approval**

Only after staging is proven and Steve explicitly approves Phase 4, promote the managed relay to production readiness.

Until that approval exists, every production-domain example is future-state managed guidance only.

**Phase 5 - Local cleanup after explicit approval**

Only after managed production is proven stable and Steve explicitly approves Phase 5, any local cleanup may be discussed.

No local cleanup is allowed before Phase 5 approval.

---

## Deployment Topology

### User-Facing View

From the user's perspective, BuildFlow Local and BuildFlow Managed are distinct product modes.

```
User's Machine:
  $ pnpm local:start
  → BuildFlow starts (web + agent + relay)
  → Open http://localhost:3054 (dashboard)
  → Connect to Custom GPT with one token
  → Plan, handoff, execute — all integrated
```

For managed relay, users do NOT need to:
- Set up Cloudflare, ngrok, Tailscale, or any tunnel
- Configure DNS or domains
- Manage multiple apps or ports
- Run a separate relay service on their machine

Everything "just works" with `pnpm local:start` for BuildFlow Local. Managed relay uses its own deployment path.

### Internal Architecture

Internally, BuildFlow Managed has three components connected by well-defined boundaries:

```
ChatGPT (via HTTPS)                    Users' Local Agents
    ↓                                                ↑
    ↓ HTTPS/WSS                                     ↓ WSS
    ↓                                                ↓
Managed staging endpoint: https://buildflow-staging.prochat.tools
Managed production endpoint: https://buildflow.prochat.tools
    ↓ Path-based routing ↓
    ├─ /api/openapi, /api/actions/*, /dashboard → internal web app:3055
    ├─ /api/register, /api/bridge/ws, /health, /ready, /api/admin/* → internal relay:3053
    │
[Dokploy Container]
    ├─ Public proxy (port 3054)
    │   └─ Routes HTTPS traffic to internal services
    │
    ├─ Internal web app (port 3055)
    │   ├─ Serves Custom GPT OpenAPI schema
    │   ├─ Handles Custom GPT action requests
    │   └─ Calls internal relay at localhost:3053 for relay-mode actions
    │
    └─ Internal relay (port 3053)
        ├─ Registers devices (/api/register)
        ├─ Accepts WebSocket connections (/api/bridge/ws)
        ├─ Routes actions to connected devices
        ├─ Provides health/ready status (/health, /ready)
        └─ Maintains audit logs and device registry
        
                                ↑ WebSocket connection
                                ↑ (persists while device is online)
                                |
                          User's Local Agent
                          (runs on user's machine)
```

**Key points:**

* During Phase 3, the managed staging deployment is exposed at `https://buildflow-staging.prochat.tools`.
* `https://buildflow.prochat.tools` is reserved for BuildFlow Managed production readiness and is not the default BuildFlow Local endpoint.
* After Phase 4 approval, the managed production endpoint may be used for BuildFlow Managed.
* The public proxy listens on port 3054 and routes internally to the web app on port 3055 and the relay on port 3053.
* The user's local agent connects outbound to the relay. The user's machine does not accept inbound connections.
* No user-managed tunnel, DNS, or DNS A record is required for the managed relay path.
* Do not stop, clean up, or reconfigure Steve's current local BuildFlow setup during staging.

**Dokploy deployment details:**

* Run BuildFlow as one Docker image/container.
* Expose the public proxy on port 3054.
* Run the internal web app on port 3055.
* Run the internal relay on port 3053.
* Mount persistent state at `/var/lib/buildflow`.
* Configure path-based routing through the public proxy:
  * `/api/openapi`, `/api/actions/*`, `/dashboard` → internal web app on port 3055
  * `/api/register`, `/api/bridge/ws`, `/health`, `/ready`, `/api/admin/*` → internal relay on port 3053
* Set `BUILDFLOW_BACKEND_MODE=relay-agent` for the hosted web app.
* Set `RELAY_ENABLE_DEFAULT_TOKENS=false` and a new Dokploy-only `RELAY_ADMIN_TOKEN` for the relay.
* Rate limiting is required at the reverse proxy layer.

---

## Design Principle: Dumb GPT, Dumb Relay, Smart Local App

**See also:** [Architecture Decision: Design Principle](./custom-gpt-connection-architecture.md#core-design-principle)

In brief:
- **GPT** has no business logic; it only submits requests and exposes action names.
- **Relay** has no product logic; it authenticates, routes, and logs metadata only.
- **Local app** has all the intelligence and is where features live.

**Deployment implication:** the relay deployed here is intentionally stateless and dumb. Do not add feature logic, caching, or business rules to the relay. Keep all that in the local BuildFlow app.

---

## Quick answer: What should Dokploy run?

Dokploy should run BuildFlow Managed as one Docker image/container with an internal process layout that exposes one public proxy surface and keeps the web app and relay as internal services.

### Canonical production topology

| Surface | Port | Scope | Purpose |
|---------|------|-------|---------|
| Public proxy | 3054 | Public | Public HTTPS entrypoint through Dokploy/reverse proxy |
| Relay | 3053 | Internal | Device registration, WebSocket routing, admin endpoints, relay-agent routing |
| Web app | 3055 | Internal | Custom GPT OpenAPI schema, action endpoints, dashboard |

### Persistent volume

`/var/lib/buildflow`

### Phase-specific domains

* Phase 3 staging: `https://buildflow-staging.prochat.tools`
* Phase 4 production, only after Steve approval: `https://buildflow.prochat.tools`

### Path routing through the public proxy

* `/api/openapi`, `/api/actions/*`, `/dashboard` → internal web app on port 3055
* `/api/register`, `/api/bridge/ws`, `/health`, `/ready`, `/api/admin/*` → internal relay on port 3053

In relay-agent mode, apps/web acts as a token passthrough proxy. It accepts the incoming bearer token from ChatGPT requests and forwards that token to the relay. No global `BUILDFLOW_ACTION_TOKEN` is required for managed relay-agent routing.

---

## Dokploy Service Configuration

### Basic Service Setup

```yaml
# Dokploy service configuration for BuildFlow staging

Service Name: buildflow-staging
Description: BuildFlow managed relay/server staging deployment

# Build settings
Source Repository: https://github.com/stevewesthoek/buildflow
Build Trigger: staging branch or explicit staging deployment trigger
Build Context: . (repo root)
Docker Image: one BuildFlow image/container that starts the public proxy, internal web app, and internal relay

# Runtime topology
Public Proxy Port: 3054
Internal Web App Port: 3055
Internal Relay Port: 3053
Persistent Volume: /var/lib/buildflow

# Phase 3 public endpoint
Public Domain: buildflow-staging.prochat.tools
Protocol: HTTPS

# Future Phase 4 production endpoint, only after Steve approval
Future Production Domain: buildflow.prochat.tools

# Public path routing through proxy
Public Paths:
  - /api/openapi -> internal web app on 3055
  - /api/actions/* -> internal web app on 3055
  - /dashboard -> internal web app on 3055
  - /health -> internal relay on 3053
  - /ready -> internal relay on 3053
  - /api/register -> internal relay on 3053
  - /api/bridge/ws -> internal relay on 3053
  - /api/admin/* -> internal relay on 3053

This section describes managed staging configuration only. It does not authorize provisioning, DNS changes, Cloudflare changes, Dokploy changes, or changes to Steve's local BuildFlow runtime. BuildFlow Local remains separate.
```

### Token model

`RELAY_ADMIN_TOKEN` is for admin endpoints only. Hosted relay-agent routing uses incoming user/device bearer tokens. `RELAY_PROXY_TOKEN` is historical/planning/deprecated only and must not be used as current deployment guidance. Steve's current local `BUILDFLOW_ACTION_TOKEN` is local-only and must not be reused, regenerated, replaced, edited, or copied into Dokploy.

### Environment Variables

Set these in Dokploy secrets/environment:

**For apps/web (relay mode):**
```bash
NODE_ENV=production
BUILDFLOW_BACKEND_MODE=relay-agent   # Enable relay-agent mode (forward tokens to bridge)
```

**For packages/bridge:**
```bash
NODE_ENV=production

# Bridge configuration
BRIDGE_PORT=3053
RELAY_DATA_DIR=/var/lib/buildflow

# Authentication (security hardening for v1.2.0-beta)
RELAY_ENABLE_DEFAULT_TOKENS=false
RELAY_ADMIN_TOKEN=<secret-32-char-hex>       # For /api/admin/* endpoints (ops/monitoring only)

# Example token generation (run locally, paste into Dokploy secrets UI):
