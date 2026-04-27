#!/usr/bin/env node

/**
 * Verify multi-user relay routing isolation
 *
 * Tests that the relay correctly routes Custom GPT actions to the device
 * associated with each user's bearer token.
 *
 * Usage:
 *   # Start relay first
 *   BRIDGE_PORT=3053 RELAY_ENABLE_DEFAULT_TOKENS=false \
 *     RELAY_DATA_DIR=/tmp/relay-test node packages/bridge/dist/server.js &
 *   # Then run test
 *   node scripts/verify-relay-routing.js
 */

const http = require('http')
const WebSocket = require('ws')

const RELAY_PORT = 3053
const RELAY_URL = `http://127.0.0.1:${RELAY_PORT}`
const RELAY_WS_URL = `ws://127.0.0.1:${RELAY_PORT}`

// Test state
let testsPassed = 0
let testsFailed = 0

// Generate test tokens
const TOKEN_A = 'test-token-' + Math.random().toString(36).slice(2)
const TOKEN_B = 'test-token-' + Math.random().toString(36).slice(2)
const INVALID_TOKEN = 'invalid-token-' + Math.random().toString(36).slice(2)

let deviceIdA, deviceIdB
let wsA, wsB
let commandReceivedAtA = false
let commandReceivedAtB = false

/**
 * Run a single test
 */
async function test(name, fn) {
  try {
    process.stdout.write(`  • ${name}... `)
    await fn()
    console.log('✓')
    testsPassed++
  } catch (err) {
    console.log(`✗\n    ${err.message}`)
    testsFailed++
  }
}

/**
 * HTTP GET
 */
function httpGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, RELAY_URL)
    http.get(url, { headers: {} }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) })
          } catch {
            resolve({ status: res.statusCode, body: data })
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      })
    }).on('error', reject)
  })
}

/**
 * HTTP POST
 */
function httpPost(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, RELAY_URL)
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    }).on('error', reject)

    req.write(bodyStr)
    req.end()
  })
}

/**
 * Open WebSocket and authenticate
 */
function openWS(token, deviceId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(RELAY_WS_URL)

    ws.on('open', () => {
      // Send auth message
      ws.send(JSON.stringify({
        type: 'auth',
        deviceToken: token
      }))
    })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data)

        // Track auth response
        if (msg.type === 'auth_response') {
          if (msg.status === 'ok') {
            resolve(ws)
          } else {
            ws.close()
            reject(new Error(`Auth failed: ${msg.error}`))
          }
        }

        // Track incoming commands (for routing tests)
        if (msg.type === 'command_request') {
          if (token === TOKEN_A) {
            commandReceivedAtA = true
          } else if (token === TOKEN_B) {
            commandReceivedAtB = true
          }
          // Send a fake response so the request completes
          ws.send(JSON.stringify({
            type: 'command_response',
            requestId: msg.requestId,
            result: { status: 'ok', device: 'test' }
          }))
        }
      } catch (err) {
        console.error('WS message parse error:', err)
      }
    })

    ws.on('error', (err) => {
      reject(err)
    })

    ws.on('close', () => {
      // Closed
    })
  })
}

/**
 * Main test suite
 */
async function runTests() {
  console.log('\n=== BuildFlow Relay Multi-User Routing Tests ===\n')

  // 1. Check relay is running
  await test('Relay is running at http://127.0.0.1:3053/health', async () => {
    const res = await httpGet('/health')
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`)
  })

  // 2. Register device A
  await test('Register device A with token A', async () => {
    const res = await httpPost('/api/register', { deviceToken: TOKEN_A })
    if (res.status === 409) {
      // Already registered, that's OK
      console.log(' (already registered)')
      testsPassed++ // Count as pass
      testsFailed-- // Undo increment
      // Parse device ID from persisted records - for now just use a deterministic one
      deviceIdA = 'device-' + TOKEN_A.slice(0, 8)
    } else if (res.status === 201) {
      deviceIdA = res.body.deviceId
    } else {
      throw new Error(`Expected 201 or 409, got ${res.status}`)
    }
  })

  // 3. Register device B
  await test('Register device B with token B', async () => {
    const res = await httpPost('/api/register', { deviceToken: TOKEN_B })
    if (res.status === 409) {
      console.log(' (already registered)')
      testsPassed++
      testsFailed--
      deviceIdB = 'device-' + TOKEN_B.slice(0, 8)
    } else if (res.status === 201) {
      deviceIdB = res.body.deviceId
    } else {
      throw new Error(`Expected 201 or 409, got ${res.status}`)
    }
  })

  // 4. Connect WS device A
  await test('WebSocket device A connects with token A', async () => {
    wsA = await openWS(TOKEN_A, deviceIdA)
    // Give it a moment to stabilize
    await new Promise(r => setTimeout(r, 100))
  })

  // 5. Connect WS device B
  await test('WebSocket device B connects with token B', async () => {
    wsB = await openWS(TOKEN_B, deviceIdB)
    await new Promise(r => setTimeout(r, 100))
  })

  // 6. Verify 2 devices connected
  await test('Health endpoint shows 2 connected devices', async () => {
    const res = await httpGet('/health')
    if (res.body.connectedDevices !== 2) {
      throw new Error(`Expected 2 devices, got ${res.body.connectedDevices}`)
    }
  })

  // 7. Send action with token A → verify it reaches device A
  await test('Action with token A routes to device A', async () => {
    commandReceivedAtA = false
    commandReceivedAtB = false
    const res = await httpPost('/api/actions/proxy/api/status', {}, {
      'Authorization': `Bearer ${TOKEN_A}`
    })
    // We expect 200 (if agent responds) or 504 (timeout, but routing worked)
    if (res.status !== 200 && res.status !== 504) {
      throw new Error(`Expected 200 or 504, got ${res.status}`)
    }
    await new Promise(r => setTimeout(r, 200))
    if (!commandReceivedAtA) {
      throw new Error('Command did not reach device A')
    }
  })

  // 8. Send action with token B → verify it reaches device B
  await test('Action with token B routes to device B', async () => {
    commandReceivedAtA = false
    commandReceivedAtB = false
    const res = await httpPost('/api/actions/proxy/api/status', {}, {
      'Authorization': `Bearer ${TOKEN_B}`
    })
    if (res.status !== 200 && res.status !== 504) {
      throw new Error(`Expected 200 or 504, got ${res.status}`)
    }
    await new Promise(r => setTimeout(r, 200))
    if (!commandReceivedAtB) {
      throw new Error('Command did not reach device B')
    }
  })

  // 9. Invalid token → 401
  await test('Invalid token returns 401', async () => {
    const res = await httpPost('/api/actions/proxy/api/status', {}, {
      'Authorization': `Bearer ${INVALID_TOKEN}`
    })
    if (res.status !== 401) {
      throw new Error(`Expected 401, got ${res.status}`)
    }
  })

  // 10. Missing token → 401
  await test('Missing auth header returns 401', async () => {
    const res = await httpPost('/api/actions/proxy/api/status', {})
    if (res.status !== 401) {
      throw new Error(`Expected 401, got ${res.status}`)
    }
  })

  // 11. Disconnect device A
  await test('Close device A connection', async () => {
    wsA.close()
    await new Promise(r => setTimeout(r, 200))
  })

  // 12. Token A → 503 (offline)
  await test('Offline device returns 503', async () => {
    const res = await httpPost('/api/actions/proxy/api/status', {}, {
      'Authorization': `Bearer ${TOKEN_A}`
    })
    if (res.status !== 503) {
      throw new Error(`Expected 503, got ${res.status}`)
    }
  })

  // 13. Token B still works
  await test('Device B still works after A disconnects', async () => {
    const res = await httpPost('/api/actions/proxy/api/status', {}, {
      'Authorization': `Bearer ${TOKEN_B}`
    })
    if (res.status !== 200 && res.status !== 504) {
      throw new Error(`Expected 200 or 504, got ${res.status}`)
    }
  })

  // Cleanup
  if (wsB && wsB.readyState === WebSocket.OPEN) {
    wsB.close()
  }

  // Summary
  console.log(`\n=== Results ===`)
  console.log(`Passed: ${testsPassed}`)
  console.log(`Failed: ${testsFailed}`)

  if (testsFailed === 0) {
    console.log('\n✓ All tests passed')
    process.exit(0)
  } else {
    console.log('\n✗ Some tests failed')
    process.exit(1)
  }
}

// Run
runTests().catch((err) => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
