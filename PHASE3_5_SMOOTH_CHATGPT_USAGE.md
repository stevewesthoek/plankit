# Phase 3.5: Smooth ChatGPT Custom GPT Usage

## Status
✅ **Live** — Brain Bridge is confirmed working with ChatGPT Custom GPT.

## Problem: Why ChatGPT Asks for Confirmations

ChatGPT's Custom Actions interface requires explicit user confirmation for **every API call** by design. This is a safety feature to:

- Prevent unintended API calls from LLM hallucinations
- Let the user review what data the GPT is about to access
- Maintain transparency over API usage

**However:** ChatGPT **may show fewer confirmations** if:
1. The Custom GPT instructions explicitly authorize action calls
2. The actions are well-described and their purpose is clear
3. The user trains the GPT through repeated approved calls

## Solution: Use the Combined Search-and-Read Action

Brain Bridge now provides **three read-only actions**:

### 1. `/api/actions/search` (read-only)
- Search the vault for files by query
- Returns relative file paths (safe for read action)
- Does not modify any files
- Absolute paths and `../` traversal blocked

### 2. `/api/actions/read` (read-only)
- Read full content of a file
- Only accepts relative paths from search results
- Does not modify any files
- Absolute paths and `../` traversal blocked

### 3. `/api/actions/search-and-read` (read-only, combined)
- **NEW:** Search and read top N results in a single action call
- Limited to 3 results maximum
- Combines search + read for fewer confirmations
- Does not modify any files
- Absolute paths and `../` traversal blocked

## Recommended GPT Instructions

Add this to your Brain Bridge Custom GPT system prompt:

```
You have access to Brain Bridge, a local knowledge vault API. Use these actions to search and read user's personal knowledge:

1. **search-and-read (preferred)**: Use this to search and read results in one call. Provide a search query and limit (1-3). Returns full file contents. This action reduces confirmation prompts.

2. **search**: If you need to see many results before deciding which to read, search first to see titles, snippets, and scores, then use read separately.

3. **read**: To read a specific file by path (from search results).

All actions are read-only. They do not modify or create files. Only relative paths from search results are valid; absolute paths and path traversal are blocked.

When the user asks you to search their brain or find information, use search-and-read by default. Only split into separate search + read calls if you need to explore multiple search results.
```

## Test Prompts

### Test 1: Simple Search-and-Read
```
"Search my brain for 'Claude' and show me the results with full content."
```
Expected: 1-3 file results with full content in a single call.

### Test 2: Combined Search-and-Read
```
"Find everything about brain bridge architecture and show me the top 2 files."
```
Expected: 1-2 files with full content.

### Test 3: Specific File Read
```
"Search for 'decision log' and then read the first result."
```
Expected: Search results, then optionally read the top file. User may see two confirmations, but this is normal for sequential actions.

## How to Reduce Confirmations

1. **Use search-and-read by default** in your GPT instructions (recommended above)
2. **Train ChatGPT** — Approve multiple search-and-read calls; ChatGPT learns patterns
3. **Be specific with queries** — More precise queries = fewer results = faster confirmations
4. **Expect confirmations for safety** — ChatGPT will always ask; this is intentional

## Security Notes

✅ **Read-only MVP:**
- No create, append, or export actions exposed
- No write operations possible
- Absolute paths blocked
- Parent directory traversal (`../`) blocked
- No authentication required (for MVP testing only — disable after)

⚠️ **After testing:**
1. Disable public endpoint (stop local stack or remove Cloudflare rule)
2. Add authentication for production use
3. Review access logs

## Implementation Details

- **Port**: 3054 (web app)
- **Public URL**: https://brainbridge.prochat.tools
- **Search-and-read limit**: Max 3 results (capped for safety)
- **Rate limiting**: None (MVP testing only)
- **Authentication**: Disabled (MVP testing only)

## Files Changed

- `apps/web/src/app/api/openapi/route.ts` — Added search-and-read endpoint, improved descriptions
- `apps/web/src/app/api/actions/search-and-read/route.ts` — New combined action handler
- `docs/openapi.chatgpt.json` — Added search-and-read action

## Next Steps

1. ✅ **Import updated OpenAPI** to ChatGPT Custom GPT Actions
2. ✅ **Update system prompt** with recommendations above
3. ✅ **Test search-and-read** with provided test prompts
4. ⏳ **Disable public access** when Phase 3.5 testing complete
5. ⏳ **Add authentication** for production use

## Disable Commands

To stop public access after testing:

```bash
# Stop local stack
cd /Users/Office/Repos/stevewesthoek/brain-bridge
pnpm stop  # or Ctrl+C in running terminal

# Verify tunnel is down
curl -s https://brainbridge.prochat.tools/api/openapi || echo "✓ Public endpoint is down"
```

Or, disable Cloudflare tunnel:

```bash
# List active tunnels
cloudflared tunnel list

# Stop tunnel (if running via CLI)
# Ctrl+C in the tunnel terminal
```

## Summary

**Phase 3.5 is safe to use** with the MVP constraints:
- Read-only actions only
- No create/append/export
- No authentication (testing only)
- No database persistence
- Path traversal blocked

Confirmations are a ChatGPT safety feature. Use search-and-read to minimize them.
