import fs from 'fs'
import path from 'path'
import type { RequestRecord } from './types'
import { getDataPath } from './data-dir'

let REQUESTS_FILE = ''

function initFile(): string {
  if (!REQUESTS_FILE) {
    REQUESTS_FILE = getDataPath('relay-requests.json')
  }
  return REQUESTS_FILE
}
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

let requestLog: RequestRecord[] = []

function ensureDir(): void {
  const dir = path.dirname(initFile())
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function loadFromDisk(): RequestRecord[] {
  ensureDir()
  if (!fs.existsSync(initFile())) {
    return []
  }
  try {
    const content = fs.readFileSync(initFile(), 'utf-8')
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
    fs.writeFileSync(initFile(), content)

    // Check size and rotate if needed
    const stats = fs.statSync(initFile())
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
      path.dirname(initFile()),
      `relay-requests-archive-${timestamp}.json`
    )
    fs.copyFileSync(initFile(), archivePath)
    requestLog = []
    fs.writeFileSync(initFile(), JSON.stringify([], null, 2))
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
