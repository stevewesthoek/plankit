#!/bin/bash

# Brain Bridge unified start script
# Starts agent (3052), web (3054), and relay (3053)
# Logs to /tmp/brain-bridge-{agent,web,relay}.log

set -e

REPO_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_DIR="/tmp"

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

# Step 1: Verify Docker/OrbStack availability
log_info "Checking Docker daemon availability..."
if ! docker ps > /dev/null 2>&1; then
  log_error "Docker daemon not responding at ~/.orbstack/run/docker.sock"
  log_error "Is OrbStack running? Try: orbctl start"
  exit 1
fi
log_info "✓ Docker daemon available"

# Step 2: Check if services are already running to avoid duplicate launches
log_info "Checking if services are already running..."
AGENT_RUNNING=0
WEB_RUNNING=0
RELAY_RUNNING=0

if curl -s http://localhost:3052/health > /dev/null 2>&1; then
  AGENT_RUNNING=1
  log_warn "Agent (3052) already running"
fi

if curl -s http://localhost:3054/api/openapi > /dev/null 2>&1; then
  WEB_RUNNING=1
  log_warn "Web (3054) already running"
fi

if docker ps --filter name=brainbridge-relay --filter status=running | grep -q brainbridge-relay; then
  RELAY_RUNNING=1
  log_warn "Relay (3053) already running"
fi

# If all are running, we're done
if [ $AGENT_RUNNING -eq 1 ] && [ $WEB_RUNNING -eq 1 ] && [ $RELAY_RUNNING -eq 1 ]; then
  log_info "All services already running"
  exit 0
fi

# Step 3: Start agent and web (if not already running)
if [ $AGENT_RUNNING -eq 0 ] || [ $WEB_RUNNING -eq 0 ]; then
  log_info "Starting agent and web app..."
  cd "$REPO_ROOT"

  # Kill any stale pnpm processes first
  pkill -f "pnpm dev" 2>/dev/null || true
  sleep 1

  # Start pnpm dev in background (runs both agent and web)
  nohup pnpm dev > "$LOG_DIR/brain-bridge.log" 2>&1 &
  PNPM_PID=$!

  # Wait for services to be ready
  log_info "Waiting for agent and web to start..."
  for i in {1..30}; do
    if [ $AGENT_RUNNING -eq 0 ] && curl -s http://localhost:3052/health > /dev/null 2>&1; then
      log_info "✓ Agent (3052) started"
      AGENT_RUNNING=1
    fi
    if [ $WEB_RUNNING -eq 0 ] && curl -s http://localhost:3054/api/openapi > /dev/null 2>&1; then
      log_info "✓ Web (3054) started"
      WEB_RUNNING=1
    fi

    if [ $AGENT_RUNNING -eq 1 ] && [ $WEB_RUNNING -eq 1 ]; then
      break
    fi

    sleep 1
  done

  if [ $AGENT_RUNNING -eq 0 ]; then
    log_error "Agent failed to start within 30 seconds"
    exit 1
  fi

  if [ $WEB_RUNNING -eq 0 ]; then
    log_error "Web app failed to start within 30 seconds"
    exit 1
  fi
fi

# Step 4: Start relay (if not already running)
if [ $RELAY_RUNNING -eq 0 ]; then
  log_info "Starting relay via Docker..."
  cd "$REPO_ROOT"

  export RELAY_ENV_FILE=~/.config/brain-bridge/.env.relay
  if ! docker compose up -d > "$LOG_DIR/brain-bridge-relay.log" 2>&1; then
    log_error "Failed to start relay (docker compose error)"
    cat "$LOG_DIR/brain-bridge-relay.log"
    exit 1
  fi

  # Wait for relay to be healthy
  log_info "Waiting for relay to be healthy..."
  for i in {1..15}; do
    if curl -s http://localhost:3053/health > /dev/null 2>&1; then
      log_info "✓ Relay (3053) started and healthy"
      break
    fi
    sleep 1
  done

  if ! curl -s http://localhost:3053/health > /dev/null 2>&1; then
    log_error "Relay failed to become healthy within 15 seconds"
    exit 1
  fi
fi

log_info "All services started successfully"
log_info "  Agent:  http://localhost:3052"
log_info "  Web:    http://localhost:3054"
log_info "  Relay:  http://localhost:3053"
exit 0
