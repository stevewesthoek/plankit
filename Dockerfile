# Multi-stage build for Brain Bridge Relay

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build relay server (minimal build for relay only)
WORKDIR /app/packages/bridge
RUN pnpm build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user (use dynamic UID/GID to avoid conflicts)
RUN addgroup -S brainbridge && adduser -S brainbridge -G brainbridge -s /sbin/nologin

# Copy built code and dependencies (pnpm workspace structure)
COPY --from=builder /app/packages/bridge/dist ./packages/bridge/dist
COPY --from=builder /app/packages/bridge/package.json ./packages/bridge/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/bridge/node_modules ./packages/bridge/node_modules

# Create data directory with proper permissions
RUN mkdir -p /var/lib/brainbridge && chown -R brainbridge:brainbridge /var/lib/brainbridge

# Switch to package directory and non-root user
WORKDIR /app/packages/bridge
USER brainbridge

# Expose relay port
EXPOSE 3053

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3053/ready', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start relay server with data directory
ENV RELAY_DATA_DIR=/var/lib/brainbridge
CMD ["node", "./dist/server.js"]
