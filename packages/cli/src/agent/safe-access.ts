import fs from 'fs'
import path from 'path'
import { getEnabledSources } from './config'

const BLOCKED_WRITE_PATTERNS = [
  /\.env(\..*)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /(^|\/)\.git(\/|$)/i,
  /(^|\/)node_modules(\/|$)/i,
  /(^|\/)\.next(\/|$)/i,
  /(^|\/)dist(\/|$)/i,
  /(^|\/)build(\/|$)/i,
  /(^|\/)coverage(\/|$)/i,
  /(^|\/)package-lock\.json$/i,
  /(^|\/)pnpm-lock\.yaml$/i,
  /(^|\/)yarn\.lock$/i,
  /(^|\/)bun\.lockb$/i,
  /(^|\/)id_rsa$/i,
  /(^|\/)id_ed25519$/i
]

const DEFAULT_WRITE_ROOTS = ['docs/plans', 'docs/prompts', 'docs/notes', '.buildflow/inbox']

export function isSafeRelativePath(relativePath: string): boolean {
  if (!relativePath || relativePath.includes('..') || relativePath.startsWith('/')) return false
  const parts = relativePath.split('/')
  if (parts.some(part => part.startsWith('.'))) return false
  return true
}

export function getSourceRoot(sourceId?: string): { id: string; path: string } {
  const sources = getEnabledSources()
  if (sources.length === 0) throw new Error('No enabled knowledge sources configured')
  if (sourceId) {
    const source = sources.find(s => s.id === sourceId)
    if (!source) throw new Error(`Source not found: ${sourceId}`)
    return { id: source.id, path: source.path }
  }
  return { id: sources[0].id, path: sources[0].path }
}

export function resolveWithinSource(relativePath: string, sourceId?: string): { sourceId: string; fullPath: string } {
  if (!isSafeRelativePath(relativePath)) throw new Error('Access denied. Invalid relative path.')
  const source = getSourceRoot(sourceId)
  const fullPath = path.resolve(path.join(source.path, path.normalize(relativePath)))
  const root = path.resolve(source.path)
  if (!fullPath.startsWith(root)) throw new Error('Access denied. Path outside source.')
  return { sourceId: source.id, fullPath }
}

export function isBlockedWritePath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/')
  if (!isSafeRelativePath(normalized)) return true
  return BLOCKED_WRITE_PATTERNS.some(pattern => pattern.test(normalized))
}

export function isAllowedWriteRoot(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/')
  return DEFAULT_WRITE_ROOTS.some(root => normalized === root || normalized.startsWith(`${root}/`))
}

export function truncateContent(content: string, maxBytes: number): { content: string; truncated: boolean } {
  const buf = Buffer.from(content, 'utf8')
  if (buf.length <= maxBytes) return { content, truncated: false }
  return { content: buf.subarray(0, maxBytes).toString('utf8'), truncated: true }
}

export function redactSecrets(content: string): string {
  return content
    .replace(/(AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|API_KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*.+/gi, '$1=[REDACTED]')
    .replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]')
}

