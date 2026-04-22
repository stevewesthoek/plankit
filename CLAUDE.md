# CLAUDE.md — buildflow

## Purpose

Repo-specific instructions and durable context for Claude Code.

## Workflow

- Work only within this repo unless explicitly told otherwise.
- Prefer surgical changes over broad rewrites.
- Preserve existing architecture and conventions unless asked to change them.
- Before major structural changes, inspect and explain the proposed plan.

## Architecture

**Dual-repo structure:**
- **BuildFlow** (this repo) — Machine brain, knowledge base, data vault; bridges both systems
- **Mind** (symlinked as `mind/` in repo root) — Personal brain, Obsidian vault; separate repo
- BuildFlow enables simultaneous access to both repos through a single entry point

**Tech stack:**
- Next.js 14 (web app, port 3054)
- Relay server (port 3053, bridges web → local agent)
- Local agent (port 3052, CLI from brain repo)
- Cloudflare tunnel (prochat.tools, public endpoint)

**Folder structure:**
- `apps/web/` — Next.js web app with API routes
- `apps/web/src/app/api/actions/` — ChatGPT Custom Actions (read-only)
- `apps/web/src/app/api/tools/` — Internal tools (not exposed to ChatGPT)
- `docs/openapi.chatgpt.json` — Static OpenAPI export kept in sync with the live `/api/openapi` route
- `packages/shared/` — Shared types
- `packages/cli/` — CLI agent
- `mind/` — **Symlink** to Mind repo (Obsidian vault); write personal notes here
- Access brain files directly; access mind files via `mind/` symlink

**Key endpoints:**
- `POST /api/actions/search` — Search local vault (read-only)
- `POST /api/actions/read` — Read file (read-only)
- `POST /api/actions/search-and-read` — Combined search + read (read-only)
- `POST /api/actions/append-inbox-note` — Create personal note in Mind inbox (write to `mind/01-inbox/`)
- `GET /api/openapi` — Dynamic OpenAPI schema

## Commands

```bash
# Install and develop
pnpm install
pnpm dev              # Start all services (3052, 3053, 3054)
pnpm type-check       # Verify types across all packages
pnpm build            # Production build
pnpm test             # Run tests

# Verify endpoints
curl -s https://buildflow.prochat.tools/api/openapi | jq '.paths | keys'
curl -s -X POST https://buildflow.prochat.tools/api/actions/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"brain","limit":2}' | jq .
```

## Do not break

- **Dual-repo paths** — Brain reads from repo root; Mind writes to `mind/01-inbox/` via symlink. Never write to `notes/inbox/` (old location).
- **Path safety** — Enforce no `../` traversal, no absolute paths. Mind paths must go through symlink only.
- **MVP scope** — Only Personal Notes writes allowed; all other operations read-only.
- **OpenAPI format** — Must be 3.1.0 with operationId for ChatGPT compatibility.
- **Port 3054** — Web app fixed port; required for stable Cloudflare tunnel.
- **Cloudflare tunnel** — Public endpoint via prochat.tools domain; disable after Phase 3.5 testing.

## Integrations

- **Cloudflare**: `buildflow.prochat.tools` public hostname (tunnel only, not in repo)
- **ChatGPT Custom GPT**: Imports the live `/api/openapi` schema or the synced `docs/openapi.chatgpt.json` export for Custom Actions
- **Local brain CLI**: Agent on port 3052 (separate repo, separate install)
- **Relay server**: Port 3053 (bridges web ↔ agent)

## Memory

This repo uses `.ai/current.md` for session handoffs (short-term resumable state) and `decision-log.md` for durable decisions (long-term architecture).

### `.ai/` directory structure

- `.ai/current.md` — Resumable session state (overwritten each session)
- `ai/handoffs/` — Archive of past handoffs (timestamped, optional)

### Workflow

- At end of session: Run `/handoff pause` to write `.ai/current.md`
- At start of session: Run `/handoff resume` to load context
- Before major decisions: Check `decision-log.md` for prior context
- After key decisions: Update `decision-log.md` if decision is durable

### Token optimization

- `.ai/current.md` is ruthlessly compressed: 200–500 tokens max
- No speculative ideas, debug noise, or secrets in either file
- `decision-log.md` is append-only; entries are never deleted or rewritten
