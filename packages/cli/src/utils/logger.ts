import fs from 'fs'
import path from 'path'
import { getAuditLogPath } from './paths'

export interface LogEntry {
  timestamp: string
  tool: string
  path?: string
  status: 'success' | 'error' | 'skip'
  error?: string
  [key: string]: unknown
}

export function logToFile(entry: LogEntry): void {
  try {
    const auditPath = getAuditLogPath()
    const dir = path.dirname(auditPath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const line = JSON.stringify(entry) + '\n'
    fs.appendFileSync(auditPath, line)
  } catch (err) {
    console.error('Failed to write audit log:', err)
  }
}

export function log(message: string): void {
  console.log(`[Brain Bridge] ${message}`)
}

export function error(message: string): void {
  console.error(`[Brain Bridge] Error: ${message}`)
}

export function debug(message: string): void {
  if (process.env.DEBUG) {
    console.log(`[Brain Bridge Debug] ${message}`)
  }
}
