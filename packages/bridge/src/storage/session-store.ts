import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { SessionRecord } from './types'
import { getDataPath } from './data-dir'

let SESSIONS_LOG = ''

function initFile(): string {
  if (!SESSIONS_LOG) {
    SESSIONS_LOG = getDataPath('relay-sessions.log')
  }
  return SESSIONS_LOG
}

let sessionMap = new Map<string, SessionRecord>()
const SESSION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const CLOSED_SESSION_RETENTION_MS = 60 * 60 * 1000 // 1 hour

function generateSessionId(): string {
  return `sess_${crypto.randomBytes(12).toString('hex')}`
}

function ensureDir(): void {
  const dir = path.dirname(initFile())
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function createSession(deviceId: string, purpose?: string): SessionRecord {
  const sessionId = generateSessionId()
  const now = new Date().toISOString()

  const session: SessionRecord = {
    sessionId,
    deviceId,
    status: 'open',
    createdAt: now,
    lastActivityAt: now,
    commandCount: 0,
    requestIds: [],
    metadata: { purpose },
    version: 1
  }

  sessionMap.set(sessionId, session)
  logSessionEvent(sessionId, 'created', deviceId)

  return session
}

export function getSession(sessionId: string): SessionRecord | null {
  const session = sessionMap.get(sessionId)
  if (!session) {
    return null
  }

  // Check if session has timed out
  const now = Date.now()
  const lastActivity = new Date(session.lastActivityAt).getTime()
  if (session.status !== 'closed' && now - lastActivity > SESSION_TIMEOUT_MS) {
    session.status = 'closed'
    session.closedAt = new Date().toISOString()
    logSessionEvent(sessionId, 'timed_out', session.deviceId)
  }

  return session
}

export function listSessions(): SessionRecord[] {
  return Array.from(sessionMap.values()).map(s => {
    const now = Date.now()
    const lastActivity = new Date(s.lastActivityAt).getTime()
    if (s.status !== 'closed' && now - lastActivity > SESSION_TIMEOUT_MS) {
      s.status = 'closed'
      s.closedAt = new Date().toISOString()
      logSessionEvent(s.sessionId, 'timed_out', s.deviceId)
    }
    return s
  })
}

export function closeSession(sessionId: string): SessionRecord | null {
  const session = sessionMap.get(sessionId)
  if (!session) {
    return null
  }

  if (session.status !== 'closed') {
    session.status = 'closed'
    session.closedAt = new Date().toISOString()
    logSessionEvent(sessionId, 'closed', session.deviceId)
  }

  return session
}

export function updateSessionActivity(sessionId: string, requestId: string, command: string): void {
  const session = sessionMap.get(sessionId)
  if (!session) {
    return
  }

  const now = new Date().toISOString()
  session.lastActivityAt = now

  if (session.status === 'open') {
    session.status = 'active'
  }

  session.commandCount++
  session.requestIds.push(requestId)

  logSessionEvent(sessionId, 'command', session.deviceId, { command, requestId })
}

export function cleanupExpiredSessions(): number {
  const now = Date.now()
  let cleaned = 0

  const toDelete: string[] = []

  sessionMap.forEach((session, sessionId) => {
    if (session.status === 'closed' && session.closedAt) {
      const closedTime = new Date(session.closedAt).getTime()
      if (now - closedTime > CLOSED_SESSION_RETENTION_MS) {
        toDelete.push(sessionId)
        cleaned++
        logSessionEvent(sessionId, 'purged', session.deviceId)
      }
    }
  })

  toDelete.forEach(sessionId => sessionMap.delete(sessionId))

  return cleaned
}

function logSessionEvent(
  sessionId: string,
  event: string,
  deviceId: string,
  extra?: Record<string, unknown>
): void {
  try {
    ensureDir()
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId,
      event,
      deviceId,
      ...extra
    }
    const line = JSON.stringify(entry) + '\n'
    fs.appendFileSync(initFile(), line)
  } catch (err) {
    console.error('[SessionStore] Failed to write session log:', err)
  }
}
