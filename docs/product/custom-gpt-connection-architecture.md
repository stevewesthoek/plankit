# Custom GPT Connection Architecture for BuildFlow Local vs Managed

**Status:** Architecture decision document for the BuildFlow Custom GPT endpoint model.

**Audience:** Product architects, infrastructure decision-makers, and contributors.

**Decision:** BuildFlow supports two modes from one codebase:

1. **BuildFlow Local** - the free GitHub, fully self-hosted mode.
2. **BuildFlow Managed** - the future paid managed relay / SaaS mode.

This document replaces the old assumption that the managed relay is the default path for everyone.

---

## Executive Summary

There are now two supported connection models:

1. **Local mode:** Custom GPT connects to a user-owned endpoint, tunnel, or reverse proxy that fronts the user's local BuildFlow stack.
2. **Managed mode:** Custom GPT connects to a BuildFlow-operated managed relay, which forwards requests to the user's local agent.

The codebase can support both through configuration. The difference is product mode, not a different repository or a different core app.

---

## Problem Statement

BuildFlow needs to support users who want:

- a fully self-hosted free GitHub product
- a managed convenience path with less setup friction

The free GitHub product must not depend on BuildFlow-operated relay infrastructure by default. Managed relay belongs to the future paid path.

---

## Local Mode Architecture

### High-level flow

```
ChatGPT
  ↓ HTTPS
User-owned endpoint / tunnel / reverse proxy
  ↓
Local BuildFlow web app
  ↓
Local relay or local routing layer
  ↓
Local agent
```

### Local mode characteristics

- The user owns the endpoint.
- The user owns the tunnel, reverse proxy, or domain if one is used.
- The user owns the relay if they run one.
- The user can keep everything on their machine.
- BuildFlow does not need to operate any public relay for this mode.

### Local mode examples

- `http://localhost:3054/api/openapi`
- `https://<user-owned-domain>/api/openapi`
- `https://<user-owned-tunnel>/api/openapi`

### Applies to BuildFlow Local: behavior and troubleshooting

- If the user sees `401 Unauthorized`, the local token is missing or wrong.
- If the user sees `503`, the local agent or relay is offline.
- If the endpoint fails to load through a tunnel, check the tunnel, reverse proxy, DNS, or public HTTPS certificate.
- If the browser blocks requests, check CORS and the public endpoint URL.
- Local mode should continue to work without any BuildFlow-operated relay dependency.

---

## Managed Mode Architecture

### High-level flow

```
ChatGPT
  ↓ HTTPS
BuildFlow-managed relay
  ↓ WSS
User's local agent
```

### Managed mode characteristics

- BuildFlow operates the relay infrastructure.
- The local agent still runs on the user's machine.
- The relay accepts a device token and routes requests to the connected agent.
- Managed relay is the convenience path for paid or future SaaS usage.

### Managed mode examples

- staging: `https://buildflow-staging.prochat.tools/api/openapi`
- future managed production endpoint

### Applies to BuildFlow Managed: hardening checklist

- `RELAY_ENABLE_DEFAULT_TOKENS=false`
- `RELAY_ADMIN_TOKEN` is set to a strong secret
- persistent volume mounted at `/var/lib/buildflow`
- health endpoint returns success
- readiness endpoint returns success
- admin endpoints require `RELAY_ADMIN_TOKEN`
- reverse proxy rate limiting is enabled
- managed relay logs only safe metadata

### Applies to BuildFlow Managed: endpoints

- `GET /health`
- `GET /ready`
- `POST /api/register`
- `WSS /api/bridge/ws`
- `GET /api/admin/devices`
- `GET /api/admin/requests`
- `POST /api/actions/proxy/*`

---

## Core Design Principle

### Dumb GPT, dumb relay, smart local app

1. **Custom GPT is dumb.** It exposes actions and forwards requests. It should not contain product logic.
2. **Relay is dumb.** It authenticates, routes, and logs safe metadata only.
3. **Local BuildFlow app is smart.** It owns product logic, feature behavior, validation, and user data.

This principle applies to both Local and Managed modes.

### Applies to Both: one codebase, two modes

- Mode selection should happen through configuration.
- Shared route handlers and build artifacts can remain in one repository.
- Mode-specific docs should say whether they apply to Local, Managed, or Both.
- Managed staging is a validation path for the managed mode, not a default path for free GitHub users.

---

## Why Managed Is Not the Default for Free GitHub

Managed relay is convenient, but it is not the right default for the free GitHub product because:

- it would make free users dependent on BuildFlow-operated infrastructure
- it blurs the product boundary between free self-hosted and paid managed usage
- it creates a cost mismatch if the managed relay is used as a free default

Free GitHub users should use Local mode by default.

### Applies to Both: beta readiness checklist

- Local mode can be considered ready when a fresh clone can start, expose a local endpoint, and connect a Custom GPT through a user-owned endpoint.
- Managed mode can be considered ready when staging validates the managed relay, the admin token is protected, and the health/readiness checks pass.
- The same codebase can support both readiness targets without changing the default free product.

---

## One Codebase, Two Modes

The same codebase can support both modes if configuration is explicit:

- `BUILDFLOW_MODE=local`
- `BUILDFLOW_MODE=managed`

Mode selection should change:

- endpoint URLs
- relay ownership
- token model
- operational responsibility

Mode selection should not require a repo split at this stage.

---

## Managed Relay as Future SaaS Infrastructure

The Dokploy relay work belongs to BuildFlow Managed.

That means:

- staging validation is for managed mode
- production readiness is for managed mode
- operational ownership stays with BuildFlow

This is not a universal replacement for Local mode.

### Not restored / needs product decision

- Whether to preserve the old phased rollout checklist verbatim in an appendix.
- Whether to include a full multi-user routing walkthrough here or leave that exclusively to the Dokploy plan.
