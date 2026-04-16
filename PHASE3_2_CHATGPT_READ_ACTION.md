# Phase 3.2: ChatGPT Custom Action Read (Read-Only)

Phase 3.2 adds a read-only ChatGPT Custom Action to read file contents from the local vault.

## Setup

Same as Phase 3.1:

```bash
# Terminal 1: Bridge Server (port 3053)
cd ~/Repos/stevewesthoek/brain-bridge/packages/bridge
node dist/server.js

# Terminal 2: Local Agent (port 3052, connected to bridge)
BRIDGE_URL=ws://127.0.0.1:3053 DEVICE_TOKEN=test-device \
  node packages/cli/dist/index.js serve

# Terminal 3: Web App (port 3054)
cd ~/Repos/stevewesthoek/brain-bridge/apps/web
npm run dev
```

## Actions Available

### 1. Search Action

Find files matching a query:

```bash
curl -X POST http://localhost:3054/api/actions/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"brain","limit":5}'
```

Response:
```json
{
  "results": [
    {
      "path": "mind/04-tasks/task-123.md",
      "title": "Task Title",
      "score": 0.95,
      "snippet": "First 200 chars of content...",
      "modifiedAt": "2026-04-16T12:00:00Z"
    }
  ]
}
```

### 2. Read Action (NEW in Phase 3.2)

Read the full content of a file from the vault:

```bash
curl -X POST http://localhost:3054/api/actions/read \
  -H 'Content-Type: application/json' \
  -d '{"path":"mind/04-tasks/task-123.md"}'
```

Response:
```json
{
  "path": "mind/04-tasks/task-123.md",
  "content": "---\ntype: task\ntitle: \"Task Title\"\n...\nFull file content..."
}
```

## Complete Workflow Example

```bash
# 1. Search for files about "brain"
curl -X POST http://localhost:3054/api/actions/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"brain","limit":2}' | jq '.results[0].path'

# 2. Read the first result (replace with actual path from search)
curl -X POST http://localhost:3054/api/actions/read \
  -H 'Content-Type: application/json' \
  -d '{"path":"mind/home.md"}'
```

## Safety Guarantees

- **Read-only:** No write operations (create/append/export not supported in Phase 3.2)
- **Relative paths only:** Paths are always relative to configured vault
- **Path traversal blocked:** `../README.md` and other escapes are rejected
- **Symlinks supported:** Symlinked folders inside vault are readable (e.g., `mind/` symlink)
- **Error handling:** Invalid paths return 400 with error message

## ChatGPT Custom Actions: Import

1. Update the OpenAPI spec:
   - Local: Use live endpoint `http://localhost:3054/api/openapi`
   - Public: Use static file `docs/openapi.chatgpt.json` (after replacing server URL)

2. Import both actions:
   - `/api/actions/search` — Find files
   - `/api/actions/read` — Read file content

3. Test workflow:
   - ChatGPT: "Search for files about X, then read Y"
   - Agent performs: search → read chain

## Phase 3.2 Scope

**Included:**
- ✓ Read action (`POST /api/actions/read`)
- ✓ Read-only file access (no write operations)
- ✓ Path safety (traversal blocked, symlinks allowed)
- ✓ Updated OpenAPI spec (both search and read)
- ✓ Updated static spec (`docs/openapi.chatgpt.json`)

**Not included (Phase 3.3+):**
- ✗ Create note action
- ✗ Append to file action
- ✗ Export plan action
- ✗ Production authentication
- ✗ Database persistence
- ✗ Multi-user/team support

## Testing Checklist

- [ ] Local agent running, bridge connected
- [ ] Web app serving on port 3054
- [ ] Search returns file paths
- [ ] Read successfully loads file content using search-returned path
- [ ] Read rejects `../` paths with error
- [ ] Read works with symlinked paths (e.g., `mind/...`)
- [ ] OpenAPI includes both `/api/actions/search` and `/api/actions/read`
- [ ] ChatGPT Actions import succeeds with updated spec

## Phases Status

- **Phase 1.1** (Local MVP): ✅ Complete — local CLI agent
- **Phase 2.0** (Direct Relay): ✅ Complete — web app direct HTTP → agent
- **Phase 2.1** (Bridge Relay): ✅ Complete — web app → bridge → agent via WebSocket
- **Phase 3.0** (Search Action): ✅ Complete — `/api/actions/search` endpoint
- **Phase 3.1** (ChatGPT Setup): ✅ Complete — static spec, tunnel docs, import guide
- **Phase 3.2** (Read Action): ✅ Complete — `/api/actions/read` read-only endpoint
