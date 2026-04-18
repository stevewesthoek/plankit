#!/usr/bin/env node

const http = require('http')
const net = require('net')

const RELAY_HOST = process.env.RELAY_HOST || '127.0.0.1'
const RELAY_PORT = parseInt(process.env.RELAY_PORT || '3053', 10)
const DEVICE_TOKEN = process.env.DEVICE_TOKEN || 'local-device'

function createWebSocket(url) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(RELAY_PORT, RELAY_HOST)
    let headers = []

    socket.on('connect', () => {
      headers.push(`GET / HTTP/1.1`)
      headers.push(`Host: ${RELAY_HOST}:${RELAY_PORT}`)
      headers.push(`Upgrade: websocket`)
      headers.push(`Connection: Upgrade`)
      headers.push(`Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==`)
      headers.push(`Sec-WebSocket-Version: 13`)
      headers.push(``)
      headers.push(``)
      socket.write(headers.join('\r\n'))
    })

    let upgraded = false
    let buffer = ''

    socket.on('data', (data) => {
      if (!upgraded) {
        buffer += data.toString()
        if (buffer.includes('\r\n\r\n')) {
          upgraded = true
          resolve({ socket, upgraded: true })
        }
      }
    })

    socket.on('error', reject)
    socket.setTimeout(5000, () => {
      socket.destroy()
      reject(new Error('Connection timeout'))
    })
  })
}

async function registerDevice() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ deviceToken: DEVICE_TOKEN })

    const options = {
      hostname: RELAY_HOST,
      port: RELAY_PORT,
      path: '/api/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }

    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (err) {
          reject(err)
        }
      })
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function runTest(testName, testFn) {
  try {
    console.log(`\n▶ ${testName}`)
    await testFn()
    console.log(`✓ ${testName}`)
    return true
  } catch (err) {
    console.error(`✗ ${testName}: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('=== Milestone 2A Relay Test Suite ===\n')
  console.log(`Relay: ${RELAY_URL}`)
  console.log(`Device token: ${DEVICE_TOKEN}\n`)

  let passed = 0
  let failed = 0

  // Test 1: Device registration
  if (await runTest('Device registration', async () => {
    const result = await registerDevice()
    if (result.status !== 'ok') throw new Error(result.error || 'Registration failed')
  })) passed++
  else failed++

  // Test 2: WebSocket connection and auth
  if (await runTest('WebSocket connection and auth', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(RELAY_URL)
      let authenticated = false

      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('Connection timeout'))
      }, 5000)

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          deviceToken: DEVICE_TOKEN
        }))
      })

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data)
          if (msg.type === 'auth_response') {
            if (msg.status === 'ok') {
              authenticated = true
              clearTimeout(timeout)
              ws.close()
              resolve()
            } else {
              reject(new Error(msg.error || 'Auth failed'))
            }
          }
        } catch (err) {
          reject(err)
        }
      })

      ws.on('error', reject)
    })
  })) passed++
  else failed++

  // Test 3: Command routing - workspaces
  if (await runTest('Command routing - workspaces', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(RELAY_URL)
      let messageId = null

      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('Command timeout'))
      }, 5000)

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          deviceToken: DEVICE_TOKEN
        }))
      })

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data)

          if (msg.type === 'auth_response' && msg.status === 'ok') {
            messageId = 'msg-1'
            ws.send(JSON.stringify({
              id: messageId,
              type: 'command_request',
              command: 'workspaces',
              params: {}
            }))
          } else if (msg.type === 'command_response' && msg.id === messageId) {
            if (msg.status === 'ok') {
              clearTimeout(timeout)
              ws.close()
              resolve()
            } else {
              reject(new Error(msg.error || 'Command failed'))
            }
          }
        } catch (err) {
          reject(err)
        }
      })

      ws.on('error', reject)
    })
  })) passed++
  else failed++

  // Test 4: Command routing - tree
  if (await runTest('Command routing - tree', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(RELAY_URL)
      let messageId = null

      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('Command timeout'))
      }, 5000)

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          deviceToken: DEVICE_TOKEN
        }))
      })

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data)

          if (msg.type === 'auth_response' && msg.status === 'ok') {
            messageId = 'msg-tree'
            ws.send(JSON.stringify({
              id: messageId,
              type: 'command_request',
              command: 'tree',
              params: { workspace: 'vault', path: '', maxDepth: 2 }
            }))
          } else if (msg.type === 'command_response' && msg.id === messageId) {
            if (msg.status === 'ok') {
              clearTimeout(timeout)
              ws.close()
              resolve()
            } else {
              reject(new Error(msg.error || 'Command failed'))
            }
          }
        } catch (err) {
          reject(err)
        }
      })

      ws.on('error', reject)
    })
  })) passed++
  else failed++

  // Test 5: Auth failure
  if (await runTest('Auth failure with invalid token', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(RELAY_URL)

      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('Connection timeout'))
      }, 5000)

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'auth',
          deviceToken: 'invalid-token'
        }))
      })

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data)
          if (msg.type === 'auth_response' && msg.status === 'error') {
            clearTimeout(timeout)
            ws.close()
            resolve()
          }
        } catch (err) {
          reject(err)
        }
      })

      ws.on('close', () => {
        clearTimeout(timeout)
        resolve()
      })

      ws.on('error', reject)
    })
  })) passed++
  else failed++

  // Summary
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
