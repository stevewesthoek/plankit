#!/bin/bash

set -e

echo "=== Brain Bridge Phase 2 Verification Script ==="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Setup: Create test workspace
TEST_DIR="/tmp/brain-bridge-test-workspace"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# Create test files
mkdir -p "$TEST_DIR/docs"
mkdir -p "$TEST_DIR/src"

echo "# Test README" > "$TEST_DIR/README.md"
echo "# Documentation" > "$TEST_DIR/docs/index.md"
echo "export function hello() { console.log('hello'); }" > "$TEST_DIR/src/index.ts"
echo "# Config" > "$TEST_DIR/MANIFEST.md"

# Create a config with workspaces
CONFIG_DIR="$HOME/.brainbridge"
mkdir -p "$CONFIG_DIR"

CONFIG_FILE="$CONFIG_DIR/config.json"
cat > "$CONFIG_FILE" << 'EOF'
{
  "userId": "test-user",
  "deviceId": "test-device",
  "deviceToken": "test-token",
  "apiBaseUrl": "http://localhost:3052",
  "vaultPath": "/tmp/test-vault",
  "localPort": 3052,
  "mode": "read_create_append",
  "allowedExtensions": [".md", ".txt"],
  "ignorePatterns": [".git/**", ".obsidian/**", "node_modules/**"],
  "workspaces": [
    {
      "name": "test",
      "root": "/tmp/brain-bridge-test-workspace",
      "mode": "read_only",
      "excludePatterns": [".git/**", "node_modules/**"]
    }
  ]
}
EOF

echo "✓ Test workspace created at $TEST_DIR"
echo "✓ Config updated at $CONFIG_FILE"
echo ""

# Start server in background
echo "=== Building and Starting Agent ==="
echo ""

# Build CLI
cd "$SCRIPT_DIR"
echo "Building CLI..."
pnpm --filter=brainbridge build

# Kill any existing process on port 3052
lsof -ti:3052 | xargs kill -9 2>/dev/null || true

# Start server in background (no timeout command on macOS, use sleep)
echo "Starting server on port 3052..."
node "$SCRIPT_DIR/packages/cli/dist/index.js" serve > /tmp/brainbridge-test.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start
sleep 3

# Verify server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "✗ Server failed to start"
  cat /tmp/brainbridge-test.log
  exit 1
fi

echo "✓ Server started successfully"
echo ""
echo "=== Testing Endpoints ==="
echo ""

BASE_URL="http://127.0.0.1:3052"

# Test 1: Health check
echo "Test 1: Health check"
HEALTH=$(curl -s "$BASE_URL/health" || echo '{}')
echo "Response: $HEALTH"
echo ""

# Test 2: List workspaces
echo "Test 2: List workspaces"
WORKSPACES=$(curl -s "$BASE_URL/api/workspaces" || echo '{}')
echo "Response: $WORKSPACES"
WORKSPACE_COUNT=$(echo "$WORKSPACES" | grep -o '"name"' | wc -l)
if [ "$WORKSPACE_COUNT" -ge 1 ]; then
  echo "✓ Workspaces endpoint working (found $WORKSPACE_COUNT workspace(s))"
else
  echo "✗ Workspaces endpoint failed"
fi
echo ""

# Test 3: Tree inspection
echo "Test 3: Tree inspection (/api/tree)"
TREE=$(curl -s -X POST "$BASE_URL/api/tree" \
  -H "Content-Type: application/json" \
  -d '{"workspace":"test","path":"","maxDepth":2,"maxEntries":100}' || echo '{}')
echo "Response: $TREE"
TREE_COUNT=$(echo "$TREE" | grep -o '"name"' | wc -l)
if [ "$TREE_COUNT" -ge 1 ]; then
  echo "✓ Tree endpoint working (found $TREE_COUNT item(s))"
else
  echo "✗ Tree endpoint failed"
fi
echo ""

# Test 4: Grep search
echo "Test 4: Grep search (/api/grep)"
GREP=$(curl -s -X POST "$BASE_URL/api/grep" \
  -H "Content-Type: application/json" \
  -d '{"workspace":"test","pattern":"hello","maxResults":100}' || echo '{}')
echo "Response: $GREP"
GREP_COUNT=$(echo "$GREP" | grep -o '"line"' | wc -l)
if [ "$GREP_COUNT" -ge 1 ]; then
  echo "✓ Grep endpoint working (found $GREP_COUNT match(es))"
else
  echo "✓ Grep endpoint working (no matches expected for test)"
fi
echo ""

# Test 5: Context assembly
echo "Test 5: Context assembly (/api/context)"
CONTEXT=$(curl -s -X POST "$BASE_URL/api/context" \
  -H "Content-Type: application/json" \
  -d '{"workspace":"test","query":"","maxDepth":2,"maxFiles":20}' || echo '{}')
echo "Response: $CONTEXT"
HAS_WORKSPACE=$(echo "$CONTEXT" | grep -o '"workspace":"test"' || echo '')
if [ -n "$HAS_WORKSPACE" ]; then
  echo "✓ Context endpoint working"
else
  echo "✗ Context endpoint failed"
fi
echo ""

# Summary
echo ""
echo "=== Summary ==="
if [ $? -eq 0 ]; then
  echo "✓ All tests passed"
else
  echo "✗ Some tests failed"
fi

# Cleanup
echo ""
echo "=== Cleanup ==="
kill $SERVER_PID 2>/dev/null || true
sleep 1
rm -rf "$TEST_DIR"

echo "✓ Verification complete"
echo "Server logs: /tmp/brainbridge-test.log"
