#!/usr/bin/env node

const http = require('http')

const RELAY_HOST = process.env.RELAY_HOST || '127.0.0.1'
const RELAY_PORT = parseInt(process.env.RELAY_PORT || '3053', 10)
const RELAY_URL = `http://${RELAY_HOST}:${RELAY_PORT}`
const DEVICE_TOKEN = process.env.DEVICE_TOKEN || 'local-device'

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(RELAY_URL + path)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {}
    }

    if (body) {
      const bodyStr = JSON.stringify(body)
      options.headers['Content-Type'] = 'application/json'
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr)
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode, data: parsed })
        } catch (err) {
          reject(err)
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

async function runTest(name, fn) {
  try {
    console.log(`\n▶ ${name}`)
    await fn()
    console.log(`✓ ${name}`)
    return true
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('=== Milestone 2A Relay Integration Tests ===\n')
  console.log(`Target: ${RELAY_URL}`)
  console.log(`Device token: ${DEVICE_TOKEN}\n`)

  let passed = 0
  let failed = 0

  // Test 1: Health
  if (await runTest('Relay health endpoint', async () => {
    const res = await makeRequest('/health')
    if (res.status !== 200) throw new Error(`Status ${res.status}`)
    if (!res.data.status || res.data.status !== 'ok') throw new Error('Health not ok')
  })) passed++
  else failed++

  // Test 2: Device registration success
  if (await runTest('Device registration with valid token', async () => {
    const res = await makeRequest('/api/register', 'POST', { deviceToken: DEVICE_TOKEN })
    if (res.status !== 200) throw new Error(`Status ${res.status}`)
    if (!res.data.status || res.data.status !== 'ok') throw new Error('Registration failed')
    if (!res.data.wsUrl) throw new Error('No wsUrl returned')
  })) passed++
  else failed++

  // Test 3: Device registration failure with invalid token
  if (await runTest('Device registration with invalid token', async () => {
    const res = await makeRequest('/api/register', 'POST', { deviceToken: 'invalid-xyz' })
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`)
  })) passed++
  else failed++

  // Test 4: 404 on unknown endpoint
  if (await runTest('Unknown endpoint returns 404', async () => {
    const res = await makeRequest('/unknown')
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`)
  })) passed++
  else failed++

  console.log(`\n=== Results ===`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total:  ${passed + failed}`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
