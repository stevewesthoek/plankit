import http from 'http'
import WebSocket from 'ws'
import { logToFile } from './logger'
import * as deviceRegistry from './storage/device-registry'
import * as tokenStore from './storage/token-store'
import * as requestAudit from './storage/request-audit'
import { handleAdminDevices, handleAdminRequests, setDeviceMap } from './admin/endpoints'
import type { PersistedDevice } from './storage/types'

const PORT = parseInt(process.env.BRIDGE_PORT || '3053', 10)
const HEARTBEAT_INTERVAL = 30000

interface DeviceConnection {
  ws: WebSocket
  deviceId: string
  status: 'online' | 'offline'
  lastSeen: Date
  lastHeartbeat: Date
}

interface PendingRequest {
  resolve: (value: any) => void
  reject: (reason?: any) => void
  timeout: NodeJS.Timeout
}

// Device registry (in-memory during operation, persisted to disk)
const devices = new Map<string, DeviceConnection>()
const pendingRequests = new Map<string, PendingRequest>()
let requestIdCounter = 0

// Helper to generate request ID
function generateRequestId(): string {
  return `req-${++requestIdCounter}-${Date.now()}`
}

// HTTP server
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // Admin: list devices (persisted + connected status)
  if (req.method === 'GET' && req.url === '/api/admin/devices') {
    handleAdminDevices(req, res)
    return
  }

  // Admin: list request audit records
  if (req.method === 'GET' && req.url?.startsWith('/api/admin/requests')) {
    handleAdminRequests(req, res)
    return
  }

  // Health endpoint
  if (req.method === 'GET' && req.url === '/health') {
    const connectedDevices = Array.from(devices.values()).filter(d => d.ws.readyState === WebSocket.OPEN)

    const status = {
      status: 'ok',
      bridgeRunning: true,
      port: PORT,
      connectedDevices: connectedDevices.length,
      devices: Array.from(connectedDevices).map(d => ({
        id: d.deviceId,
        status: d.status,
        lastSeen: d.lastSeen.toISOString(),
        lastHeartbeat: d.lastHeartbeat.toISOString()
      }))
    }

    res.writeHead(200)
    res.end(JSON.stringify(status, null, 2))
    return
  }

  // Device registration endpoint: register new device with new token
  if (req.method === 'POST' && req.url === '/api/register') {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body)
        const { deviceToken, deviceId: requestedDeviceId } = payload

        if (!deviceToken) {
          res.writeHead(400)
          res.end(JSON.stringify({ error: 'Missing deviceToken' }))
          return
        }

        // Check if token already exists
        const existingDeviceId = tokenStore.validateToken(deviceToken)
        if (existingDeviceId) {
          res.writeHead(409)
          res.end(JSON.stringify({ error: 'Token already registered', deviceId: existingDeviceId }))
          logToFile({
            timestamp: new Date().toISOString(),
            tool: 'relay_register',
            status: 'error',
            reason: 'token_already_exists'
          })
          return
        }

        // Generate or use requested deviceId
        const deviceId = requestedDeviceId || `device-${Date.now()}`

        // Check if deviceId already exists
        if (deviceRegistry.findDevice(deviceId)) {
          res.writeHead(409)
          res.end(JSON.stringify({ error: 'Device ID already exists', deviceId }))
          logToFile({
            timestamp: new Date().toISOString(),
            tool: 'relay_register',
            status: 'error',
            reason: 'device_id_exists'
          })
          return
        }

        // Register new token
        tokenStore.registerNewToken(deviceToken, deviceId)

        // Create persisted device record (not connected yet)
        const now = new Date().toISOString()
        const crypto = await import('crypto')
        const tokenHash = crypto.createHash('sha256').update(deviceToken).digest('hex')

        const persistedDevice: PersistedDevice = {
          deviceId,
          tokenHash,
          createdAt: now,
          lastSeenAt: now,
          version: 1
        }
        deviceRegistry.saveDevice(persistedDevice)

        res.writeHead(201)
        res.end(JSON.stringify({
          status: 'ok',
          deviceId,
          message: 'Device registered. Use the connection info below. Client will append /api/bridge/ws to wsUrl.',
          connectionInfo: {
            wsUrl: `ws://127.0.0.1:${PORT}`,
            token: deviceToken,
            deviceId,
            usage: 'Connect with: BRIDGE_URL=<wsUrl> DEVICE_TOKEN=<token> node packages/cli/dist/index.js serve'
          }
        }))

        logToFile({
          timestamp: new Date().toISOString(),
          tool: 'relay_register',
          status: 'success',
          deviceId
        })
      } catch (err) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: `Invalid request: ${String(err)}` }))
      }
    })
    return
  }

  // Command endpoint: external requester sends command targeting a device
  if (req.method === 'POST' && req.url === '/api/commands') {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        const { deviceId, command, params } = payload

        if (!deviceId || !command) {
          res.writeHead(400)
          res.end(JSON.stringify({ error: 'Missing deviceId or command' }))
          return
        }

        const device = devices.get(deviceId)
        if (!device) {
          res.writeHead(404)
          res.end(JSON.stringify({ error: 'Device not found' }))
          logToFile({
            timestamp: new Date().toISOString(),
            tool: 'relay_command',
            status: 'error',
            deviceId,
            command,
            reason: 'device_not_found'
          })
          return
        }

        if (device.ws.readyState !== WebSocket.OPEN) {
          res.writeHead(503)
          res.end(JSON.stringify({ error: 'Device not connected' }))
          logToFile({
            timestamp: new Date().toISOString(),
            tool: 'relay_command',
            status: 'error',
            deviceId,
            command,
            reason: 'device_offline'
          })
          return
        }

        // Generate request ID for correlation
        const requestId = generateRequestId()
        const startTime = Date.now()
        let timedOut = false

        // Log request start
        requestAudit.logRequest({
          requestId,
          deviceId,
          command,
          status: 'pending',
          createdAt: new Date().toISOString(),
          version: 1
        })

        // Create pending request with timeout
        const timeout = setTimeout(() => {
          timedOut = true
          pendingRequests.delete(requestId)
          const duration = Date.now() - startTime
          res.writeHead(504)
          res.end(JSON.stringify({ error: 'Command timeout' }))

          // Log timeout
          requestAudit.logRequest({
            requestId,
            deviceId,
            command,
            status: 'timeout',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            duration,
            version: 1
          })

          logToFile({
            timestamp: new Date().toISOString(),
            tool: 'relay_command',
            status: 'error',
            deviceId,
            command,
            reason: 'timeout'
          })
        }, 30000)

        // Register pending request
        pendingRequests.set(requestId, {
          resolve: (result: any) => {
            if (timedOut) return
            clearTimeout(timeout)
            pendingRequests.delete(requestId)
            const duration = Date.now() - startTime
            res.writeHead(200)
            res.end(JSON.stringify({ status: 'ok', result }))

            // Log success
            requestAudit.logRequest({
              requestId,
              deviceId,
              command,
              status: 'success',
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              duration,
              version: 1
            })

            logToFile({
              timestamp: new Date().toISOString(),
              tool: 'relay_command',
              status: 'success',
              deviceId,
              command,
              requestId
            })
          },
          reject: (error: any) => {
            if (timedOut) return
            clearTimeout(timeout)
            pendingRequests.delete(requestId)
            const duration = Date.now() - startTime
            res.writeHead(500)
            res.end(JSON.stringify({ error: String(error) }))

            // Log error
            requestAudit.logRequest({
              requestId,
              deviceId,
              command,
              status: 'error',
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              duration,
              error: String(error),
              version: 1
            })

            logToFile({
              timestamp: new Date().toISOString(),
              tool: 'relay_command',
              status: 'error',
              deviceId,
              command,
              reason: String(error),
              requestId
            })
          },
          timeout
        })

        // Send command to device over WebSocket
        device.ws.send(JSON.stringify({
          type: 'command_request',
          requestId,
          command,
          params: params || {}
        }))

        console.log(`[Bridge] Forwarded ${command} to device ${deviceId} (request ${requestId})`)
      } catch (err) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not found' }))
})

// WebSocket server: devices connect here
const wss = new WebSocket.Server({ server })

wss.on('connection', (ws: WebSocket) => {
  let deviceId: string | null = null

  ws.on('message', async (data: string) => {
    try {
      const message = JSON.parse(data)

      // Device authentication
      if (message.type === 'auth') {
        const token = message.deviceToken
        const validatedDeviceId = tokenStore.validateToken(token)
        if (!validatedDeviceId) {
          ws.send(JSON.stringify({
            type: 'auth_response',
            status: 'error',
            error: 'Invalid device token'
          }))
          ws.close()
          return
        }

        deviceId = validatedDeviceId
        const now = new Date()

        // Check if device already exists (reconnection)
        const existingDevice = devices.get(deviceId)
        if (existingDevice) {
          // Close old WebSocket gracefully
          console.log(`[Bridge] Device ${deviceId} reconnecting, replacing stale connection`)
          existingDevice.ws.close()
          devices.delete(deviceId)
        }

        // Store new connection
        devices.set(deviceId, {
          ws,
          deviceId,
          status: 'online',
          lastSeen: now,
          lastHeartbeat: now
        })

        // Persist device record (update lastSeenAt and connectedAt)
        const existingRecord = deviceRegistry.findDevice(deviceId)
        if (!existingRecord) {
          // New device (shouldn't happen if registered via /api/register, but handle it)
          const crypto = await import('crypto')
          const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
          const persistedDevice: PersistedDevice = {
            deviceId,
            tokenHash,
            createdAt: now.toISOString(),
            lastSeenAt: now.toISOString(),
            connectedAt: now.toISOString(),
            version: 1
          }
          deviceRegistry.saveDevice(persistedDevice)
        } else {
          // Existing device, update lastSeenAt
          deviceRegistry.updateLastSeen(deviceId)
        }

        ws.send(JSON.stringify({
          type: 'auth_response',
          status: 'ok',
          deviceId
        }))

        console.log(`[Bridge] Device authenticated: ${deviceId}`)
        logToFile({
          timestamp: new Date().toISOString(),
          tool: 'relay_auth',
          status: 'success',
          deviceId
        })
        return
      }

      // Device heartbeat response (pong)
      if (message.type === 'pong') {
        if (deviceId) {
          const device = devices.get(deviceId)
          if (device) {
            device.lastHeartbeat = new Date()
            // Update lastSeenAt metadata
            deviceRegistry.updateLastSeen(deviceId)
          }
        }
        return
      }

      // Device command response: device sends result back to relay
      // This is the return path: device completed a command, sending response
      if (message.type === 'command_response') {
        const { requestId, error, result } = message

        const pending = pendingRequests.get(requestId)
        if (pending) {
          clearTimeout(pending.timeout)
          if (error) {
            pending.reject(new Error(error))
          } else {
            pending.resolve(result)
          }
          pendingRequests.delete(requestId)

          console.log(`[Bridge] Device ${deviceId} responded to request ${requestId}`)
        } else {
          console.warn(`[Bridge] Received response for unknown request ${requestId}`)
        }
        return
      }

      // Update last seen on any message
      if (deviceId) {
        const device = devices.get(deviceId)
        if (device) {
          device.lastSeen = new Date()
        }
      }
    } catch (err) {
      console.error('[Bridge] Parse error:', err)
    }
  })

  ws.on('close', () => {
    if (deviceId) {
      devices.delete(deviceId)
      // Update lastSeenAt but do not persist status (runtime only)
      deviceRegistry.updateLastSeen(deviceId)
      console.log(`[Bridge] Device disconnected: ${deviceId}`)
      logToFile({
        timestamp: new Date().toISOString(),
        tool: 'relay_disconnect',
        status: 'success',
        deviceId
      })
    }
  })

  ws.on('error', (err) => {
    console.error('[Bridge] WebSocket error:', err)
  })
})

// Heartbeat interval: send ping to all connected devices
setInterval(() => {
  const now = new Date()
  devices.forEach((device, deviceId) => {
    if (device.ws.readyState === WebSocket.OPEN) {
      device.ws.send(JSON.stringify({ type: 'ping' }))

      // Detect stale connections (no pong within timeout window)
      const timeSinceHeartbeat = now.getTime() - device.lastHeartbeat.getTime()
      if (timeSinceHeartbeat > 60000) {
        // Device is unresponsive, close it (will trigger ws.on('close'))
        device.ws.close()
      }
    }
  })
}, HEARTBEAT_INTERVAL)

// Load persisted state on startup
console.log('[Bridge] Loading persisted state...')
deviceRegistry.loadDevices()
tokenStore.loadTokens()
requestAudit.loadRequests()
setDeviceMap(devices)
console.log('[Bridge] Persisted state loaded')

// Start server
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Bridge] Relay running on http://127.0.0.1:${PORT}`)
  console.log(`[Bridge] WebSocket: ws://127.0.0.1:${PORT}`)
  console.log(`[Bridge] Health: GET http://127.0.0.1:${PORT}/health`)
  console.log(`[Bridge] Register: POST http://127.0.0.1:${PORT}/api/register`)
  console.log(`[Bridge] Commands: POST http://127.0.0.1:${PORT}/api/commands`)
  console.log(`[Bridge] Admin: GET http://127.0.0.1:${PORT}/api/admin/devices`)
  console.log(`[Bridge] Admin: GET http://127.0.0.1:${PORT}/api/admin/requests`)
})

export { devices }
