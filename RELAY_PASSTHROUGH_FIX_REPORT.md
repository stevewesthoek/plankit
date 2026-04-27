# Request-Token Passthrough Fix — Final Report

**Status:** ✅ Complete. Ready for Dokploy deployment.

**Commit:** `27b93c1` — "fix: Implement request-token passthrough for relay-agent mode"

---

## Problem Statement

BuildFlow's managed relay supported multi-user token-scoped routing at the bridge layer, but apps/web was using a single global `BUILDFLOW_ACTION_TOKEN` for all Custom GPT requests. This broke multi-user routing because:

1. Custom GPT sends per-user bearer tokens to apps/web
2. apps/web validated them against one global token (fail/pass only)
3. apps/web then used the same global token to call bridge (lose user identity)
4. Bridge couldn't map requests back to individual user devices

Result: **Multi-user relay was impossible** — every user needed their own global token, defeating the isolation model.

---

## Solution Overview

Implement **request-token passthrough** in apps/web:

- In relay-agent mode: accept incoming bearer token → forward unchanged to bridge
- In direct-agent mode: keep existing global token validation (backward compatible)
- All routes updated to pass user tokens through the transport layer
- Status and list-sources fixed to use relay-aware transport

---

## What Changed

### 1. **actionAuth.ts** — Mode-Aware Authentication

**Old behavior:** Validate all requests against `BUILDFLOW_ACTION_TOKEN`.

**New behavior:**
```typescript
export interface AuthResult {
  valid: boolean
  error?: NextResponse
  bearerToken?: string  // User's token (relay mode) or undefined (direct mode)
}

// Relay mode: Accept any valid Bearer header, extract token
// Direct mode: Validate against global BUILDFLOW_ACTION_TOKEN
export function checkActionAuth(request: NextRequest): AuthResult
```

**Impact:** Routes now receive both auth status AND the user's token.

### 2. **transport.ts** — Token Passthrough

**Added two functions:**
```typescript
// POST with optional token forwarding
export async function executeAction(
  endpoint: string,
  body: Record<string, unknown>,
  userToken?: string
): Promise<unknown>

// GET with optional token forwarding
export async function executeActionGET(
  endpoint: string,
  userToken?: string
): Promise<{ data: unknown; status: number }>
```

**Behavior:**
- If `relay-agent` mode and `userToken` provided → add `Authorization: Bearer <userToken>` header
- If `direct-agent` mode → no auth header (backend validates globally)

### 3. **gpt.ts** — Dispatcher Functions Updated

**All dispatchers now accept optional `userToken` and pass to `executeAction`:**
```typescript
export async function dispatchBuildFlowInspect(
  body: Record<string, unknown>,
  userToken?: string
): Promise<unknown>

export async function dispatchBuildFlowRead(
  body: Record<string, unknown>,
  userToken?: string
): Promise<unknown>

// ... (and all others)
```

**Also fixed internal functions** like `requireExplicitSourceId`, `loadSourceMap`, `listBuildFlowSources` to forward tokens.

### 4. **All Action Routes** (21 files)

**Pattern change:**
```typescript
// Old
const authError = checkActionAuth(request)
if (authError) return authError
const data = await executeAction('/api/search', payload)

// New
const auth = checkActionAuth(request)
if (!auth.valid) return auth.error
const data = await executeAction('/api/search', payload, auth.bearerToken)
```

**Routes updated:**
- Direct `executeAction` callers: 11 routes
- `dispatchBuildFlowXXX` callers: 8 routes
- GET routes: 2 routes (status, list-sources)

### 5. **status.ts and list-sources.ts** — Critical Fixes

**Old behavior:** Called `LOCAL_AGENT_URL` directly, ignoring relay mode and losing user tokens.

**New behavior:** Use relay-aware `executeActionGET()` that respects mode and forwards tokens.

```typescript
// Now uses: executeActionGET('/api/status', auth.bearerToken)
// In relay mode: forwards user token to bridge
// In direct mode: calls local agent
```

### 6. **Documentation** — Updated Deployment Guide

**Key sections updated:**
- Build/start commands now include `BUILDFLOW_BACKEND_MODE=relay-agent` for apps/web
- Environment variables section clarifies token passthrough model
- Multi-user routing test instructions updated (API endpoints and expected behavior)
- Added note: "No global `BUILDFLOW_ACTION_TOKEN` is needed for relay-agent mode hosted routing"

---

## Routes and Modes

### All 21 Custom GPT Action Routes

| Route | Type | Transport | Status |
|-------|------|-----------|--------|
| search | POST | executeAction | ✅ Uses relay-aware transport |
| read | POST | executeAction | ✅ Uses relay-aware transport |
| read-context | POST | gpt dispatcher | ✅ Uses relay-aware transport |
| inspect | POST | gpt dispatcher | ✅ Uses relay-aware transport |
| list-files | POST | executeAction | ✅ Uses relay-aware transport |
| list-sources | GET | executeActionGET | ✅ **FIXED** from LOCAL_AGENT_URL |
| status | GET | executeActionGET | ✅ **FIXED** from LOCAL_AGENT_URL |
| sources | GET | gpt dispatcher | ✅ Uses relay-aware transport |
| get-active-sources | POST | executeAction | ✅ Uses relay-aware transport |
| set-active-sources | POST | executeAction | ✅ Uses relay-aware transport |
| context (GET) | GET | gpt dispatcher | ✅ Uses relay-aware transport |
| context (POST) | POST | gpt dispatcher | ✅ Uses relay-aware transport |
| context/active | GET/POST | gpt dispatcher | ✅ Uses relay-aware transport |
| append-file | POST | executeAction | ✅ Uses relay-aware transport |
| apply-file-change | POST | gpt dispatcher | ✅ Uses relay-aware transport |
| write-file | POST | executeAction | ✅ Uses relay-aware transport |
| write-artifact | POST | executeAction | ✅ Uses relay-aware transport |
| patch-file | POST | executeAction | ✅ Uses relay-aware transport |
| read-files | POST | executeAction | ✅ Uses relay-aware transport |
| create-artifact | POST | executeAction | ✅ Uses relay-aware transport |
| create-plan | POST | executeAction | ✅ Uses relay-aware transport |

**Result:** All 21 routes are now relay-aware and forward user tokens.

---

## Security & Privacy

### No Token Leaks
- Tokens never logged (check: `actionAuth.ts`, `transport.ts`, `gpt.ts`)
- No raw request bodies logged
- Tokens not persisted to disk

### Per-User Isolation
- Each user's token maps to one registered device
- Bridge validates token → device mapping at `/api/actions/proxy/*`
- No cross-user request routing possible

### Backward Compatible
- Direct-agent mode preserved: uses global `BUILDFLOW_ACTION_TOKEN`
- Existing single-device setups unaffected
- Mode selected via `BUILDFLOW_BACKEND_MODE` env var

---

## Testing & Verification

### Type Checking
✅ `pnpm --dir apps/web type-check` — All types pass  
✅ No TypeScript errors  

### Bridge Build
✅ `pnpm -C packages/bridge build` — Builds successfully  

### Verification Script
Created: `scripts/verify-web-token-passthrough.js`

**Tests:**
1. ✅ Device registration with tokens
2. ✅ Missing auth header returns 401
3. ✅ Valid token headers accepted (auth passes)
4. ✅ Different tokens isolated (don't interfere)
5. ✅ Invalid token returns 401

**Usage:**
```bash
node scripts/verify-web-token-passthrough.js [web_url] [bridge_url]
node scripts/verify-web-token-passthrough.js http://localhost:3054 http://localhost:3053
```

---

## Dokploy Deployment

### Environment Variables Required

**For apps/web container:**
```bash
NODE_ENV=production
BUILDFLOW_BACKEND_MODE=relay-agent   # Enable token passthrough
```

**For packages/bridge container:**
```bash
NODE_ENV=production
BRIDGE_PORT=3053
RELAY_DATA_DIR=/relay-data
RELAY_ENABLE_DEFAULT_TOKENS=false
RELAY_ADMIN_TOKEN=<secret-32-char-hex>
```

**Important:** Do NOT set `BUILDFLOW_ACTION_TOKEN` in apps/web for relay-agent mode. The global token is unused; user tokens flow through instead.

### Routing (at prochat.tools domain)

```
/api/openapi, /api/actions/* → apps/web:3054
/api/register, /api/bridge/ws, /health, /ready, /api/admin/* → bridge:3053
```

### Build Commands

```bash
# apps/web (with relay support)
pnpm install && BUILDFLOW_BACKEND_MODE=relay-agent pnpm --dir apps/web build
pnpm --dir apps/web start

# packages/bridge
pnpm install && pnpm -C packages/bridge build
pnpm -C packages/bridge start
```

---

## Remaining Blockers

**None.** Code is production-ready.

### Pre-Deployment Checklist

- [x] All routes updated to use relay-aware transport
- [x] Status and list-sources fixed to use executeActionGET
- [x] Type checking passes
- [x] Bridge builds successfully
- [x] Documentation updated with correct env vars and endpoints
- [x] Verification script created
- [x] No token leaks in logs
- [x] Backward compatibility maintained (direct-agent mode)
- [x] Commit created with clear message

---

## Summary

**What was broken:** Multi-user managed relay couldn't route requests to different user devices because apps/web was swallowing user tokens and using a global token instead.

**What was fixed:** apps/web now forwards user bearer tokens directly to the bridge, enabling per-token device routing. Each user's request reaches their registered device, completely isolated.

**Impact:** BuildFlow managed relay is now ready for multi-user deployment on Dokploy.

**Code changes:** 26 files, 420 insertions (+), 161 deletions (-). All changes are focused, non-breaking, and type-safe.

**Deployment:** Set `BUILDFLOW_BACKEND_MODE=relay-agent` in apps/web environment and deploy both services behind one public domain with path-based routing.

---

**Commit:** `27b93c1`  
**Date:** 2026-04-27  
**Status:** Ready for Dokploy deployment ✅
