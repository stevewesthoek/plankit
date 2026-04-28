import fs from 'fs'
import path from 'path'
import { getActiveSourceContext, getEnabledSources } from './config'

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

const SAFE_ROOT_WRITE_FILES = new Set([
  'README.md',
  'DESIGN.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'ROADMAP.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md'
])

// Root docs are allowlisted because they are high-impact project files; arbitrary root files stay blocked.
const ARTIFACT_WRITE_ROOTS = ['docs/product', '.buildflow']
const SAFE_WRITE_ROOTS = ['docs/product', 'docs/plans', 'docs/prompts', 'docs/notes', '.buildflow']
const BLOCKED_DIRECTORY_NAMES = new Set(['node_modules', '.next', 'dist', 'build', 'coverage'])
const ALLOWED_DOTFILES = new Set(['.github', '.env.example', '.gitignore', '.buildflow', '.nvmrc', '.prettierrc', '.eslintrc'])

export function isSafeRelativePath(relativePath: string): boolean {
  if (!relativePath || relativePath.includes('..') || relativePath.startsWith('/')) return false
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

export function resolveTargetSourceId(sourceId?: string): string {
  const active = getActiveSourceContext()
  const enabled = getEnabledSources()
  if (sourceId) {
    const source = enabled.find(s => s.id === sourceId)
    if (!source) throw new Error(`Source not found: ${sourceId}`)
    return source.id
  }

  const activeIds = active.mode === 'all' ? enabled.map(s => s.id) : active.activeSourceIds
  if (activeIds.length === 1) return activeIds[0]
  throw new Error('Target sourceId required when multiple sources are active.')
}

export function getResolvedActiveSources(sourceIds?: string[]): Array<{ id: string; path: string }> {
  if (sourceIds && sourceIds.length > 0) {
    const enabled = getEnabledSources()
    const wanted = new Set(sourceIds)
    const resolved = enabled.filter(source => wanted.has(source.id)).map(source => ({ id: source.id, path: source.path }))
    if (resolved.length === 0) throw new Error('No matching active sources found')
    return resolved
  }

  const active = getActiveSourceContext()
  if (active.mode === 'all') {
    return getEnabledSources().map(source => ({ id: source.id, path: source.path }))
  }
  return active.activeSourceIds.map(id => {
    const source = getEnabledSources().find(s => s.id === id)
    if (!source) throw new Error(`Active source not found: ${id}`)
    return { id: source.id, path: source.path }
  })
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

export function isAllowedArtifactRoot(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/')
  if (!normalized.includes('/') && SAFE_ROOT_WRITE_FILES.has(normalized)) return true
  return ARTIFACT_WRITE_ROOTS.some(root => normalized === root || normalized.startsWith(`${root}/`))
}

export function isAllowedSafeWriteRoot(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/')
  if (!normalized.includes('/') && SAFE_ROOT_WRITE_FILES.has(normalized)) return true
  return SAFE_WRITE_ROOTS.some(root => normalized === root || normalized.startsWith(`${root}/`))
}

export function shouldIncludeEntry(name: string): boolean {
  if (BLOCKED_DIRECTORY_NAMES.has(name)) return false
  if (!name.startsWith('.')) return true
  return ALLOWED_DOTFILES.has(name)
}

export function truncateContent(content: string, maxBytes: number): { content: string; truncated: boolean } {
  const buf = Buffer.from(content, 'utf8')
  if (buf.length <= maxBytes) return { content, truncated: false }
  return { content: buf.subarray(0, maxBytes).toString('utf8'), truncated: true }
}

export function redactSecrets(content: string): string {
  return content
    // Redact double-quoted real secrets, but preserve documentation placeholders [...]
    .replace(/(AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|API_KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*"(?!\[)([^"]+)"/gi, '$1="[REDACTED]"')
    // Redact single-quoted real secrets, but preserve documentation placeholders [...]
    .replace(/(AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|API_KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*'(?!\[)([^']+)'/gi, "$1='[REDACTED]'")
    // Redact unquoted real secrets: alphanumeric/special chars that look like tokens
    // Skip documentation placeholders like "[generate-...]" or "[new-dev-token-only]"
    .replace(/(AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|API_KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*(?!\[)([a-zA-Z0-9_\-\.]{8,})/gi, '$1=[REDACTED]')
    // Redact private keys
    .replace(/-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]')
}
