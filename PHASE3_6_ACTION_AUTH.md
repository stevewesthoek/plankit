# Phase 3.6 — BuildFlow Public API Authentication

## Overview

Phase 3.6 secures the public ChatGPT Actions endpoints with a minimal bearer token authentication layer. All `/api/actions/*` endpoints now require a valid bearer token.

## Security Model

- **Environment variable:** `BUILDFLOW_ACTION_TOKEN`
- **Auth scheme:** HTTP Bearer token
- **Protected endpoints:**
  - `POST /api/actions/search`
  - `POST /api/actions/read`
  - `POST /api/actions/search-and-read`
  - `GET /api/actions/list-sources`
  - `GET /api/actions/status`
  - `POST /api/actions/append-inbox-note`
- **Unprotected endpoints:**
  - `GET /api/openapi` (schema endpoint, read-only)
  - `/api/relay/*` (bridge relay, internal only)
  - `/api/bridge/*` (bridge endpoints, internal only)

## Setup

### 1. Generate a Token

```bash
export BUILDFLOW_ACTION_TOKEN="$(openssl rand -hex 32)"
echo "$BUILDFLOW_ACTION_TOKEN"
```

### 2. Start the Web App Locally with Token

```bash
cd apps/web
BUILDFLOW_ACTION_TOKEN="$BUILDFLOW_ACTION_TOKEN" npm run dev
```

The web app listens on port 3054. Any request to `/api/actions/*` without a valid bearer token will receive a 401 response.

### 3. Start Full Stack for Testing

```bash
# Stop any running services
pkill -f "node dist/index.js serve" || true
pkill -f "node dist/server.js" || true
pkill -f "next dev" || true
pkill -f "next start" || true

# Set token
export BUILDFLOW_ACTION_TOKEN="$(openssl rand -hex 32)"

# Terminal 1: Bridge server
cd ~/Repos/stevewesthoek/buildflow/packages/bridge
node dist/server.js > /tmp/buildflow-bridge.log 2>&1 &

# Terminal 2: Local brain agent
cd ~/Repos/stevewesthoek/buildflow
node packages/cli/dist/index.js connect /Users/Office/Repos/stevewesthoek/brain
node packages/cli/dist/index.js index
BRIDGE_URL=ws://127.0.0.1:3053 DEVICE_TOKEN=test-device \
  node packages/cli/dist/index.js serve > /tmp/buildflow-agent.log 2>&1 &

# Terminal 3: Web app
cd ~/Repos/stevewesthoek/buildflow/apps/web
BUILDFLOW_ACTION_TOKEN="$BUILDFLOW_ACTION_TOKEN" npm run dev > /tmp/buildflow-web.log 2>&1 &

sleep 5
```

## Testing

### Test 1: Unauthenticated Request (Should Fail)

```bash
curl -i -s -X POST http://127.0.0.1:3054/api/actions/search \
  -H "Content-Type: application/json" \
  -d '{"query":"brain","limit":2}'
```

**Expected response:** `401 Unauthorized`

### Test 2: Wrong Token (Should Fail)

```bash
curl -i -s -X POST http://127.0.0.1:3054/api/actions/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrong-token" \
  -d '{"query":"brain","limit":2}'
```

**Expected response:** `401 Unauthorized`

### Test 3: Correct Token (Should Pass)

```bash
curl -s -X POST http://127.0.0.1:3054/api/actions/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUILDFLOW_ACTION_TOKEN" \
  -d '{"query":"brain","limit":2}' | jq .
```

**Expected response:** `{"results": [...]}`

### Test 4: Read Action with Token

```bash
curl -s -X POST http://127.0.0.1:3054/api/actions/read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUILDFLOW_ACTION_TOKEN" \
  -d '{"path":"mind/home.md"}' | jq .
```

### Test 5: Search-and-Read Action with Token

```bash
curl -s -X POST http://127.0.0.1:3054/api/actions/search-and-read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUILDFLOW_ACTION_TOKEN" \
  -d '{"query":"brain","limit":2}' | jq .
```

### Test 6: Public Endpoint with Token

```bash
curl -s -X POST https://buildflow.prochat.tools/api/actions/search-and-read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BUILDFLOW_ACTION_TOKEN" \
  -d '{"query":"brain","limit":2}' | jq .
```

## ChatGPT Custom GPT Configuration

To use BuildFlow with ChatGPT Custom Actions:

1. **Open ChatGPT Custom GPT editor**
2. **Navigate to "Configure" → "Actions"**
3. **Add Authentication:**
   - **Authentication type:** API Key
   - **Auth type:** Bearer
   - **API Key:** `<your-token-here>`
4. **Upload OpenAPI schema:**
   - **Preferred:** Import the per-action URLs one at a time
   - **Fallback:** Paste the contents of `docs/openapi.chatgpt.json`
   - **Fallback:** Import URL `https://buildflow.prochat.tools/api/openapi`
5. **Test the action:** Use ChatGPT to search and read files

### Important Notes

- Do **not** commit the actual token to version control.
- Generate a new token for production use (different from local dev).
- Rotate the token periodically for security.
- The OpenAPI schema at `docs/openapi.chatgpt.json` includes the security requirement; ChatGPT will automatically use the configured bearer token for each request.

## Implementation Details

### Auth Helper: `apps/web/src/lib/actionAuth.ts`

The `checkActionAuth()` function:
- Reads `BUILDFLOW_ACTION_TOKEN` from environment
- Checks the `Authorization` header for `Bearer <token>`
- Returns `null` (success) if token matches
- Returns `401` response if token is missing or invalid
- Returns `500` response if environment variable is not set

### Protected Routes

Each action endpoint imports and calls `checkActionAuth()` at the start of the POST handler:

```typescript
const authError = checkActionAuth(request)
if (authError) return authError
```

## OpenAPI Schema Updates

Both the static bundled schema (`docs/openapi.chatgpt.json`) and the dynamic `/api/openapi` schema include:

```json
{
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer"
      }
    }
  }
}
```

Each action operation includes:
```json
"security": [{ "bearerAuth": [] }]
```

## Troubleshooting

### Token Not Set Error

If you see: `{"error": "Server configuration error: BUILDFLOW_ACTION_TOKEN not set"}`

**Solution:** Set the environment variable before starting the app:
```bash
export BUILDFLOW_ACTION_TOKEN="your-token-here"
npm run dev
```

### 401 Unauthorized

If authentication fails locally:
1. Verify the token matches: `echo $BUILDFLOW_ACTION_TOKEN`
2. Check the header format: `Authorization: Bearer <token>` (with space after Bearer)
3. Regenerate a new token if unsure

### Public Endpoint 401

If the public endpoint returns 401 with the correct token:
1. Verify the Cloudflare tunnel is active: `buildflow.prochat.tools`
2. Check that the web app is running with the same token
3. Ensure the bearer token format is exactly: `Bearer <token>`

## Future Improvements

- Add token rotation / expiration
- Support multiple API keys for different clients
- Add rate limiting per token
- Integrate with Cloudflare Access for additional security layers
