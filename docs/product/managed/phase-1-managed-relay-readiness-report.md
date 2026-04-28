# BuildFlow Managed Phase 1 Readiness Report

## Proven Facts

- The repo is on `main` and currently ahead of `origin/main` with the Local vs Managed docs committed.
- The Local vs Managed decision note exists at `docs/product/architecture/1777386971914-local-vs-managed-product-split.md`.
- The managed relay plan exists at `docs/product/dokploy-relay-deployment-plan.md`.
- The Dockerfile still defines the managed runtime topology with:
  - relay build stage
  - web build stage
  - proxy build stage
  - runtime user `buildflow`
  - `EXPOSE 3054`
  - `BRIDGE_PORT=3053`
  - `WEB_PORT=3055`
  - `PORT=3054`
  - `RELAY_DATA_DIR=/var/lib/buildflow`
  - `RELAY_ENABLE_DEFAULT_TOKENS=false`
- The proxy in `packages/proxy/src/index.ts` still routes:
  - `/api/register`
  - `/api/bridge/ws`
  - `/api/admin*`
  - `/health`
  - `/ready`
  to the relay
  - `/api/openapi`
  - `/api/actions*`
  - `/dashboard`
  to the web app
- The proxy’s readiness check still probes relay `/ready` before declaring the public proxy ready.
- The web app still uses `WEB_PORT=3055` in the managed topology.
- The relay package still recognizes `BRIDGE_PORT`, `RELAY_DATA_DIR`, `RELAY_ADMIN_TOKEN`, and `RELAY_ENABLE_DEFAULT_TOKENS`.
- The codebase still supports relay-agent mode via `BUILDFLOW_BACKEND_MODE=relay-agent`.
- The web app still references `BRIDGE_URL` and `DEVICE_TOKEN` for relay-mode routing.

## Assumptions

- BuildFlow Managed will use the same single-repo / single-codebase layout as BuildFlow Local.
- The current Dockerfile and proxy code are sufficient for managed topology planning, but not yet proven in a live Dokploy environment.
- The managed relay should remain separate from the free Local path in docs and operations.

## Blockers

- Docker build verification has not been run in this pass.
- Dokploy environment configuration has not been applied in this pass.
- Managed production deployment has not been validated in this pass.
- No end-to-end managed relay smoke test has been run from a live Dokploy staging instance in this pass.

## Recommended Next Steps

- Run a cheap, explicit Docker build verification if and only if approved after this read-only preflight.
- If the build is clean, verify the container starts and the proxy/relay/web topology is healthy.
- Then prepare a managed-only Dokploy environment plan using the exact env vars and volume requirements captured below.
- Keep BuildFlow Local untouched while managed validation proceeds.

## Explicit Non-Goals

- Do not change DNS, Cloudflare, Dokploy apps, containers, tunnels, or local services.
- Do not clean up Steve’s local BuildFlow runtime.
- Do not run Docker in this pass.
- Do not stage or commit unrelated files.
- Do not expose secrets or token values.

## Managed Environment Requirements

### Required env vars

- `NODE_ENV=production`
- `BUILDFLOW_BACKEND_MODE=relay-agent`
- `BRIDGE_PORT=3053`
- `WEB_PORT=3055`
- `PORT=3054`
- `RELAY_DATA_DIR=/var/lib/buildflow`
- `RELAY_ENABLE_DEFAULT_TOKENS=false`
- `RELAY_ADMIN_TOKEN=<secret>`

### Required volume

- `/var/lib/buildflow`

### Managed endpoints to preserve

- `GET /health`
- `GET /ready`
- `POST /api/register`
- `WSS /api/bridge/ws`
- `GET /api/admin/devices`
- `GET /api/admin/requests`
- `GET /api/openapi`
- `POST /api/actions/*`
- `GET /dashboard`

### Managed routing expectations

- Relay routes: `/api/register`, `/api/bridge/ws`, `/api/admin*`, `/health`, `/ready`
- Web routes: `/api/openapi`, `/api/actions*`, `/dashboard`

### Local path untouched

- BuildFlow Local remains the free GitHub self-hosted path.
- Steve’s current local runtime remains untouched.
- Managed validation must not be treated as a replacement for Local.

