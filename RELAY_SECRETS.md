# Brain Bridge Relay — Local Secret Placement Guide

This document describes the recommended pattern for managing relay secrets locally, from dev to production-like containerized deployment.

## Quick Start

```bash
# 1. Create local secrets file (gitignored)
mkdir -p ~/.config/brain-bridge
cp packages/bridge/.env.relay ~/.config/brain-bridge/.env.relay

# 2. Generate admin token
echo "RELAY_ADMIN_TOKEN=$(openssl rand -hex 32)" >> ~/.config/brain-bridge/.env.relay

# 3. Set production mode
echo "RELAY_ENABLE_DEFAULT_TOKENS=false" >> ~/.config/brain-bridge/.env.relay

# 4. Source and run relay
export $(cat ~/.config/brain-bridge/.env.relay | xargs)
pnpm dev  # or docker compose up -d
```

---

## Secret Placement Strategy

### Local Development

**Pattern:** Env var from `~/.config/brain-bridge/.env.relay` (user home, never committed)

**File:**
```
~/.config/brain-bridge/.env.relay    (mode 600, gitignored)
```

**Contents:**
```bash
RELAY_ADMIN_TOKEN=<generated-secret>
RELAY_ENABLE_DEFAULT_TOKENS=true   # OK for local dev
BRIDGE_PORT=3053
NODE_ENV=development
```

**Setup:**
```bash
# One-time setup
mkdir -p ~/.config/brain-bridge
cp brain-bridge/packages/bridge/.env.relay ~/.config/brain-bridge/.env.relay

# Edit with real token
nano ~/.config/brain-bridge/.env.relay

# Source before running relay
export $(cat ~/.config/brain-bridge/.env.relay | xargs)
pnpm dev
```

**Why this approach:**
- ✓ Secrets live outside git
- ✓ Easy to rotate locally
- ✓ Different per machine
- ✓ Follows standard `~/.config/` convention
- ✓ Clear separation of template (committed) vs. actual values (local-only)

---

### Local OrbStack/Docker Deployment (Production-like)

**Pattern:** External env file + docker-compose references it

**Files:**
```
~/.config/brain-bridge/.env.relay         (actual secrets, gitignored)
brain-bridge/docker-compose.yml           (template, references .env file, committed)
brain-bridge/packages/bridge/.env.relay   (template only, no secrets, committed)
```

**Setup:**

```bash
# 1. Create actual secrets file
mkdir -p ~/.config/brain-bridge
cat > ~/.config/brain-bridge/.env.relay << 'EOF'
RELAY_ADMIN_TOKEN=$(openssl rand -hex 32)
RELAY_ENABLE_DEFAULT_TOKENS=false
BRIDGE_PORT=3053
NODE_ENV=production
EOF
chmod 600 ~/.config/brain-bridge/.env.relay

# 2. Tell docker-compose where to find it
export RELAY_ENV_FILE=~/.config/brain-bridge/.env.relay

# 3. Start container
docker compose up -d
```

**docker-compose.yml should include:**
```yaml
services:
  relay:
    # ... other config ...
    env_file:
      - ${RELAY_ENV_FILE:-packages/bridge/.env.relay}
```

**Why this approach:**
- ✓ Secrets never in compose file
- ✓ Same compose file works locally and in CI/container
- ✓ Clean separation: template → compose → env → runtime
- ✓ Easy to swap env for production vault later

---

### Future Hosted SaaS Deployment

**Pattern:** Secrets injected at runtime from secret manager

**How it works:**
```bash
# Kubernetes (example)
kubectl create secret generic brain-bridge-relay \
  --from-literal=RELAY_ADMIN_TOKEN=<vault-secret> \
  --from-literal=RELAY_ENABLE_DEFAULT_TOKENS=false

# Pod gets env from secret
env:
  - name: RELAY_ADMIN_TOKEN
    valueFrom:
      secretKeyRef:
        name: brain-bridge-relay
        key: RELAY_ADMIN_TOKEN
```

**Or with external secret manager:**
```bash
# Dockerfile (example)
CMD ["sh", "-c", "/vault/wait-for-secret.sh && node dist/server.js"]
```

**Characteristics:**
- ✓ No secrets in docker image
- ✓ No secrets in git
- ✓ No secrets on machine
- ✓ Injected at deploy time only
- ✓ Vault-managed rotation

---

## Device Tokens (Special Case)

Device tokens are **generated at registration time**, returned once to the device, and **never stored as plaintext**.

### How it works:

1. **Client requests registration:**
   ```
   POST /api/register
   {
     "deviceToken": "<plaintext-token-provided-by-caller>",
     "deviceId": "my-device"
   }
   ```

2. **Relay hashes and persists:**
   ```json
   // relay-tokens.json
   {
     "tokenId": "tok_...",
     "tokenHash": "<sha256(plaintext-token)>",
     "deviceId": "my-device",
     "active": true
   }
   ```

3. **Future device connections validate:**
   ```
   POST /api/commands/session
   Headers: X-Device-Token: <plaintext-token>
   
   // Relay hashes the header value and compares to stored hash
   ```

### Local development only:

Default test tokens are defined in `packages/bridge/src/storage/token-store.ts` **for development only**:

```typescript
// DEVELOPMENT ONLY — Never used in production
const plaintext = 'dev-token-1';
const hash = hashToken(plaintext);
```

These are:
- ✓ Marked clearly as development-only
- ✓ Initialized only if `RELAY_ENABLE_DEFAULT_TOKENS=true`
- ✓ Disabled in production via env var
- ✓ Never committed to git (token hashes are OK, plaintext is not)

---

## Checklist for Local Deployment

- [ ] Created `~/.config/brain-bridge/.env.relay`
- [ ] Generated admin token with `openssl rand -hex 32`
- [ ] Set `RELAY_ENABLE_DEFAULT_TOKENS=false` for production-like test
- [ ] Added `.env.relay` to `.gitignore` (already done)
- [ ] docker-compose references external env file
- [ ] Tested: `docker compose up -d && curl http://localhost:3053/ready`
- [ ] Tested: Admin endpoint rejects request without token
- [ ] Tested: Admin endpoint accepts request with valid token

---

## References

- **Credentials index:** `~/Repos/stevewesthoek/brain/operations/accounts/credentials-index.md`
- **Deployment docs:** `brain-bridge/DEPLOYMENT.md`
- **Config code:** `packages/bridge/src/config.ts`
- **Startup validation:** `packages/bridge/src/startup.ts`
- **Token storage:** `packages/bridge/src/storage/token-store.ts`
