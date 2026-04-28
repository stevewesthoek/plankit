import fs from 'fs'
import path from 'path'
import { getActiveSourceContext, getEnabledSources } from './config'

export type WriteChangeType = 'create' | 'append' | 'overwrite' | 'patch'

export type WritePolicySummary = {
  allowCreate: boolean
  allowOverwrite: boolean
  allowAppend: boolean
  allowPatch: boolean
  allowCreateParentDirectories: boolean
  allowedRoots: string[]
  blockedGlobs: string[]
  protectedGlobs: string[]
  maxWriteBytes: number
}

export type WriteValidationErrorCode =
  | 'WRITE_PATH_BLOCKED'
  | 'PROTECTED_PATH'
  | 'PARENT_DIRECTORY_MISSING'
  | 'CREATE_BLOCKED'
  | 'OVERWRITE_BLOCKED'
  | 'APPEND_BLOCKED'
  | 'PATCH_BLOCKED'
  | 'PATCH_FIND_NOT_FOUND'
  | 'PATCH_MULTIPLE_MATCHES'
  | 'SOURCE_NOT_WRITABLE'
  | 'SOURCE_NOT_READY'
  | 'SOURCE_NOT_FOUND'
  | 'PATH_TRAVERSAL_BLOCKED'
  | 'ABSOLUTE_PATH_BLOCKED'
  | 'SECRET_PATH_BLOCKED'
  | 'BINARY_FILE_BLOCKED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_ENCODING'
  | 'VERIFY_FAILED'

export type WriteValidationError = {
  code: WriteValidationErrorCode
  message: string
  userMessage: string
  reason: string
  hint: string
}

export type WriteValidationResult =
  | {
      ok: true
      requestedPath: string
      normalizedPath: string
      sourceRootRelativePath: string
      fullPath: string
      parentPath: string
      policy: WritePolicySummary
    }
  | {
      ok: false
      requestedPath: string
      normalizedPath: string
      sourceRootRelativePath: string
      error: WriteValidationError
      policy: WritePolicySummary
    }

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

const SAFE_WRITE_ROOTS = [
  'docs',
  'docs/product',
  'docs/product/releases',
  'docs/product/plans',
  'docs/product/prompts',
  'docs/product/notes',
  'docs/plans',
  'docs/prompts',
  'docs/notes',
  'plans',
  'notes',
  'artifacts',
  '.buildflow'
]

const PROTECTED_FILES = new Set(['package.json', 'docker-compose.yml'])
const BLOCKED_DIRECTORY_NAMES = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.git'])
const ALLOWED_DOTFILES = new Set(['.github', '.env.example', '.gitignore', '.buildflow', '.nvmrc', '.prettierrc', '.eslintrc'])

export function isSafeRelativePath(relativePath: string): boolean {
  if (!relativePath || relativePath.includes('..') || relativePath.startsWith('/')) return false
  return true
}

export function normalizeRepoRelativePath(requestedPath: string): string {
  return requestedPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').trim()
}

export function getDefaultWritePolicy(): WritePolicySummary {
  return {
    allowCreate: true,
    allowOverwrite: true,
    allowAppend: true,
    allowPatch: true,
    allowCreateParentDirectories: true,
    allowedRoots: ['*.md', 'docs/**', 'plans/**', 'notes/**', 'artifacts/**', '.buildflow/**', 'package.json', 'docker-compose.yml'],
    blockedGlobs: ['.env', '.env.*', '**/*.pem', '**/*.key', '**/id_rsa', '**/id_ed25519', '.git/**', 'node_modules/**', '.next/**', 'dist/**', 'build/**', 'coverage/**'],
    protectedGlobs: ['package.json', 'docker-compose.yml'],
    maxWriteBytes: 1_000_000
  }
}

function isWithinAllowedRoots(normalized: string): boolean {
  if (!normalized) return false
  if (!normalized.includes('/') && SAFE_ROOT_WRITE_FILES.has(normalized)) return true
  if (normalized.endsWith('.md') || normalized.endsWith('.txt') || normalized.endsWith('.json')) return true
  return SAFE_WRITE_ROOTS.some(root => normalized === root || normalized.startsWith(`${root}/`))
}

function classifyBlockedPath(normalized: string): { code: WriteValidationErrorCode; reason: string; message: string; hint: string } | null {
  if (normalized.startsWith('/') || path.isAbsolute(normalized)) {
    return { code: 'ABSOLUTE_PATH_BLOCKED', reason: 'absolute_path', message: 'Absolute paths outside the repo are blocked.', hint: 'Use a repo-relative path inside the connected source.' }
  }
  if (normalized.includes('..')) {
    return { code: 'PATH_TRAVERSAL_BLOCKED', reason: 'path_traversal', message: 'Path traversal outside the repo is blocked.', hint: 'Use a normalized path within the connected source root.' }
  }
  if (/(\.env(\..*)?)$/i.test(normalized) || /(^|\/)\.env(\..*)?$/i.test(normalized)) {
    return { code: 'SECRET_PATH_BLOCKED', reason: 'secret_path', message: 'Files that may contain secrets are blocked.', hint: 'Choose a documentation path instead of an environment file.' }
  }
  if (normalized.split('/').some(part => BLOCKED_DIRECTORY_NAMES.has(part))) {
    return { code: 'PROTECTED_PATH', reason: 'protected_directory', message: 'Protected runtime directories are blocked.', hint: 'Write outside build, dist, node_modules, or .git directories.' }
  }
  if (BLOCKED_WRITE_PATTERNS.some(pattern => pattern.test(normalized))) {
    return { code: 'SECRET_PATH_BLOCKED', reason: 'secret_path', message: 'This path looks like a secret or credential file.', hint: 'Use a docs or project note path instead.' }
  }
  if (PROTECTED_FILES.has(path.basename(normalized))) {
    return { code: 'PROTECTED_PATH', reason: 'protected_file', message: 'This file is protected by policy.', hint: 'Use a docs path or update the source write policy if intentional.' }
  }
  return null
}

export function validateWriteTarget(params: {
  sourceId?: string
  requestedPath: string
  changeType: WriteChangeType
  sourceRoot?: string
  allowCreateParentDirectories?: boolean
}): WriteValidationResult {
  const policy = getDefaultWritePolicy()
  const requestedPath = params.requestedPath || ''
  const rawRequestedPath = requestedPath.replace(/\\/g, '/').trim()
  const normalizedPath = normalizeRepoRelativePath(requestedPath)
  const sourceRootRelativePath = normalizedPath

  if (!requestedPath || !normalizedPath) {
    return { ok: false, requestedPath, normalizedPath, sourceRootRelativePath, policy, error: { code: 'WRITE_PATH_BLOCKED', message: 'This path is blocked by the source write policy.', userMessage: 'BuildFlow can read this file, but it needs a valid repo-relative path to write it.', reason: 'empty_path', hint: 'Provide a repo-relative path like docs/README.md.' } }
  }

  if (rawRequestedPath.startsWith('/')) {
    return { ok: false, requestedPath, normalizedPath, sourceRootRelativePath, policy, error: { code: 'ABSOLUTE_PATH_BLOCKED', message: 'Absolute paths outside the repo are blocked.', userMessage: 'BuildFlow can only write inside the connected source root.', reason: 'absolute_path', hint: 'Use a repo-relative path inside the source root.' } }
  }

  const blocked = classifyBlockedPath(normalizedPath)
  if (blocked) {
    return { ok: false, requestedPath, normalizedPath, sourceRootRelativePath, policy, error: { code: blocked.code, message: blocked.message, userMessage: blocked.message, reason: blocked.reason, hint: blocked.hint } }
  }

  if (!isWithinAllowedRoots(normalizedPath)) {
    return { ok: false, requestedPath, normalizedPath, sourceRootRelativePath, policy, error: { code: 'WRITE_PATH_BLOCKED', message: 'This path is blocked by the source write policy.', userMessage: 'BuildFlow can read this file, but the current write policy blocks changes to this path.', reason: 'path_not_allowed', hint: 'Choose an allowed docs path or update the source write policy.' } }
  }

  if (params.changeType === 'create' && !policy.allowCreate) {
    return { ok: false, requestedPath, normalizedPath, sourceRootRelativePath, policy, error: { code: 'CREATE_BLOCKED', message: 'Create is blocked by policy.', userMessage: 'BuildFlow is not allowed to create files here.', reason: 'create_blocked', hint: 'Use an allowed docs path or update the source policy.' } }
  }
  if (params.changeType === 'overwrite' && !policy.allowOverwrite) {
    return { ok: false, requestedPath, normalizedPath, sourceRootRelativePath, policy, error: { code: 'OVERWRITE_BLOCKED', message: 'Overwrite is blocked by policy.', userMessage: 'BuildFlow is not allowed to overwrite files here.', reason: 'overwrite_blocked', hint: 'Use an allowed docs path or update the source policy.' } }
  }
  if (params.changeType === 'append' && !policy.allowAppend) {
    return { ok: false, requestedPath, normalizedPath, sourceRootRelativePath, policy, error: { code: 'APPEND_BLOCKED', message: 'Append is blocked by policy.', userMessage: 'BuildFlow is not allowed to append to files here.', reason: 'append_blocked', hint: 'Use an allowed docs path or update the source policy.' } }
  }
  if (params.changeType === 'patch' && !policy.allowPatch) {
    return { ok: false, requestedPath, normalizedPath, sourceRootRelativePath, policy, error: { code: 'PATCH_BLOCKED', message: 'Patch is blocked by policy.', userMessage: 'BuildFlow is not allowed to patch files here.', reason: 'patch_blocked', hint: 'Use an allowed docs path or update the source policy.' } }
  }

  const sourceRoot = params.sourceRoot ? path.resolve(params.sourceRoot) : ''
  const fullPath = sourceRoot ? path.resolve(path.join(sourceRoot, normalizedPath)) : normalizedPath
  const parentPath = path.dirname(fullPath)
  if (sourceRoot && !fullPath.startsWith(sourceRoot)) {
    return { ok: false, requestedPath, normalizedPath, sourceRootRelativePath, policy, error: { code: 'PATH_TRAVERSAL_BLOCKED', message: 'Path traversal outside the repo is blocked.', userMessage: 'BuildFlow can only write inside the connected source root.', reason: 'path_outside_source_root', hint: 'Use a repo-relative path inside the source root.' } }
  }

  return { ok: true, requestedPath, normalizedPath, sourceRootRelativePath, fullPath, parentPath, policy }
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
  return SAFE_WRITE_ROOTS.some(root => normalized === root || normalized.startsWith(`${root}/`))
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
