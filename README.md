# Brain Bridge

**Connect your local knowledge sources to ChatGPT. Search, read, and create notes across your repositories—all without uploading your files to the cloud.**

Brain Bridge is a privacy-first bridge that brings your personal knowledge base into AI conversations. Use ChatGPT or Claude to search across your local markdown repositories, retrieve specific files for context, and save insights back to your vault—all while keeping your files on your machine.

## Why Brain Bridge?

- **Local-first by design** — Your files never leave your computer. ChatGPT sees only the search results and content you explicitly request.
- **Multi-source support** — Combine knowledge from multiple repositories (Obsidian vaults, markdown folders, code docs, research notes) into a single searchable index.
- **ChatGPT + Your Brain** — Use ChatGPT's reasoning with your actual context. Search your vault from ChatGPT's Custom GPT interface and save the results back.
- **Simple, honest security** — Append-only writes, no deletion or overwrite, path traversal protection, extension filtering. Audit logs for all operations.
- **Open source & looking for help** — MIT licensed. Early stage. Actively seeking testers, bug reports, and contributors.

## Who Is It For?

- **Knowledge workers** — Keep your personal notes private while leveraging AI for synthesis and discovery
- **Developers** — Give Claude/ChatGPT access to your project README, architecture docs, and codebase notes
- **Researchers** — Manage literature, experiments, and findings locally; use AI to find connections and generate reports
- **Anyone with local markdown** — If you store knowledge as markdown or text files, Brain Bridge bridges you to ChatGPT

## What Brain Bridge Does

✅ **Search across repositories** — Full-text search across all connected knowledge sources
✅ **Read files** — Retrieve specific file content for use as context in ChatGPT
✅ **Create & append notes** — Save ChatGPT insights back to your vault
✅ **Multi-source indexing** — Connect Obsidian, markdown folders, GitHub docs, etc.
✅ **Audit logging** — All operations logged with timestamps and source info
✅ **Bearer token auth** — Secure API access for ChatGPT via custom bearer token
✅ **Health & readiness probes** — Ready for container orchestration (Kubernetes, Docker, etc.)

## What Brain Bridge Does NOT Do

❌ **Cloud sync** — Your files stay local. No SaaS backend, no file uploads
❌ **Multi-device sync** — Currently single-device per relay; multi-device coordination planned
❌ **Arbitrary file access** — Only `.md` and `.txt` files; path traversal blocked
❌ **Deletion or overwrite** — File operations are append-only for safety
❌ **Semantic search** — Full-text search only; embedding-based search planned
❌ **Structured logging** — Plain text logs; JSON logging planned

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/stevewesthoek/brain-bridge
cd brain-bridge
pnpm install
```

### 2. Start the Services

```bash
# Generate a secure token for ChatGPT authentication
export BRAIN_BRIDGE_ACTION_TOKEN=$(openssl rand -hex 32)

# Start all services locally
# • Agent: 3052 (indexing & file operations)
# • Relay: 3053 (device coordination)
# • Web: 3054 (ChatGPT Custom Actions)
pnpm dev
```

### 3. Connect Your Knowledge Source

```bash
# Point to your Obsidian vault, markdown folder, or any local repo
export LOCAL_AGENT_URL="http://127.0.0.1:3052"

# Via CLI (when init/connect commands are implemented):
# brainbridge init
# brainbridge connect ~/Obsidian/MyVault

# For now, configure directly in the agent and restart
```

### 4. Set Up ChatGPT Custom GPT

1. Create a new **Custom GPT** in ChatGPT
2. Import the OpenAPI schema from `https://brainbridge.prochat.tools/api/openapi` or the synced local export in `docs/openapi.chatgpt.json`
3. Set authentication to **Bearer token**, using your `BRAIN_BRIDGE_ACTION_TOKEN`
4. Save and test with: _"Search my brain for notes on [topic]"_

## Example Workflow

```
You (ChatGPT):
"Search my brain for notes about Claude Code"
     ↓
Brain Bridge:
Returns matching files from your local vault
     ↓
You (ChatGPT):
"Read the top result"
     ↓
Brain Bridge:
Returns full file content
     ↓
You (ChatGPT):
"Create an implementation plan and save it to my inbox"
     ↓
Brain Bridge:
Writes new note to your vault
```

## Architecture

Brain Bridge runs three services locally:

```
┌───────────────────────────────────────────────────┐
│           ChatGPT (via HTTPS)                     │
└────────────────────┬──────────────────────────────┘
                     │
        ┌────────────┴───────────┐
        │                        │
   ┌────▼────────┐        ┌─────▼──────┐
   │  Web (3054) │        │ Relay      │
   │  Next.js    │        │ (3053)     │
   │  + ChatGPT  │        │ WebSocket  │
   │  Actions    │        │ bridge     │
   └────┬────────┘        └─────┬──────┘
        │                       │
        └───────────┬───────────┘
                    │
            ┌───────▼────────┐
            │ Agent (3052)   │
            │ • Indexing     │
            │ • Search       │
            │ • File ops     │
            └────────┬───────┘
                     │
              ┌──────▼──────┐
              │ Your Local  │
              │ Repositories│
              │ (.md, .txt) │
              └─────────────┘
```

### Two Execution Modes

**direct-agent (default):**
- Web forwards requests directly to local agent (3052)
- Simplest setup for local-only use
- No relay needed
- `BRAIN_BRIDGE_BACKEND_MODE=direct-agent`

**relay-agent:**
- Web routes through relay (3053) to agent via WebSocket
- Enables device coordination and bearer token auth
- Designed for multi-device deployments (single device currently supported)
- `BRAIN_BRIDGE_BACKEND_MODE=relay-agent`

## Privacy & Security

**Local-first by design:**
- Your files never leave your machine
- ChatGPT only receives search results and content you explicitly request
- All indexing happens locally

**Security guarantees:**
- ✅ **Path traversal prevention** — No `../` or absolute paths allowed
- ✅ **Extension filtering** — Only `.md` and `.txt` files accessible
- ✅ **Append-only writes** — No deletion, overwrite, or modification of existing content
- ✅ **Bearer token authentication** — API key required for ChatGPT access
- ✅ **Audit logging** — All operations logged with timestamps (`~/.brainbridge/audit.log`)
- ✅ **Device token validation** — Agent-relay communication authenticated

**What this README does NOT include:**
- No private user data, credentials, or API keys
- This is the public open-source repo; it has no PII or sensitive configuration

## Installation & Configuration

### Local Development

```bash
pnpm install
export BRAIN_BRIDGE_ACTION_TOKEN=$(openssl rand -hex 32)
export LOCAL_AGENT_URL="http://127.0.0.1:3052"
pnpm dev
```

### Docker

```bash
docker compose up -d

# Verify relay is ready
curl http://localhost:3053/ready | jq .

# Verify web app is running
curl http://localhost:3054
```

### Environment Variables

**Web app** (`apps/web/.env.local`):
- `BRAIN_BRIDGE_ACTION_TOKEN` — Bearer token for ChatGPT (generate with `openssl rand -hex 32`)
- `LOCAL_AGENT_URL` — Local agent endpoint (default: `http://127.0.0.1:3052`)
- `BRAIN_BRIDGE_BACKEND_MODE` — `direct-agent` (default) or `relay-agent`
- `RELAY_PROXY_TOKEN` — Bearer token for relay proxy (if using relay-agent mode)

**Relay** (`packages/bridge/.env.relay`):
- `BRIDGE_PORT` — Listen port (default: 3053)
- `RELAY_ADMIN_TOKEN` — Bearer token for admin endpoints
- `RELAY_PROXY_TOKEN` — Bearer token for web app requests
- `NODE_ENV` — `development` (default) or `production`

See `DEPLOYMENT.md` for complete configuration reference.

## ChatGPT Custom GPT Setup

### Import OpenAPI Schema

1. Go to ChatGPT and create a new **Custom GPT**
2. In the Custom GPT editor, import the live OpenAPI schema from `https://brainbridge.prochat.tools/api/openapi` or paste the synced local export in `docs/openapi.chatgpt.json`
3. Set authentication to **Bearer token**, using your `BRAIN_BRIDGE_ACTION_TOKEN`
4. Test with a simple prompt: _"Get Brain Bridge status"_

### Available Actions

**Read-only actions:**
- `POST /api/actions/search` — Full-text search across your repositories
- `POST /api/actions/read` — Retrieve specific file content
- `POST /api/actions/search-and-read` — Search then automatically read top result

**Write actions:**
- `POST /api/actions/append-inbox-note` — Create a new note in your personal inbox

### Example Prompts for ChatGPT

```
"Search my brain for notes about AI and find the top 3 matches"

"Read my implementation architecture doc and summarize it"

"Search for 'decision log' and create a summary, then save it to my inbox"
```

## Current Limitations

- **Single relay per deployment** — Horizontal scaling for multiple relays planned
- **No external secret management** — Tokens via environment variables (use container secrets in production)
- **No structured logging** — Plain text logs; JSON logging with rotation planned
- **In-memory state** — Agent state lost on relay restart; database persistence planned
- **Single device per relay** — Multi-device support planned for Phase 5D+
- **No semantic search** — Full-text search only; embedding-based search planned

## Testing

```bash
# Type checking
pnpm type-check

# Run tests
pnpm test

# Verify search endpoint
curl -X POST http://localhost:3054/api/actions/search \
  -H "Authorization: Bearer $BRAIN_BRIDGE_ACTION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"brain","limit":5}'

# Verify relay health
curl http://localhost:3053/health | jq .
```

## Roadmap

### ✅ Completed

- Multi-source knowledge support across agent, API, and dashboard
- Relay WebSocket bridge with device coordination
- Bearer token authentication for relay-agent mode
- Personal inbox notes (append to local vault)
- Dual-repo architecture (Brain + Mind symlink)

### 📋 Planned (Open Source)

- **Enhanced CLI** — `init` and `connect` commands for one-shot setup
- **Semantic search** — Embedding-based relevance ranking (Phase 6)
- **PDF/DOCX support** — Beyond Markdown and text files (Phase 6)
- **GitHub export** — Push notes as Gists or repo files (Phase 7)
- **JSON logging with rotation** — Structured logs, auto-cleanup
- **Horizontal scaling** — Multiple relay instances with load balancing

## For Testers & Contributors

Brain Bridge is early stage and **actively seeking community feedback**.

### How You Can Help

**Test & Report:**
- Try the quick start locally and report bugs (or successes!) via [GitHub issues](https://github.com/stevewesthoek/brain-bridge/issues)
- Test with your own knowledge sources and let us know what works/breaks
- Try the ChatGPT Custom GPT integration and share feedback

**Contribute:**
- Pick an issue labeled `good-first-issue` or `help-wanted`
- Submit PRs for bug fixes, refactoring, or small features
- Improve documentation, examples, or tests
- Add support for new file formats or knowledge sources

**Spread the Word:**
- ⭐ Star the repo if Brain Bridge is interesting to you
- Share your use case in [Discussions](https://github.com/stevewesthoek/brain-bridge/discussions)
- Write a blog post or tutorial if you build something cool

### Development

```bash
# Install dependencies
pnpm install

# Run all services in dev mode
pnpm dev

# Type checking
pnpm type-check

# Run tests
pnpm test

# Build for production
pnpm build
```

## Support & Feedback

- **Issues & bugs**: [GitHub Issues](https://github.com/stevewesthoek/brain-bridge/issues)
- **Questions & ideas**: [GitHub Discussions](https://github.com/stevewesthoek/brain-bridge/discussions)
- **Deployment docs**: See `DEPLOYMENT.md` for ops guides and troubleshooting

## License

MIT — Free to use, modify, and distribute
