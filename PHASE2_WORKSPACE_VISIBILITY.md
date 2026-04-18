# Phase 2: Workspace Visibility & Context Assembly

**Status:** ✅ **IMPLEMENTED**  
**Date:** 2026-04-18  
**Purpose:** Enable Brain Bridge to safely expose and reason over the complete structure of registered local workspace roots.

---

## Overview

Phase 2 extends Brain Bridge to support multiple registered workspace roots, enabling:

1. **Workspace Registration** — Define approved directory roots in config
2. **Safe Path Resolution** — Prevent directory traversal attacks
3. **Bounded Tree Inspection** — Explore workspace structure with safety limits
4. **Workspace Grep** — Search for patterns across files
5. **Context Assembly** — Build repo-understanding bundles for AI analysis

All operations are **read-only**, use **explicit workspace roots**, enforce **safe path validation**, and include **audit logging**.

---

## Configuration

### Config Format

Add `workspaces` array to `~/.brainbridge/config.json`:

```json
{
  "userId": "...",
  "deviceId": "...",
  "deviceToken": "...",
  "apiBaseUrl": "...",
  "vaultPath": "...",
  "localPort": 3052,
  "mode": "read_create_append",
  "allowedExtensions": [".md", ".txt"],
  "ignorePatterns": [".git/**", "node_modules/**"],
  "workspaces": [
    {
      "name": "brain",
      "root": "~/Repos/stevewesthoek/brain",
      "mode": "read_only",
      "excludePatterns": [".git/**", "node_modules/**", ".obsidian/**"]
    },
    {
      "name": "vault",
      "root": "~/Documents/vault",
      "mode": "read_only"
    }
  ]
}
```

### Workspace Schema

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `name` | string | ✓ | — | Unique identifier for workspace |
| `root` | string | ✓ | — | Absolute path (expands `~`) |
| `mode` | string | ✓ | — | `read_only` or `default` |
| `excludePatterns` | string[] | ✗ | `[]` | Glob patterns to skip (e.g. `.git/**`) |
| `includePatterns` | string[] | ✗ | `[]` | Restrict to patterns (optional) |

### Backward Compatibility

If no `workspaces` array is defined, Brain Bridge automatically creates a default workspace from the existing `vaultPath`:

```json
{
  "name": "vault",
  "root": "<vaultPath>",
  "mode": "default"
}
```

---

## CLI Commands

### List Workspaces

```bash
brainbridge workspace list
```

Output:
```
Registered Workspaces:

  brain
    Root: /Users/office/Repos/stevewesthoek/brain
    Mode: read_only
    Exclude: .git/**, node_modules/**

  vault
    Root: /Users/office/Documents/vault
    Mode: read_only
```

### Tree Inspection

```bash
brainbridge tree <workspace> [path] [--depth N]
```

Examples:
```bash
brainbridge tree brain
brainbridge tree brain src --depth 4
```

Output:
```
Tree for workspace: brain

  📁 packages
     Size: 4096 bytes
     Modified: 04/18/2026
  📄 README.md
     Size: 2048 bytes
     Modified: 04/17/2026
  📄 MANIFEST.md
     Size: 1512 bytes
     Modified: 04/16/2026

Total items: 15
```

### Grep / Search

```bash
brainbridge grep <workspace> <pattern> [--max N]
```

Examples:
```bash
brainbridge grep brain "export function"
brainbridge grep brain "TODO" --max 20
```

Output:
```
Grep results for workspace: brain
Pattern: export function

src/index.ts:5
  export function search(query: string): SearchResult[] {

packages/cli/src/commands/serve.ts:3
  export async function serveCommand(): Promise<void> {

Total matches: 12
```

### Context Assembly

```bash
brainbridge context <workspace> [query] [--depth N]
```

Examples:
```bash
brainbridge context brain
brainbridge context brain "search implementation" --depth 3
```

Output:
```
Context Assembly for workspace: brain

Workspace: brain
Root: /Users/office/Repos/stevewesthoek/brain
Mode: read_only

Tree Summary (depth 2):
  Total items: 47
  Files: 23
  Directories: 24

Entry points: README.md, MANIFEST.md

Use /api/context endpoint for full context assembly with search.
```

---

## HTTP API Endpoints

### GET `/api/workspaces`

List all registered workspaces.

**Response:**
```json
{
  "workspaces": [
    {
      "name": "brain",
      "root": "/Users/office/Repos/stevewesthoek/brain",
      "mode": "read_only"
    },
    {
      "name": "vault",
      "root": "/Users/office/Documents/vault",
      "mode": "read_only"
    }
  ]
}
```

### POST `/api/tree`

Inspect workspace structure with bounded depth/entry limits.

**Request:**
```json
{
  "workspace": "brain",
  "path": "packages/cli",
  "maxDepth": 3,
  "maxEntries": 100
}
```

**Response:**
```json
{
  "tree": [
    {
      "name": "src",
      "type": "directory",
      "path": "packages/cli/src",
      "size": 4096,
      "modifiedAt": "2026-04-18T10:30:00Z"
    },
    {
      "name": "package.json",
      "type": "file",
      "path": "packages/cli/package.json",
      "size": 512,
      "modifiedAt": "2026-04-18T10:30:00Z"
    }
  ],
  "count": 12
}
```

### POST `/api/grep`

Search for patterns across workspace files.

**Request:**
```json
{
  "workspace": "brain",
  "pattern": "export function",
  "maxResults": 100,
  "maxLineLength": 500
}
```

**Response:**
```json
{
  "results": [
    {
      "file": "src/index.ts",
      "line": 5,
      "content": "export function search(query: string): SearchResult[] {"
    },
    {
      "file": "packages/cli/src/commands/serve.ts",
      "line": 3,
      "content": "export async function serveCommand(): Promise<void> {"
    }
  ],
  "count": 12
}
```

### POST `/api/context`

Assemble a comprehensive context bundle for AI analysis.

**Request:**
```json
{
  "workspace": "brain",
  "query": "search implementation",
  "maxDepth": 2,
  "maxFiles": 20
}
```

**Response:**
```json
{
  "workspace": "brain",
  "summary": "Workspace: brain\nRoot: /Users/office/Repos/stevewesthoek/brain\nMode: read_only\nTree items: 47",
  "tree": [
    {
      "name": "packages",
      "type": "directory",
      "path": "packages"
    },
    {
      "name": "README.md",
      "type": "file",
      "path": "README.md"
    }
  ],
  "docs": [
    {
      "path": "src/index.ts",
      "title": "search implementation",
      "score": 0.95,
      "snippet": "export function search(...)",
      "modifiedAt": "2026-04-18T10:30:00Z"
    }
  ],
  "entrypoints": ["README.md", "MANIFEST.md"],
  "keyFiles": []
}
```

---

## Safety Guardrails

### Path Validation

1. **Traversal Prevention** — Blocks `..` and absolute paths
2. **Hidden Files** — Excludes paths starting with `.`
3. **Exclude Patterns** — Honors workspace-level excludes (e.g., `.git/**`)
4. **Root Boundary** — All resolved paths must stay within workspace root

### File Read Guardrails (Workspace Reads)

1. **Extension Whitelist** — Only safe text/config types: `.md`, `.txt`, `.json`, `.yaml`, `.ts`, `.tsx`, `.js`, `.jsx`, `.sh`, `.csv`, `.env.example`
2. **Size Limit** — Max 1 MB per file (protects from memory exhaustion)
3. **Type Checking** — Rejects directories; only reads files
4. **Existence Check** — Verifies file exists before reading

### Caps & Limits

| Limit | Default | Configurable |
|-------|---------|--------------|
| Max tree depth | 3 | ✓ (per request) |
| Max tree entries | 100 | ✓ (per request) |
| Max grep results | 100 | ✓ (per request) |
| Max line length | 500 chars | ✓ (per request) |
| Max file size (read) | 1 MB | Fixed |
| Grep batch size | 100 files/batch | Fixed |

### Audit Logging

All workspace operations logged to `~/.brainbridge/audit.log`:

```json
{
  "timestamp": "2026-04-18T10:30:45.123Z",
  "tool": "tree",
  "workspace": "brain",
  "path": "packages/cli",
  "status": "success"
}
```

---

## Type Definitions

### Workspace

```typescript
export type Workspace = {
  name: string
  root: string
  mode: 'read_only' | 'default'
  includePatterns?: string[]
  excludePatterns?: string[]
}
```

### TreeNode

```typescript
export type TreeNode = {
  name: string
  type: 'file' | 'directory'
  path: string
  size?: number
  modifiedAt?: string
}
```

### GrepMatch

```typescript
export type GrepMatch = {
  file: string
  line: number
  content: string
  context?: string
}
```

### ContextAssembly

```typescript
export type ContextAssembly = {
  workspace: string
  summary: string
  tree: TreeNode[]
  docs: SearchResult[]
  entrypoints: string[]
  keyFiles: FileContent[]
}
```

---

## Implementation Details

### Core Modules

**`packages/cli/src/agent/workspace.ts`**

Helper functions for workspace operations:

- `resolveWorkspacePath()` — Safely resolve relative paths within workspace root
- `validateWorkspacePath()` — Check path against traversal, hidden file, and exclude rules
- `getWorkspaceInfo()` — Fetch workspace config
- `listWorkspaceTree()` — Recursively list directory structure with depth/entry caps
- `grepWorkspace()` — Search files for patterns with result caps

**`packages/cli/src/agent/config.ts` (extended)**

- `getWorkspaces()` — Return configured workspaces (or default from vault)
- `getWorkspace()` — Fetch workspace by name

**`packages/cli/src/agent/server.ts` (extended)**

New endpoints:
- `GET /api/workspaces`
- `POST /api/tree`
- `POST /api/grep`
- `POST /api/context`

**`packages/shared/src/types.ts` (extended)**

New types:
- `Workspace`
- `TreeNode`
- `GrepMatch`
- `ContextAssembly`

### CLI Commands

- `workspace list` — List registered workspaces
- `tree <workspace> [path] [--depth]` — Inspect tree
- `grep <workspace> <pattern> [--max]` — Search workspace
- `context <workspace> [query] [--depth]` — Assemble context

---

## Testing

### Unit Tests

```bash
pnpm --filter=brainbridge test
```

Tests cover:
- Path traversal blocking
- Hidden file rejection
- Exclude pattern matching
- Tree depth/entry caps
- Grep result caps
- Workspace validation

### Integration Tests

```bash
./VERIFY_PHASE2.sh
```

Verification script:
1. Creates test workspace with sample files
2. Starts local agent server
3. Tests all endpoints
4. Validates responses
5. Cleans up

---

## Migration from Single Vault

If upgrading from Phase 1 config with single `vaultPath`:

**Before:**
```json
{
  "vaultPath": "~/Repos/stevewesthoek/brain",
  ...
}
```

**After (automatic):**
```json
{
  "workspaces": [
    {
      "name": "vault",
      "root": "~/Repos/stevewesthoek/brain",
      "mode": "default"
    }
  ],
  "vaultPath": "~/Repos/stevewesthoek/brain",
  ...
}
```

Existing API calls (e.g., `/api/read`, `/api/create`) continue to work with the default `vaultPath`.

---

## Next Steps

### Phase 2.1 — Extended Context Assembly
- Extract key files based on query (not just tree)
- Score/rank files by relevance
- Generate summaries for entry points
- Optional: markdown output for AI consumption

### Phase 2.2 — Workspace Search Integration
- Combine grep + tree + search into unified query
- Filter by file type, size, age
- Support complex patterns (AND, OR, NOT)

### Phase 3 — ChatGPT Integration
- Expose `/api/tree` and `/api/context` to ChatGPT Custom Actions
- Allow ChatGPT to inspect repo structure without prompt brittleness
- Generate context-aware summaries for code analysis

---

## Verification Checklist

- ✅ Workspace config support added
- ✅ Safe path resolution with traversal checks
- ✅ Tree endpoint with depth/entry limits
- ✅ Grep endpoint with result caps
- ✅ Context assembly endpoint
- ✅ CLI commands for all operations
- ✅ Type definitions for all new types
- ✅ Audit logging for all operations
- ✅ Backward compatibility with single vault
- ✅ Test coverage for safety guarantees
- ✅ Verification script (VERIFY_PHASE2.sh)
- ✅ Documentation (this file)

---

## Security Notes

1. **No Write Access** — Phase 2 is read-only by design
2. **Explicit Roots** — Only registered workspace roots are accessible
3. **Path Normalization** — All paths normalized and validated before use
4. **Audit Trail** — All operations logged with timestamp, tool, workspace, status
5. **Hidden Files Blocked** — Dot-files and dot-directories always hidden
6. **Exclude Patterns** — Workspace can configure additional exclusions (e.g., `.git/**`)
7. **Result Caps** — All unbounded operations have hard limits (tree depth, grep matches, etc.)

---

## Troubleshooting

### Workspace not found

```
Error: Workspace not found: missing
```

**Solution:** Run `brainbridge workspace list` to see configured workspaces. Check `~/.brainbridge/config.json` for typos.

### Access denied: Path outside workspace

```
Error: Access denied. Path outside workspace: brain
```

**Solution:** Path contains `..` or starts with `/`. Use relative paths only (e.g., `docs/index.md` not `../docs/index.md`).

### Hidden files excluded

```
Error: Hidden files not allowed
```

**Solution:** Paths starting with `.` are blocked (e.g., `.git/config`). This is by design.

### No grep results

Grep searches `.md`, `.txt`, `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.yaml`, `.yml` files only. Other file types are skipped.

---

## References

- Implementation: `packages/cli/src/agent/workspace.ts`
- Config: `packages/cli/src/agent/config.ts`
- Server: `packages/cli/src/agent/server.ts`
- Types: `packages/shared/src/types.ts`
- Tests: `packages/cli/src/agent/workspace.test.ts`
