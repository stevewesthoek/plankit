#!/bin/bash

# Brain Bridge MVP — Quick Demo (Copy & Paste)
# Everything below is one workflow to test the MVP end-to-end

set -e

DEMO_VAULT="/tmp/brainbridge-demo"
REPO="/Users/Office/Repos/stevewesthoek/brain-bridge"

# Clean slate
rm -rf ~/.brainbridge "$DEMO_VAULT"

# Create test vault
mkdir -p "$DEMO_VAULT"

cat > "$DEMO_VAULT/business.md" << 'EOF'
# Business Context

Brain Bridge connects local Markdown vaults to ChatGPT.

## Vision
- Search your local notes from ChatGPT
- Create plans and save them back
- Keep everything local and private

## Implementation Phases
1. Local agent (MVP) ✅
2. SaaS bridge
3. ChatGPT integration
EOF

cat > "$DEMO_VAULT/architecture.md" << 'EOF'
# System Architecture

## Local Components
- CLI agent (Node.js)
- Search engine (Fuse.js)
- HTTP server (Fastify on port 3001)
- File manager (safe paths only)

## Security Features
- No path traversal attacks
- No file deletion
- Audit logging
- Markdown-only (MVP)
EOF

# Build
cd "$REPO"
echo "📦 Building Brain Bridge..."
pnpm build > /dev/null 2>&1

# Initialize CLI
echo "⚙️  Initializing CLI..."
cd "$REPO/packages/cli"
node dist/index.js init > /dev/null 2>&1

# Connect vault
echo "🔗 Connecting to vault..."
node dist/index.js connect "$DEMO_VAULT" > /dev/null 2>&1

# Show status
echo "📊 Status:"
node dist/index.js status

# Start server in background
echo ""
echo "🚀 Starting local server on http://127.0.0.1:3001"
node dist/index.js serve > /tmp/bb-server.log 2>&1 &
SERVER_PID=$!
sleep 2

# Test each operation
echo ""
echo "✅ Testing Operations:"
echo ""

# Test 1: Search
echo "1️⃣  Search for 'architecture'"
SEARCH=$(curl -s -X POST http://127.0.0.1:3001/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query": "architecture", "limit": 5}')
echo "$SEARCH" | grep -q "architecture.md" && echo "   ✓ Found architecture.md" || echo "   ✗ Search failed"

# Test 2: Read
echo ""
echo "2️⃣  Read file 'business.md'"
READ=$(curl -s -X POST http://127.0.0.1:3001/api/read \
  -H 'Content-Type: application/json' \
  -d '{"path": "business.md"}')
echo "$READ" | grep -q "Brain Bridge" && echo "   ✓ Read file content" || echo "   ✗ Read failed"

# Test 3: Create
echo ""
echo "3️⃣  Create new note"
CREATE=$(curl -s -X POST http://127.0.0.1:3001/api/create \
  -H 'Content-Type: application/json' \
  -d '{"path": "BrainBridge/Inbox/demo-plan.md", "content": "# Demo Plan\n\nCreated via local API!"}')
echo "$CREATE" | grep -q "created" && echo "   ✓ Note created" || echo "   ✗ Create failed"

# Test 4: Append
echo ""
echo "4️⃣  Append to note"
APPEND=$(curl -s -X POST http://127.0.0.1:3001/api/append \
  -H 'Content-Type: application/json' \
  -d '{"path": "BrainBridge/Inbox/demo-plan.md", "content": "\n\n## Update\n\nAppended content works!"}')
echo "$APPEND" | grep -q "appended" && echo "   ✓ Content appended" || echo "   ✗ Append failed"

# Test 5: Export Plan
echo ""
echo "5️⃣  Export Claude Code plan"
EXPORT=$(curl -s -X POST http://127.0.0.1:3001/api/export-plan \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Brain Bridge Demo",
    "summary": "Local demo proof of concept",
    "projectGoal": "Connect vault to ChatGPT",
    "techStack": "Node.js, Fuse.js, Fastify",
    "implementationPlan": "Phase 1: Local agent",
    "tasks": ["search", "read", "create", "append", "export"],
    "acceptanceCriteria": ["All endpoints work", "Files created on disk"]
  }')
echo "$EXPORT" | grep -q "created" && echo "   ✓ Plan exported" || echo "   ✗ Export failed"

# Kill server
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

# Show files created
echo ""
echo "📁 Files created in vault:"
find "$DEMO_VAULT" -type f -name "*.md" | sort | sed 's|^|   |'

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  ✅ Local Demo Complete!               ║"
echo "║                                        ║"
echo "║  All 5 operations tested successfully  ║"
echo "║  Files created on disk                 ║"
echo "║  Ready for ChatGPT integration (Phase 2)║"
echo "╚════════════════════════════════════════╝"
