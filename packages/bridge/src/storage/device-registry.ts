import fs from 'fs'
import path from 'path'
import type { PersistedDevice } from './types'
import { getDataPath } from './data-dir'

let DEVICES_FILE = ''

function initFile(): string {
  if (!DEVICES_FILE) {
    DEVICES_FILE = getDataPath('relay-devices.json')
  }
  return DEVICES_FILE
}

let deviceRegistry: PersistedDevice[] = []

function ensureDir(): void {
  const dir = path.dirname(initFile())
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function loadFromDisk(): PersistedDevice[] {
  ensureDir()
  const file = initFile()
  if (!fs.existsSync(file)) {
    return []
  }
  try {
    const content = fs.readFileSync(file, 'utf-8')
    const data = JSON.parse(content)
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error(`Failed to load devices: ${err}`)
    return []
  }
}

function saveToDisk(): void {
  ensureDir()
  try {
    fs.writeFileSync(initFile(), JSON.stringify(deviceRegistry, null, 2))
  } catch (err) {
    console.error(`Failed to save devices: ${err}`)
  }
}

export function loadDevices(): PersistedDevice[] {
  deviceRegistry = loadFromDisk()
  return deviceRegistry
}

export function saveDevice(device: PersistedDevice): void {
  const existing = deviceRegistry.findIndex(d => d.deviceId === device.deviceId)
  if (existing >= 0) {
    deviceRegistry[existing] = device
  } else {
    deviceRegistry.push(device)
  }
  saveToDisk()
}

export function findDevice(deviceId: string): PersistedDevice | null {
  return deviceRegistry.find(d => d.deviceId === deviceId) || null
}

export function updateLastSeen(deviceId: string): void {
  const device = deviceRegistry.find(d => d.deviceId === deviceId)
  if (device) {
    device.lastSeenAt = new Date().toISOString()
    if (!device.connectedAt) {
      device.connectedAt = device.lastSeenAt
    }
    saveToDisk()
  }
}

export function listDevices(): PersistedDevice[] {
  return [...deviceRegistry]
}

export function deleteDevice(deviceId: string): void {
  const index = deviceRegistry.findIndex(d => d.deviceId === deviceId)
  if (index >= 0) {
    deviceRegistry.splice(index, 1)
    saveToDisk()
  }
}
