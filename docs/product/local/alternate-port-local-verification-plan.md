# BuildFlow Local Alternate-Port Verification Plan

## Date
2026-04-28

## Goal
Define a minimal, safe throwaway-clone verification mode for BuildFlow Local public beta that does not touch the current runtime on port `3054`.

## Current state
- The default public beta path remains `http://127.0.0.1:3054/dashboard`.
- The current Local runtime stays on `3054` and must remain untouched.
- The repo currently hard-codes `3052`, `3053`, and `3054` in the Local stack scripts and web package scripts.
- There is no documented alternate-port command today.

## Recommended alternate-port controls

Use explicit environment variables, with safe defaults that preserve the existing public beta path:

- `AGENT_PORT` default: `3052`
- `RELAY_PORT` default: `3053`
- `WEB_PORT` default: `3054`
- `LOCAL_DASHBOARD_BASE_URL` default: `http://127.0.0.1:${WEB_PORT}`
- `LOCAL_AGENT_URL` default: `http://127.0.0.1:${AGENT_PORT}`

For alternate-port verification, allow the throwaway clone to override these values at launch time without changing the default public beta behavior.

## Files likely needing implementation changes

- `scripts/buildflow-local-stack.sh`
- `apps/web/package.json`
- `scripts/restart-buildflow-local.sh`
- `scripts/verify-dashboard.mjs`
- `scripts/verify-custom-gpt-actions.mjs`
- `README.md`
- `docs/product/beta-release-gate.md`
- `docs/product/local/public-beta-return-plan.md`

## Minimal implementation shape

1. Teach the Local stack script to accept port overrides from environment variables.
2. Keep the current defaults unchanged so `pnpm local:restart` still targets `3052/3053/3054`.
3. Update the web package scripts so `next dev` and `next start` can respect an alternate web port when launched through the stack script or a documented wrapper.
4. Update the verification scripts so they can read the same alternate base URLs.
5. Document the alternate-port mode as a verification-only path for throwaway clones.

## Proposed throwaway-clone command sequence

Example only; do not use against the current runtime:

```bash
git clone <repo-url> /tmp/buildflow-local-beta-fresh-clone
cd /tmp/buildflow-local-beta-fresh-clone
pnpm install
AGENT_PORT=3152 RELAY_PORT=3153 WEB_PORT=3154 pnpm local:restart
LOCAL_DASHBOARD_BASE_URL=http://127.0.0.1:3154 LOCAL_AGENT_URL=http://127.0.0.1:3152 pnpm local:verify
open http://127.0.0.1:3154/dashboard
```

If `3054` is already occupied, choose a complete alternate trio for the throwaway clone, such as `3152/3153/3154` or `3252/3253/3254`, and keep the current runtime untouched.

## Proposed verification commands on the alternate port

- `pnpm local:status`
- `pnpm local:restart`
- `pnpm local:verify`
- `curl -sS http://127.0.0.1:<WEB_PORT>/api/openapi`
- `curl -sS http://127.0.0.1:<WEB_PORT>/api/actions/status`
- `curl -sS http://127.0.0.1:<AGENT_PORT>/health`
- `curl -sS http://127.0.0.1:<RELAY_PORT>/health` if relay is part of the selected mode

## Explicit out of scope

- Changing the default public beta port `3054`
- Touching the current BuildFlow Local runtime
- Adding Managed/Dokploy changes
- Touching DNS, Cloudflare, tunnels, or `buildflow.prochat.tools`
- Adding Docker or OrbStack requirements
- Changing secret handling or token flows

## Secret handling

No secrets, bearer tokens, raw env values, or full config files are included in this plan.

## Next step

If the team wants fresh-clone verification while the current runtime occupies `3054`, implement the alternate-port mode in the smallest possible docs-safe way, then verify it in a throwaway clone only.
