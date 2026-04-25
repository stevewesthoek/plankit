# BuildFlow MVP — Project Manifest

**Version:** 0.4.0  
**Status:** ✅ **Phase 4 Complete: Transport Abstraction Ready**  
**Last Updated:** 2026-04-19

---

## Overview

BuildFlow is a **local-first system** that connects your Markdown vault to ChatGPT via a web app and relay infrastructure.

- **Search** local notes from ChatGPT
- **Read** files with context from ChatGPT
- **Keep everything local** (all files stay on your machine)
- **Transport abstraction** (enables relay-backed or SaaS-hosted backends in future)

**Current Status:**
- ✅ Phase 2: Relay server (WebSocket, port 3053) containerized and deployed
- ✅ Phase 3: ChatGPT Actions working (web app 3054 → agent 3052)
- ✅ Phase 4: Action transport abstraction layer for future backend swaps
- ⏳ Phase 5: Relay-backed execution (optional; not required for current local setup)

---

## Directory Structure

```
buildflow/
├── README.md                    # User-facing overview
├── SETUP.md                     # Developer setup guide
├── DEMO_LOCAL.md                # Detailed demo walkthrough
├── DEMO_QUICK.sh                # Automated demo (one command)
├── DEMO_README.md               # Demo documentation
├── AUDIT_REPORT.md              # Build audit & fixes
├── REPAIR_SUMMARY.txt           # Quick repair reference
├── IMPLEMENTATION.md            # Architecture & modules
├── MANIFEST.md                  # THIS FILE
│
├── packages/
│   ├── shared/                  # Shared types & schemas
│   │   └── src/
│   │       ├── types.ts         # TypeScript interfaces
│   │       ├── schemas.ts       # Zod validation
│   │       └── constants.ts     # Config constants
│   │
│   └── cli/                     # Local Node.js agent
│       └── src/
│           ├── agent/           # Core logic
│           │   ├── vault.ts     # File operations (safe paths)
│           │   ├── indexer.ts   # Markdown scanning
│           │   ├── search.ts    # Fuse.js search
│           │   ├── server.ts    # Fastify HTTP server
│           │   ├── bridge-client.ts  # WebSocket (future)
│           │   ├── export.ts    # Claude Code export
│           │   ├── config.ts    # Config management
│           │   └── permissions.ts   # Path security
│           ├── commands/        # CLI commands
│           │   ├── init.ts      # Initialize
│           │   ├── login.ts     # Authenticate
│           │   ├── connect.ts   # Vault connection
│           │   ├── index.ts     # Rebuild index
│           │   ├── serve.ts     # Start server
│           │   └── status.ts    # Show status
│           ├── utils/
│           │   ├── paths.ts     # Path utilities
│           │   └── logger.ts    # Audit logging
│           └── index.ts         # CLI entry point
│
└── apps/
    └── web/                     # Next.js SaaS (scaffolding)
        └── src/
            ├── app/
            │   ├── api/         # API routes (stub)
            │   ├── layout.tsx   # Layout
            │   └── page.tsx     # Home page
            └── lib/
                ├── auth.ts      # User management
                ├── db.ts        # Prisma setup
                └── bridge.ts    # Bridge stub
```

---

## Quick Start

### Demo in 30 Seconds
```bash
bash DEMO_QUICK.sh
```

### Manual Setup
```bash
pnpm install && pnpm build
cd packages/cli
node dist/index.js init
node dist/index.js connect ~/Obsidian/MyVault
node dist/index.js serve
```

### Test Endpoints (Terminal 2)

**Local agent (port 3052):**
```bash
curl -X POST http://127.0.0.1:3052/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "your search", "limit": 5}'
```

**ChatGPT Actions via web app (port 3054, requires Bearer token):**
```bash
curl -X POST http://127.0.0.1:3054/api/actions/search \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"query": "your search", "limit": 5}'
```

---

## Features Implemented

### ✅ Core Operations
- **Search** — Full-text search with Fuse.js
- **Read** — Get file content (safe paths only)
- **Create** — Create new Markdown files with frontmatter
- **Append** — Add to existing files
- **Export** — Generate Claude Code implementation briefs
- **Index** — Scan and cache file metadata

### ✅ Security
- **Path Traversal Protection** — No `..`, no `/`, no hidden files
- **Path Safety** — Read access stays inside registered sources
- **Deletion Prevention** — Create/append only, no delete
- **Audit Logging** — All operations logged to `~/.buildflow/audit.log`

### ✅ CLI Commands
```
buildflow init                      # Create config
buildflow login <api-key>          # Store credentials
buildflow connect <path>           # Point to vault
buildflow index                    # Rebuild search index
buildflow serve                    # Start HTTP server
buildflow status                   # Show state
```

### ✅ HTTP Endpoints

**Local agent (port 3052):**
```
POST /api/search          # Search vault
POST /api/read            # Read file content
POST /api/create          # Create note
POST /api/append          # Append to note
GET /health               # Health check
```

**Web app / ChatGPT Actions (port 3054, Bearer token required):**
```
POST /api/actions/search          # Search vault (ChatGPT)
POST /api/actions/read            # Read file (ChatGPT)
POST /api/actions/search-and-read # Combined search + read (ChatGPT)
GET /api/openapi                  # OpenAPI schema for ChatGPT
GET /health                       # Web app health check
```

**Relay (port 3053):**
```
GET /health               # Relay health check
GET /ready                # Readiness check
```

---

## What Works ✅

- **Installation:** `pnpm install` ✅
- **Type-check:** `pnpm type-check` ✅
- **Build:** `pnpm build` ✅
- **CLI Commands:** All 6 commands ✅
- **Local Search:** Works on file system ✅
- **File Operations:** Create, read, append ✅
- **Audit Trail:** Logged to disk ✅
- **Demo:** Full end-to-end tested ✅

---

## What's Completed

- ✅ Phase 2: Relay server (WebSocket, containerized)
- ✅ Phase 3: ChatGPT Custom Actions (search, read, append)
- ✅ Phase 4: Action transport abstraction layer

## What's Not Included (Phase 5+)

- ❌ Relay-backed execution (optional; currently web → agent direct)
- ❌ Multi-vault support
- ❌ Team collaboration
- ❌ PDF/DOCX support
- ❌ Semantic search (embeddings)
- ❌ GitHub export
- ❌ SaaS hosted version

---

## Build & Test Results

### Installation
```
✅ pnpm install
   All 181 dependencies installed
   Prisma client generated
```

### Type Checking
```
✅ pnpm type-check
   All packages pass
   Zero TypeScript errors
```

### Build
```
✅ pnpm build
   shared: 8 files → dist/
   cli: 15 files → dist/
   web: .next/ built
```

### Demo Tests
```
✅ Search:       Results returned
✅ Read:         File content retrieved
✅ Create:       Files created with frontmatter
✅ Append:       Content appended to files
✅ Export:       Claude Code plans generated
✅ Audit Log:    All operations logged
```

---

## Configuration

### ~/.buildflow/config.json
```json
{
  "userId": "",
  "deviceId": "",
  "deviceToken": "",
  "apiBaseUrl": "http://localhost:3000",
  "vaultPath": "/path/to/vault",
  "mode": "read_create_append",
  "ignorePatterns": [".git/**", ".obsidian/**", ...]
}
```

### Audit Log (~/.buildflow/audit.log)
```json
{"timestamp":"...","tool":"search","status":"success"}
{"timestamp":"...","tool":"create_file","path":"...","status":"success"}
```

---

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Search | <10ms | In-memory Fuse.js index |
| Read | <10ms | Direct file system access |
| Create | <50ms | Write + frontmatter |
| Append | <20ms | Append operation |
| Export | <100ms | Template rendering |

All **synchronous, no I/O bottlenecks**.

---

## Security Model

### What's Protected ✅
- No directory traversal (blocked: `..`, `/`, hidden files)
- No deletions (create/append only)
- No executable code (Markdown only)
- All operations audited

### What's Expected 🛡️
- User owns the vault folder
- File permissions configured by user
- API keys stored securely (not in repo)
- Device tokens generated server-side (future)

### Limitations ⚠️
- Single vault per device (MVP)
- No multi-user isolation
- No encryption in transit (local only)
- No rate limiting (local only)

---

## API Contract

### Search
```
POST /api/search
{
  "query": "string",
  "limit": number (default: 10)
}

Response:
{
  "results": [
    {
      "path": "string",
      "title": "string",
      "snippet": "string",
      "modifiedAt": "ISO8601"
    }
  ]
}
```

### Read
```
POST /api/read
{
  "path": "relative/path/to/file.md"
}

Response:
{
  "path": "string",
  "content": "string"
}
```

### Create
```
POST /api/create
{
  "path": "optional/relative/path.md",
  "content": "string"
}

Response:
{
  "path": "string",
  "created": true
}
```

### Append
```
POST /api/append
{
  "path": "relative/path/to/file.md",
  "content": "string"
}

Response:
{
  "path": "string",
  "appended": true
}
```

### Export Plan
```
POST /api/export-plan
{
  "title": "string",
  "summary": "string",
  "projectGoal": "string",
  "techStack": "string",
  "implementationPlan": "string",
  "tasks": ["string"],
  "acceptanceCriteria": ["string"]
}

Response:
{
  "path": "Handoffs/claude-code/...",
  "created": true
}
```

---

## Decision Log

### MVP Scope Decision
- **Decision:** Local-only for MVP (no SaaS relay)
- **Reason:** Faster iteration, easier debugging
- **Outcome:** Full feature set works without SaaS
- **Phase 2:** WebSocket relay for ChatGPT

### Module Structure Decision
- **Decision:** Monorepo with shared package
- **Reason:** Type safety, reusable schemas
- **Outcome:** CLI and web app share validation

### CommonJS over ESNext
- **Decision:** Use CommonJS for CLI
- **Reason:** Better Node.js compatibility, simpler deployment
- **Outcome:** CLI builds and runs reliably

---

## Known Issues & Workarounds

None currently. All identified issues in MVP have been fixed.

---

## Testing Checklist

- ✅ CLI initializes
- ✅ Vault connection works
- ✅ Files get indexed
- ✅ Search returns results
- ✅ Files can be read
- ✅ Files can be created
- ✅ Files can be appended
- ✅ Plans export with correct format
- ✅ Audit log records operations
- ✅ Path security prevents traversal
- ✅ Hidden files are blocked
- ✅ Extensions are restricted

---

## Deployment Path (Completed & Future)

### ✅ Phase 2: Relay Server
1. Created `packages/bridge/` WebSocket relay with session management
2. Containerized with Dockerfile (non-root, multi-stage build)
3. Deployed via docker-compose with persistence
4. Device registration and token management

### ✅ Phase 3: ChatGPT Integration
1. Created ChatGPT Custom Actions (`/api/actions/*`)
2. Web app on port 3054 with Bearer token authentication
3. OpenAPI 3.1.0 schema at `/api/openapi` endpoint
4. Direct web → agent routing (relay not in HTTP path)

### ✅ Phase 4: Transport Abstraction
1. Created action transport layer (`apps/web/src/lib/actions/transport.ts`)
2. Centralized backend routing for future swaps
3. All action routes use unified `executeAction()` interface

### ⏳ Phase 5+: Future Enhancements
1. Optional relay-backed execution (if needed)
2. Multi-vault support
3. Team accounts and permissions
4. Semantic search with embeddings
5. SaaS hosting layer (when desired)

---

## Support & Contact

- **Issues:** Found in AUDIT_REPORT.md
- **Setup Help:** See SETUP.md
- **Demo Guide:** See DEMO_README.md
- **Quick Test:** Run `bash DEMO_QUICK.sh`

---

## License

MIT

---

## Summary

**BuildFlow MVP** is a **fully-functional local-only implementation** that proves all core concepts work. It's ready for:
- ✅ Local testing and validation
- ✅ Demo to stakeholders
- ✅ Performance benchmarking
- ✅ Integration planning for Phase 2

**Next step:** Connect to ChatGPT via Phase 2 bridge.

---

**Last Updated:** 2026-04-19  
**Status:** ✅ Phase 4 Complete — Transport Abstraction Ready for Phase 5
