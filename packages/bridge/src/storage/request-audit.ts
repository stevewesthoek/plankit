import fs from 'fs'
import path from 'path'
import os from 'os'
import type { RequestRecord } from './types'

const REQUESTS_FILE = path.join(os.homedir(), '.brainbridge', 'relay-requests.json')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

let requestLog: RequestRecord[] = []

function ensureDir(): void {
  const dir = path.dirname(REQUESTS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function loadFromDisk(): RequestRecord[] {
  ensureDir()
  if (!fs.existsSync(REQUESTS_FILE)) {
    return []
  }
  try {
    const content = fs.readFileSync(REQUESTS_FILE, 'utf-8')
    const data = JSON.parse(content)
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error(`Failed to load request log: ${err}`)
    return []
  }
}

function saveToDisk(): void {
  ensureDir()
  try {
    const content = JSON.stringify(requestLog, null, 2)
    fs.writeFileSync(REQUESTS_FILE, content)

    // Check size and rotate if needed
    const stats = fs.statSync(REQUESTS_FILE)
    if (stats.size > MAX_FILE_SIZE) {
      rotateLog()
    }
  } catch (err) {
    console.error(`Failed to save request log: ${err}`)
  }
}

function rotateLog(): void {
  ensureDir()
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const archivePath = path.join(
      os.homedir(),
      '.brainbridge',
      `relay-requests-archive-${timestamp}.json`
    )
    fs.copyFileSync(REQUESTS_FILE, archivePath)
    requestLog = []
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify([], null, 2))
    console.log(`[RequestAudit] Rotated log to ${archivePath}`)
  } catch (err) {
    console.error(`Failed to rotate request log: ${err}`)
  }
}

export function loadRequests(): RequestRecord[] {
  requestLog = loadFromDisk()
  return requestLog
}

export function logRequest(record: RequestRecord): void {
  requestLog.push(record)
  saveToDisk()
}

export function getRecentRequests(limit: number = 50): RequestRecord[] {
  const start = Math.max(0, requestLog.length - limit)
  return requestLog.slice(start)
}

export function getAllRequests(): RequestRecord[] {
  return [...requestLog]
}
