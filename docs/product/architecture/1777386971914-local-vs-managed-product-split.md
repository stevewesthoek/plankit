# BuildFlow Local vs Managed Product Split Decision Proposal

**Status:** Proposed architecture decision — review before implementation
**Date:** 2026-04-28
**Scope:** Clarify the product and infrastructure boundary between the free GitHub self-hosted version and the future paid managed/SaaS version.

---

## Decision Proposal

BuildFlow should support two clearly separated product modes:

1. **BuildFlow Local** — free GitHub, fully self-hosted, local-first.
2. **BuildFlow Managed** — paid SaaS/managed relay, hosted by BuildFlow infrastructure.

This replaces the earlier assumption that all users, including free GitHub users, should default to the BuildFlow-managed relay.

---

## Why This Change Is Needed

The current documentation still describes the managed relay as the recommended path for most users, including free GitHub users. That creates three problems:

1. **Cost mismatch:** Free GitHub users would consume BuildFlow-operated relay resources without paying.
2. **Trust mismatch:** Users who want true self-hosting would still depend on BuildFlow infrastructure.
3. **Product boundary confusion:** The free local product and future SaaS convenience product become hard to distinguish.

A true self-hosted product should not require the BuildFlow operator's relay.

---

## Proposed Product Modes

## 1. BuildFlow Local — Free GitHub Version

**Audience:** Open-source users, privacy-first users, technical users, builders who want full control.

**Promise:**

> Clone the repo, run BuildFlow locally, expose your own endpoint if you want Custom GPT access, and keep everything under your control.

**Runs on the user's machine:**

- Agent
- Web app
- Relay server
- Local source indexing and file access
- Dashboard

**User controls:**

- Public endpoint
- Custom GPT schema URL
- Bearer token
- Cloudflare/ngrok/Tailscale/other tunnel choice
- Local runtime lifecycle
- Data retention
- Security posture

**No BuildFlow-operated relay dependency.**

**Expected endpoint examples:**

- Local dashboard: `http://localhost:3054/dashboard`
- Local OpenAPI: `http://localhost:3054/api/openapi`
- Optional public Custom GPT endpoint: `https://<user-owned-domain>/api/openapi`

---

## 2. BuildFlow Managed — Paid SaaS / Managed Relay Version

**Audience:** Paying users who want convenience, less setup, reliability, guided onboarding, and future SaaS features.

**Promise:**

> Use BuildFlow without managing your own tunnel or relay. BuildFlow hosts the managed relay and account experience.

**BuildFlow operates:**

- Managed relay infrastructure
- Production/staging Dokploy deployments or future equivalent
- Account/token management
- Rate limits and quotas
- Monitoring and operational support
- Future hosted history/convenience features

**User still may run locally:**

- Local agent for local file access
- Local source indexing
- Optional local dashboard, depending on SaaS design

**Managed endpoint examples:**

- Staging: `https://buildflow-staging.prochat.tools`
- Future production managed relay: `https://buildflow.prochat.tools` or a separate managed domain if chosen

---

## Important Infrastructure Implication

The current local BuildFlow endpoint and the Dokploy relay/server should not be treated as a simple replacement cutover anymore.

Instead, they represent two long-lived modes:

- **Local/self-hosted mode:** Steve's local BuildFlow stack, and later every GitHub user's own local stack.
- **Managed/SaaS mode:** Dokploy-hosted relay/server for paid users and future SaaS workflows.

Therefore, do not clean up the local model just because the managed relay works.

---

## Documentation That Needs Alignment

The following docs currently contain language that should be revised after this decision is accepted:

- `README.md`
  - Currently says `buildflow.prochat.tools` is Steve's current local endpoint and frames Dokploy as a migration/cutover.
  - Should be updated to distinguish BuildFlow Local vs BuildFlow Managed.

- `docs/product/custom-gpt-self-hosting-model.md`
  - Currently recommends the BuildFlow-managed relay for most users.
  - Should be rewritten so self-hosted users default to their own local endpoint/tunnel.
  - Managed relay should become a paid/convenience option, not the free default.

- `docs/product/custom-gpt-connection-architecture.md`
  - Currently says the decision is to implement a managed relay to eliminate user tunneling.
  - Should be revised into a two-mode architecture: Local self-hosted and Managed SaaS.

- `docs/product/dokploy-relay-deployment-plan.md`
  - Currently frames `buildflow.prochat.tools` as a production cutover target from local to Dokploy.
  - Should be reframed as Managed relay infrastructure, not the replacement for all local/self-hosted usage.

- `docs/product/launch-strategy.md`
  - Already says Free GitHub should be genuinely useful and open source forever.
  - Should explicitly state Free GitHub does not consume BuildFlow-operated relay resources by default.

- `docs/product/roadmap.md`
  - Should clarify that Free GitHub beta means true local self-hosted operation.
  - Managed relay belongs to Pro/SaaS, beta demo, or optional test paths only.

---

## Repository Strategy Options

### Option A — One Repository, Mode Split (Recommended for Now)

Use one public `buildflow` repository with clear product modes:

- `BuildFlow Local` mode: open-source, self-hosted, default docs and quickstart.
- `BuildFlow Managed` mode: paid SaaS infrastructure, enabled by deployment config and future private/hosted components.

**Pros:**

- One codebase to maintain.
- Free users can inspect all local-first code.
- Avoids early repo sprawl.
- Easier to keep agent, web, relay contracts compatible.
- Good for early-stage product iteration.

**Cons:**

- Requires strong documentation boundaries.
- Requires feature flags or config discipline.
- SaaS-only code must not leak secrets or unfinished paid features into the free UX.

**Recommended structure:**

```text
apps/web/                 Shared dashboard/web code
packages/cli/             Shared local agent
packages/bridge/          Relay usable locally or hosted
packages/proxy/           Production container topology
configs/local/            Local-first examples
configs/managed/          Managed deployment templates without secrets
docs/local/               Self-hosted GitHub docs
docs/managed/             Managed/SaaS infrastructure docs
docs/product/             Product strategy and roadmap
```

### Option B — Two Repositories

Create separate repos:

- `buildflow` or `buildflow-local` for free self-hosted.
- `buildflow-managed` or private repo for SaaS infrastructure.

**Pros:**

- Very clear product separation.
- SaaS internals can remain private.
- Free repo stays focused and less confusing.

**Cons:**

- Duplicated code or complex package sharing.
- More operational overhead.
- Harder to keep local agent, relay, and web contracts in sync.
- Too early before the product boundary is fully stable.

**Recommendation:** Do not split repos yet. Start with one repo and explicit modes. Split later only if SaaS-specific code becomes large, private, or operationally sensitive.

---

## Recommended Naming

Use clear names everywhere:

- **BuildFlow Local** — free GitHub self-hosted version.
- **BuildFlow Managed** — paid managed relay/SaaS version.
- **BuildFlow Team** — later collaboration product.

Avoid ambiguous phrases like:

- "production cutover" when discussing the permanent relationship between local and managed modes.
- "managed relay recommended for most users" in free GitHub docs.
- "self-hosted" if the user still depends on BuildFlow-operated relay infrastructure.

---

## Local Developer Testing Requirement

Steve should be able to test both flows locally from one checkout:

### Local mode test

- Agent, relay, and web run locally.
- Custom GPT points to Steve's own local/tunnel endpoint.
- No Dokploy dependency.

### Managed mode test

- Local agent connects to Dokploy staging/managed relay using `BRIDGE_URL` and `DEVICE_TOKEN`.
- Custom GPT points to the managed relay endpoint.
- Used to test future paid flow.

This can be done with one application if the mode selection is explicit and visible.

Suggested env/config names:

```bash
BUILDFLOW_MODE=local
BUILDFLOW_MODE=managed

# Local mode
BUILDFLOW_PUBLIC_URL=http://localhost:3054
BUILDFLOW_BACKEND_MODE=direct-agent or relay-agent-local

# Managed mode
BUILDFLOW_MANAGED_RELAY_URL=https://buildflow-staging.prochat.tools
DEVICE_TOKEN=<user-device-token>
```

Exact names should be confirmed against existing code before implementation.

---

## Open Questions Before Implementation

1. Should `buildflow.prochat.tools` remain Steve's personal/local production endpoint, or become the future public managed relay domain?
2. Should managed SaaS use a different domain such as `relay.buildflow.dev`, `api.buildflow.dev`, or `managed.buildflow.dev` to avoid confusion?
3. Do free GitHub users get a prebuilt Custom GPT instruction pack but create/import their own Custom GPT manually?
4. Should the free GitHub repo ship with local relay mode as the default, or direct-agent mode as the simplest default with relay as the Custom GPT path?
5. How much of the future SaaS dashboard should live in the public repo before billing/accounts exist?
6. Should Pro/SaaS code remain in the same repo behind config/feature flags until it justifies a private repo?
7. What exact feature differences separate Local and Managed at v1.2 beta?

---

## Recommended Immediate Plan

### Phase 0 — Pause Cutover Language

Stop treating Dokploy as a replacement for Steve's local BuildFlow runtime. Reframe it as the managed/SaaS relay path.

### Phase 1 — Documentation Alignment

Update docs to define two modes:

- BuildFlow Local = free self-hosted GitHub.
- BuildFlow Managed = paid managed relay/SaaS.

### Phase 2 — Config/Mode Audit

Inspect existing code and scripts to identify all mode flags and endpoint assumptions:

- `BUILDFLOW_BACKEND_MODE`
- `BRIDGE_URL`
- `DEVICE_TOKEN`
- `BUILDFLOW_ACTION_TOKEN`
- `LOCAL_AGENT_URL`
- OpenAPI public URL generation
- dashboard setup docs

### Phase 3 — Local Mode First-Run Path

Make sure the free GitHub path can run completely without BuildFlow-operated infrastructure.

### Phase 4 — Managed Mode Staging Path

Keep Dokploy staging and managed relay work, but document it as the paid/convenience path.

### Phase 5 — Product Boundary Implementation

Add any UI labels, docs, config examples, or feature flags needed to keep Local and Managed unambiguous.

---

## Recommended Decision

Proceed with one repository for now, but make the product split explicit:

- BuildFlow Local is the free GitHub product and must be truly self-hosted.
- BuildFlow Managed is the paid convenience/SaaS product and may use BuildFlow-operated relay infrastructure.
- Dokploy relay work should continue, but not as a replacement for the local free path.
- The previous local-to-Dokploy production cutover plan should be paused and reframed before further infrastructure changes.
