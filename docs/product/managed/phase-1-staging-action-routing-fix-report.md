# BuildFlow Managed Phase 1 Staging Action Routing Fix Report

## Date
2026-04-28

## Problem Summary
- Managed staging registration and device lifecycle worked, but read-only action checks returned `500 Device command failed`.
- The failing endpoints were:
  - `GET /api/actions/status`
  - `GET /api/actions/context/active`
- Investigation showed the bridge was sending these commands to the CLI agent as:
  - `action_proxy:status`
  - `action_proxy:get-active-sources`
- The CLI agent did not previously implement those proxied command names.

## Files Changed
- [`packages/cli/src/agent/bridge-client.ts`](/Users/Office/Repos/stevewesthoek/buildflow/packages/cli/src/agent/bridge-client.ts)

## Exact Command Handlers Added
- `action_proxy:status`
  - mapped to the existing health-style response
  - returns:
    - `status: 'ok'`
    - `deviceConnected: boolean`
- `action_proxy:get-active-sources`
  - mapped to the existing `get-active-sources` behavior
  - returns the same active-source snapshot structure already used by the CLI agent

## Verification Commands Run and Results
- `pnpm --dir packages/cli exec tsc --noEmit`
  - result: passed
- `git diff --stat`
  - result: only `packages/cli/src/agent/bridge-client.ts` changed

## Whether BuildFlow Local Was Touched
- No.
- No local services were started, stopped, restarted, or mutated.
- No Docker, OrbStack, or local port `3054` was used.

## Remaining Next Step
- Rerun the staging-only managed smoke test after this fix is committed, pushed, and deployed to BuildFlow Staging.

## Secret Handling Statement
- No token values, bearer headers, raw env payloads, or full Dokploy app JSON were printed.
- This report records only the code fix and local verification results.
