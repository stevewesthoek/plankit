import { IncomingMessage, ServerResponse } from 'http'
import WebSocket from 'ws'
import * as deviceRegistry from '../storage/device-registry'
import * as requestAudit from '../storage/request-audit'

// Will be set by server.ts
let devices: Map<string, any> = new Map()

export function setDeviceMap(deviceMap: Map<string, any>): void {
  devices = deviceMap
}

export function handleAdminDevices(
  req: IncomingMessage,
  res: ServerResponse
): void {
  res.setHeader('Content-Type', 'application/json')

  const persistedDevices = deviceRegistry.listDevices()
  const activeDevices = Array.from(devices.values())
    .filter(d => d.ws.readyState === WebSocket.OPEN)
    .map(d => d.deviceId)

  const result = {
    devices: persistedDevices.map(d => {
      const isConnected = activeDevices.includes(d.deviceId)
      return {
        deviceId: d.deviceId,
        isConnected,
        status: isConnected ? 'online' : 'offline',
        createdAt: d.createdAt,
        lastSeenAt: d.lastSeenAt,
        connectedAt: d.connectedAt
      }
    })
  }

  res.writeHead(200)
  res.end(JSON.stringify(result, null, 2))
}

export function handleAdminRequests(
  req: IncomingMessage,
  res: ServerResponse
): void {
  res.setHeader('Content-Type', 'application/json')

  const url = new URL(req.url || '', 'http://localhost')
  const limitParam = url.searchParams.get('limit')
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50

  const requests = requestAudit.getRecentRequests(limit)

  const result = {
    total: requests.length,
    requests: requests.map(r => ({
      requestId: r.requestId,
      deviceId: r.deviceId,
      command: r.command,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      duration: r.duration,
      error: r.error || undefined
    }))
  }

  res.writeHead(200)
  res.end(JSON.stringify(result, null, 2))
}
