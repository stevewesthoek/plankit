#!/bin/bash

# BuildFlow unified restart script
# Reuses the stop/start helpers, cleans stale build artifacts, rebuilds, and starts the stack again.

set -e

REPO_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[BuildFlow]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[BuildFlow]${NC} $1"
}

log_error() {
  echo -e "${RED}[BuildFlow ERROR]${NC} $1"
}

cd "$REPO_ROOT"
log_info "Stopping BuildFlow services via stop-all.sh..."
./stop-all.sh

log_info "Cleaning stale build artifacts..."
rm -rf apps/web/.next

log_info "Rebuilding BuildFlow packages..."
pnpm --dir packages/cli build
pnpm --dir apps/web build
pnpm -r build

log_info "Starting BuildFlow services via start-all.sh..."
./start-all.sh

log_info "BuildFlow restart sequence complete"
