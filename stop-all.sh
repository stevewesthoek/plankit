#!/bin/bash

# Brain Bridge unified stop script
# Stops agent (3052), web (3054), and relay (3053)

set -e

REPO_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[Brain Bridge]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[Brain Bridge]${NC} $1"
}

log_error() {
  echo -e "${RED}[Brain Bridge ERROR]${NC} $1"
}

# Step 1: Stop relay via docker compose
log_info "Stopping relay..."
cd "$REPO_ROOT"
if docker ps --filter name=brainbridge-relay --filter status=running | grep -q brainbridge-relay; then
  if docker compose down > /dev/null 2>&1; then
    log_info "✓ Relay stopped"
  else
    log_warn "Relay stop command failed, but continuing"
  fi
else
  log_warn "Relay not running"
fi

# Step 2: Stop agent and web (kill pnpm and related processes)
log_info "Stopping agent and web..."
KILLED=0
if pkill -f "pnpm dev" 2>/dev/null; then
  KILLED=1
fi
if pkill -f "next dev" 2>/dev/null; then
  KILLED=1
fi
if pkill -f "tsx.*serve" 2>/dev/null; then
  KILLED=1
fi

if [ $KILLED -eq 1 ]; then
  log_info "✓ Agent and web stopped"
  sleep 2
else
  log_warn "No pnpm dev or Next.js process found"
fi

# Step 3: Verify everything is stopped
log_info "Verifying services are stopped..."
sleep 2

AGENT_RUNNING=0
WEB_RUNNING=0
RELAY_RUNNING=0

if curl -s http://localhost:3052/health > /dev/null 2>&1; then
  AGENT_RUNNING=1
  log_error "Agent still running on 3052"
fi

if curl -s http://localhost:3054/api/openapi > /dev/null 2>&1; then
  WEB_RUNNING=1
  log_error "Web still running on 3054"
fi

if docker ps --filter name=brainbridge-relay --filter status=running | grep -q brainbridge-relay; then
  RELAY_RUNNING=1
  log_error "Relay still running on 3053"
fi

if [ $AGENT_RUNNING -eq 0 ] && [ $WEB_RUNNING -eq 0 ] && [ $RELAY_RUNNING -eq 0 ]; then
  log_info "All services stopped successfully"
  exit 0
else
  log_error "Some services failed to stop"
  exit 1
fi
