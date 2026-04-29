import { executeAction, ActionTransportError, executeActionGET } from './transport'
import { getBackendUrl, getBackendMode } from './config'

type NormalizedSource = {
  id: string
  label: string
  enabled: boolean
  active: boolean
  type?: string
  writable?: boolean
  writeProfile?: string
  writePolicy?: Record<string, unknown>
}

type NormalizedContextResult = {
  status: 'ok'
  contextMode: 'single' | 'multi'
  activeSourceIds: string[]
  sources: NormalizedSource[]
}

type VerifiedWriteResult = {
  verified: true
  verifiedAt: string
  bytesOnDisk: number
  contentHash: string
  contentPreview: string
}

type WritePolicy = {
  allowCreate?: boolean
  allowOverwrite?: boolean
  allowAppend?: boolean
  allowPatch?: boolean
  allowCreateParentDirectories?: boolean
  allowDelete?: boolean
  allowDeleteDirectory?: boolean
  allowMove?: boolean
  allowRename?: boolean
  allowMkdir?: boolean
  allowRmdir?: boolean
  recursiveDeleteRequiresConfirmation?: boolean
  maxRecursiveDeleteFilesWithoutConfirmation?: number
  allowedRoots?: string[]
  blockedGlobs?: string[]
  blockedWriteGlobs?: string[]
  generatedDeleteAllowedGlobs?: string[]
  confirmationRequiredGlobs?: string[]
  protectedWriteGlobs?: string[]
  protectedGlobs?: string[]
  blockedContentPatterns?: string[]
  binaryWriteBlocked?: boolean
  binaryDeleteAllowedWithConfirmation?: boolean
  maxWriteBytes?: number
  maxCreateBytes?: number
  maxOverwriteBytes?: number
  maxPatchTargetBytes?: number
}

const ENV_TEMPLATE_FILES = new Set([
  '.env.example',
  '.env.sample',
  '.env.template',
  '.env.local.example',
  '.env.development.example',
  '.env.production.example'
])

export async function requireExplicitSourceId(body: Record<string, unknown>, userToken?: string) {
  if (typeof body.sourceId === 'string' && body.sourceId.length > 0) {
    return null
  }

  const active = await executeAction('/api/get-active-sources', {}, userToken)
  const activeIds = Array.isArray((active as { activeSourceIds?: unknown }).activeSourceIds)
    ? ((active as { activeSourceIds: string[] }).activeSourceIds || [])
    : []

  if (activeIds.length === 1) {
    return null
  }

  return { error: 'Target sourceId required when multiple sources are active.', status: 400 }
}

function normalizePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').trim()
}

function matchesWildcard(pattern: string, value: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLESTAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLESTAR::/g, '.*')
  return new RegExp(`^${escaped}$`, 'i').test(value)
}

function matchesAny(patterns: unknown, value: string): boolean {
  if (!Array.isArray(patterns)) return false
  return patterns.some(pattern => typeof pattern === 'string' && pattern.length > 0 && matchesWildcard(pattern, value))
}

function findMatchingGlob(patterns: unknown, value: string): string | undefined {
  if (!Array.isArray(patterns)) return undefined
  return patterns.find(pattern => typeof pattern === 'string' && pattern.length > 0 && matchesWildcard(pattern, value)) as string | undefined
}

function isDependencyChange(content?: string): boolean {
  if (typeof content !== 'string' || !content.trim()) return false
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    return Boolean(parsed.dependencies || parsed.devDependencies || parsed.peerDependencies || parsed.optionalDependencies)
  } catch {
    return false
  }
}

function classifyBlockedWrite(path: string, policy?: WritePolicy, content?: string) {
  const normalized = normalizePath(path)
  if (!normalized) {
    return { code: 'WRITE_PATH_BLOCKED', message: 'This path is blocked by the source write policy.', userMessage: 'BuildFlow can read this file, but it needs a valid repo-relative path to write it.', reason: 'empty_path', hint: 'Provide a repo-relative path like docs/README.md.' }
  }
  if (normalized.startsWith('..') || normalized.includes('/../') || normalized === '..') {
    return { code: 'PATH_TRAVERSAL_BLOCKED', message: 'Path traversal outside the repo is blocked.', userMessage: 'BuildFlow can only write inside the connected source root.', reason: 'path_traversal', hint: 'Use a repo-relative path inside the source root.' }
  }
  if (path.startsWith('/')) {
    return { code: 'ABSOLUTE_PATH_BLOCKED', message: 'Absolute paths outside the repo are blocked.', userMessage: 'BuildFlow can only write inside the connected source root.', reason: 'absolute_path', hint: 'Use a repo-relative path inside the source root.' }
  }
  if (ENV_TEMPLATE_FILES.has(normalized.split('/').pop() || '')) {
    return null
  }
  if (normalized.split('/').some(part => part === '.git' || part === 'node_modules' || part === '.next' || part === 'dist' || part === 'build' || part === 'coverage')) {
    return { code: 'PROTECTED_PATH', message: 'This file or directory is protected by policy.', userMessage: 'BuildFlow is not allowed to write to protected runtime or dependency directories.', reason: 'protected_directory', hint: 'Choose a docs path or update the source policy if intentional.' }
  }
  if (normalized === 'package.json' && isDependencyChange(content)) {
    return { code: 'REQUIRES_EXPLICIT_CONFIRMATION', message: 'This change requires explicit confirmation.', userMessage: 'BuildFlow needs explicit confirmation before making this change.', reason: 'dependency_change', hint: 'Explicitly confirm dependency changes before editing package.json.' }
  }
  if (matchesAny(policy?.confirmationRequiredGlobs, normalized)) {
    return { code: 'REQUIRES_EXPLICIT_CONFIRMATION', message: 'This change requires explicit confirmation.', userMessage: 'BuildFlow needs explicit confirmation before making this change.', reason: 'confirmation_required_path', hint: 'Explicitly confirm before editing lockfiles, GitHub workflows, LICENSE, or Prisma migrations.' }
  }
  if (matchesAny(policy?.protectedWriteGlobs, normalized)) {
    return { code: 'REQUIRES_EXPLICIT_CONFIRMATION', message: 'This change requires explicit confirmation.', userMessage: 'BuildFlow needs explicit confirmation before making this change.', reason: 'protected_write_path', hint: 'Explicitly confirm before editing this protected maintenance path.' }
  }
  if (matchesAny(policy?.blockedGlobs, normalized)) {
    return { code: 'SECRET_PATH_BLOCKED', message: 'This path is blocked because it may contain secrets.', userMessage: 'BuildFlow will not write to secret-like files such as .env or private key paths.', reason: 'blocked_glob', hint: 'Use a docs or project note path instead.' }
  }
  if (matchesAny(policy?.blockedWriteGlobs, normalized)) {
    return { code: 'GENERATED_WRITE_BLOCKED', message: 'This path is blocked because it is generated output.', userMessage: 'BuildFlow will not write generated or build output files.', reason: 'generated_write_blocked', hint: 'Write to the source file or a repo note instead.' }
  }
  if (matchesAny(policy?.protectedGlobs, normalized)) {
    return { code: 'PROTECTED_PATH', message: 'This file is protected by policy.', userMessage: 'BuildFlow is not allowed to write to this protected file.', reason: 'protected_glob', hint: 'Choose a docs path or update the source policy if intentional.' }
  }
  const allowedRoots = Array.isArray(policy?.allowedRoots) ? policy!.allowedRoots! : []
  const allowRoot = allowedRoots.some(root => typeof root === 'string' && root.length > 0 && (
    root === '*.md' ? normalized.endsWith('.md') : root.endsWith('/**') ? normalized === root.slice(0, -3) || normalized.startsWith(root.slice(0, -3) + '/') : normalized === root || normalized.startsWith(`${root}/`)
  ))
  if (!allowRoot) {
    return { code: 'WRITE_PATH_BLOCKED', message: 'This path is blocked by the source write policy.', userMessage: 'BuildFlow can read this file, but the current write policy blocks changes to this path.', reason: 'path_not_allowed', hint: 'Choose an allowed docs path or update the source write policy.' }
  }
  return null
}

function normalizeSourceRecord(source: Record<string, unknown>): NormalizedSource & {
  indexed?: boolean
  indexStatus?: string
  indexedFileCount?: number
  lastIndexedAt?: string
  searchable?: boolean
} {
  const id = typeof source.id === 'string' ? source.id : ''
  const label = typeof source.label === 'string' && source.label.trim() ? source.label : id
  const enabled = source.enabled !== false
  const active = source.active === true
  const type = typeof source.type === 'string' && source.type.trim() ? source.type : undefined
  const writable = typeof source.writable === 'boolean' ? source.writable : undefined
  const writeProfile = typeof source.writeProfile === 'string' && source.writeProfile.trim() ? source.writeProfile : undefined
  const writePolicy = source.writePolicy && typeof source.writePolicy === 'object' ? source.writePolicy as Record<string, unknown> : undefined
  const indexed = source.indexed === true
  const indexStatus = typeof source.indexStatus === 'string' && source.indexStatus.trim() ? source.indexStatus : undefined
  const indexedFileCount = typeof source.indexedFileCount === 'number' ? source.indexedFileCount : undefined
  const lastIndexedAt = typeof source.lastIndexedAt === 'string' && source.lastIndexedAt.trim() ? source.lastIndexedAt : undefined
  const searchable = typeof source.searchable === 'boolean' ? source.searchable : (indexStatus ?? (indexed ? 'ready' : 'pending')) === 'ready'
  return { id, label, enabled, active, ...(type ? { type } : {}), ...(writable !== undefined ? { writable } : {}), ...(writeProfile ? { writeProfile } : {}), ...(writePolicy ? { writePolicy } : {}), ...(indexed !== undefined ? { indexed } : {}), ...(indexStatus ? { indexStatus } : {}), ...(indexedFileCount !== undefined ? { indexedFileCount } : {}), ...(lastIndexedAt ? { lastIndexedAt } : {}), ...(searchable !== undefined ? { searchable } : {}) }
}

function normalizeSourcesList(sourcesPayload: unknown) {
  const listedSources = Array.isArray((sourcesPayload as { sources?: unknown }).sources)
    ? ((sourcesPayload as { sources: Array<Record<string, unknown>> }).sources || [])
    : []
  return listedSources.map((source) => normalizeSourceRecord(source))
}

function normalizeActiveContext(activePayload: unknown): NormalizedContextResult {
  const activeSourceIds = Array.isArray((activePayload as { activeSourceIds?: unknown }).activeSourceIds)
    ? (((activePayload as { activeSourceIds: string[] }).activeSourceIds || []).filter(id => typeof id === 'string'))
    : []
  const mode = (activePayload as { mode?: unknown }).mode
  const contextMode = mode === 'single' || mode === 'multi' ? mode : activeSourceIds.length === 1 ? 'single' : 'multi'
  return {
    status: 'ok',
    contextMode,
    activeSourceIds,
    sources: []
  }
}

function normalizeContextResult(sourcesPayload: unknown, activePayload: unknown, fallbackStatus: 'ok' = 'ok'): NormalizedContextResult {
  const listedSources = normalizeSourcesList(sourcesPayload)
  const activeSourceIds = Array.isArray((activePayload as { activeSourceIds?: unknown }).activeSourceIds)
    ? (((activePayload as { activeSourceIds: string[] }).activeSourceIds || []).filter(id => typeof id === 'string'))
    : []
  const mode = (activePayload as { mode?: unknown }).mode
  const contextMode = mode === 'single' || mode === 'multi' ? mode : activeSourceIds.length === 1 ? 'single' : 'multi'
  const activeIds = new Set(activeSourceIds)

  const sources: NormalizedSource[] = listedSources.map(source => ({
    id: source.id,
    label: source.label,
    enabled: source.enabled,
    active: activeIds.has(source.id) || source.active === true,
    ...(source.type ? { type: source.type } : {}),
    ...(source.writable !== undefined ? { writable: source.writable } : {}),
    ...(source.writeProfile ? { writeProfile: source.writeProfile } : {}),
    ...(source.writePolicy ? { writePolicy: source.writePolicy } : {})
  }))

  return {
    status: fallbackStatus,
    contextMode,
    activeSourceIds,
    sources
  }
}

function assertVerifiedWriteResult(result: unknown, fallback: string): VerifiedWriteResult {
  if (!result || typeof result !== 'object') {
    throw new ActionTransportError(`${fallback}: write response missing`, 502)
  }

  const raw = result as Record<string, unknown>
  const verified = raw.verified
  if (verified !== true) {
    throw new ActionTransportError(`${fallback}: write was not verified`, 502)
  }

  const verifiedAt = raw.verifiedAt
  const bytesOnDisk = raw.bytesOnDisk
  const contentHash = raw.contentHash
  const contentPreview = raw.contentPreview

  if (typeof verifiedAt !== 'string' || !verifiedAt) throw new ActionTransportError(`${fallback}: verifiedAt missing`, 502)
  if (typeof bytesOnDisk !== 'number' || !Number.isFinite(bytesOnDisk) || bytesOnDisk <= 0) throw new ActionTransportError(`${fallback}: bytesOnDisk invalid`, 502)
  if (typeof contentHash !== 'string' || !contentHash) throw new ActionTransportError(`${fallback}: contentHash missing`, 502)
  if (typeof contentPreview !== 'string') throw new ActionTransportError(`${fallback}: contentPreview missing`, 502)

  return {
    verified: true,
    verifiedAt,
    bytesOnDisk,
    contentHash,
    contentPreview
  }
}

async function fetchJson(endpoint: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${getBackendUrl()}${endpoint}`, init)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ActionTransportError(
      (errorData as Record<string, unknown>).error as string || `Action failed: ${response.status}`,
      response.status
    )
  }
  return response.json()
}

export function unwrapActionError(err: unknown, fallback: string) {
  if (err instanceof ActionTransportError) {
    return { error: err.payload || err.message, status: err.statusCode }
  }
  return { error: `${fallback}: ${String(err)}`, status: 500 }
}

function validateContextSelection(body: Record<string, unknown>) {
  const contextMode = body.contextMode
  const sourceIds = body.sourceIds
  if (contextMode !== 'single' && contextMode !== 'multi') {
    throw new ActionTransportError('contextMode is required and must be single or multi', 400)
  }
  if (!Array.isArray(sourceIds) || sourceIds.length === 0 || sourceIds.some(id => typeof id !== 'string' || !id)) {
    throw new ActionTransportError('sourceIds is required and must be a non-empty string array', 400)
  }
  if (contextMode === 'single' && sourceIds.length !== 1) {
    throw new ActionTransportError('single mode requires exactly one sourceId', 400)
  }
}

async function loadSourceMap(userToken?: string) {
  const mode = getBackendMode()
  const headers: Record<string, string> = { method: 'GET' }
  if (mode === 'relay-agent' && userToken) {
    headers['Authorization'] = `Bearer ${userToken}`
  }
  const sourcesPayload = await fetchJson('/api/sources/list', { method: 'GET', headers })
  const sources = normalizeSourcesList(sourcesPayload)
  const map = new Map(sources.map(source => [source.id, source]))
  return { sourcesPayload, sources, map }
}

async function ensureContextSourcesAllowed(sourceIds: string[], userToken?: string) {
  const { map } = await loadSourceMap(userToken)
  for (const id of sourceIds) {
    const source = map.get(id)
    if (!source) {
      throw new ActionTransportError(`Unknown sourceId: ${id}`, 400)
    }
    if (source.enabled === false) {
      throw new ActionTransportError(`Source not enabled: ${id}`, 400)
    }
  }
}

async function preflightWrite(body: Record<string, unknown>, userToken?: string) {
  const sourceError = await requireExplicitSourceId(body, userToken)
  if (sourceError) return sourceError
  const sourceId = typeof body.sourceId === 'string' ? body.sourceId : undefined
  const path = typeof body.path === 'string' ? body.path : ''
  const changeType = body.changeType === 'append' || body.changeType === 'overwrite' || body.changeType === 'patch' || body.changeType === 'delete_file' || body.changeType === 'delete_directory' || body.changeType === 'move' || body.changeType === 'rename' || body.changeType === 'mkdir' || body.changeType === 'rmdir' ? body.changeType : 'create'
  const sourceMap = await loadSourceMap(userToken)
  const source = sourceId ? sourceMap.map.get(sourceId) : sourceMap.sources[0]
  const policy = (source?.writePolicy || {}) as WritePolicy
  const normalizedPath = normalizePath(path)
  const blocked = classifyBlockedWrite(path, policy, typeof body.content === 'string' ? body.content : undefined)
  const matchedAllowGlob = findMatchingGlob(policy?.allowedRoots, normalizedPath)
  const matchedBlockGlob = findMatchingGlob(policy?.blockedGlobs, normalizedPath) || findMatchingGlob(policy?.confirmationRequiredGlobs, normalizedPath) || findMatchingGlob(policy?.protectedGlobs, normalizedPath)
  if (blocked) {
    return {
      status: blocked.code === 'REQUIRES_EXPLICIT_CONFIRMATION' ? 'needs_confirmation' as const : 'blocked' as const,
      resultStatus: 'error' as const,
      allowed: false,
      verified: false,
      sourceId: source?.id || sourceId || '',
      path,
      requestedPath: path,
      normalizedPath,
      sourceRootRelativePath: normalizedPath,
      changeType,
      matchedAllowGlob,
      matchedBlockGlob,
      requiresConfirmation: blocked.code === 'REQUIRES_EXPLICIT_CONFIRMATION',
      matchedConfirmationGlob: findMatchingGlob(policy?.confirmationRequiredGlobs, normalizedPath),
      confirmationToken: blocked.code === 'REQUIRES_EXPLICIT_CONFIRMATION' ? `confirm:${source?.id || sourceId || ''}:${changeType}:${normalizedPath}` : undefined,
      error: { ...blocked, policy }
    }
  }
  return {
    status: 'allowed' as const,
    allowed: true,
    verified: false,
    sourceId: source?.id || sourceId || '',
    requestedPath: path,
    normalizedPath,
    sourceRootRelativePath: normalizedPath,
    changeType,
    wouldCreateParentDirectories: true,
    wouldWrite: ['create', 'append', 'overwrite', 'patch', 'mkdir'].includes(changeType),
    wouldDelete: ['delete_file', 'delete_directory', 'rmdir'].includes(changeType),
    wouldMove: ['move', 'rename'].includes(changeType),
    wouldCreateDirectory: changeType === 'mkdir',
    matchedAllowGlob,
    matchedConfirmationGlob: findMatchingGlob(policy?.confirmationRequiredGlobs, normalizedPath),
    policy
  }
}

export async function listBuildFlowSources(userToken?: string) {
  const mode = getBackendMode()
  const headers: Record<string, string> = { method: 'GET' }
  if (mode === 'relay-agent' && userToken) {
    headers['Authorization'] = `Bearer ${userToken}`
  }
  const sourcesPayload = await fetchJson('/api/sources/list', { method: 'GET', headers })
  return {
    status: 'ok' as const,
    sources: normalizeSourcesList(sourcesPayload).map(source => ({
      id: source.id,
      label: source.label,
      enabled: source.enabled,
      active: source.active,
      indexStatus: source.indexStatus ?? (source.searchable ? 'ready' : 'pending'),
      searchable: source.searchable === true,
      writable: source.writable === true,
      writeProfile: source.writeProfile,
      operations: ['create', 'patch', 'overwrite', 'append', 'deleteFile', 'deleteDirectory', 'move', 'rename', 'mkdir', 'rmdir'],
      writePolicy: source.writePolicy
    }))
  }
}

export async function getBuildFlowActiveContext(userToken?: string) {
  const activePayload = await executeAction('/api/get-active-sources', {}, userToken)
  return normalizeActiveContext(activePayload)
}

export async function setBuildFlowActiveContext(body: Record<string, unknown>, userToken?: string) {
  validateContextSelection(body)
  await ensureContextSourcesAllowed(body.sourceIds as string[], userToken)
  const result = await executeAction('/api/set-active-sources', {
    mode: body.contextMode,
    activeSourceIds: body.sourceIds
  }, userToken)
  const mode = getBackendMode()
  const headers: Record<string, string> = { method: 'GET' }
  if (mode === 'relay-agent' && userToken) {
    headers['Authorization'] = `Bearer ${userToken}`
  }
  const sourcesPayload = await fetchJson('/api/sources/list', { method: 'GET', headers })
  return normalizeContextResult(sourcesPayload, result)
}

export async function dispatchBuildFlowContext(body: Record<string, unknown>, userToken?: string) {
  const action = body.action
  if (action === 'list_sources') {
    return listBuildFlowSources(userToken)
  }
  if (action === 'get_active') {
    return getBuildFlowActiveContext(userToken)
  }
  if (action === 'set_active') {
    return setBuildFlowActiveContext(body, userToken)
  }
  throw new Error('Invalid action')
}

export async function dispatchBuildFlowInspect(body: Record<string, unknown>, userToken?: string) {
  const mode = body.mode
  if (mode === 'list_files') {
    const payload: Record<string, unknown> = {
      path: typeof body.path === 'string' ? body.path : '',
      depth: typeof body.depth === 'number' ? body.depth : 3,
      limit: typeof body.limit === 'number' ? body.limit : 50
    }
    if (Array.isArray(body.sourceIds)) payload.sourceIds = body.sourceIds
    if (typeof body.sourceId === 'string') payload.sourceId = body.sourceId
    return executeAction('/api/list-files', payload, userToken)
  }
  if (mode === 'search') {
    if (typeof body.query !== 'string' || !body.query) throw new Error('Missing query parameter')
    const payload: Record<string, unknown> = {
      query: body.query,
      limit: typeof body.limit === 'number' ? body.limit : 50
    }
    if (Array.isArray(body.sourceIds)) payload.sourceIds = body.sourceIds
    if (typeof body.sourceId === 'string') payload.sourceId = body.sourceId
    return executeAction('/api/search', payload, userToken)
  }
  throw new Error('Invalid mode')
}

export async function dispatchBuildFlowRead(body: Record<string, unknown>, userToken?: string) {
  const mode = body.mode
  if (mode === 'read_paths') {
    if (!Array.isArray(body.paths) || body.paths.length === 0) throw new Error('Missing paths parameter')
    const payload: Record<string, unknown> = {
      paths: body.paths,
      maxBytesPerFile: typeof body.maxBytesPerFile === 'number' ? body.maxBytesPerFile : 30000
    }
    if (Array.isArray(body.sourceIds)) payload.sourceIds = body.sourceIds
    if (typeof body.sourceId === 'string') payload.sourceId = body.sourceId
    const result = await executeAction('/api/read-files', payload, userToken)
    return {
      mode: 'read_paths',
      files: Array.isArray((result as { files?: unknown }).files) ? (result as { files: unknown[] }).files : []
    }
  }
  if (mode === 'search_and_read') {
    if (typeof body.query !== 'string' || !body.query) throw new Error('Missing query parameter')
    const searchPayload: Record<string, unknown> = {
      query: body.query,
      limit: typeof body.limit === 'number' ? body.limit : 3
    }
    if (Array.isArray(body.sourceIds)) searchPayload.sourceIds = body.sourceIds
    if (typeof body.sourceId === 'string') searchPayload.sourceId = body.sourceId

    const searchResult = await executeAction('/api/search', searchPayload, userToken)
    const results = Array.isArray((searchResult as { results?: unknown }).results)
      ? ((searchResult as { results: Array<Record<string, unknown>> }).results || [])
      : []

    if (results.length === 0) {
      throw new Error(`No matching files found for query: ${body.query}`)
    }

    const pathEntries = results
      .map(result => {
        const path = typeof result.path === 'string' ? result.path : ''
        const sourceId = typeof result.sourceId === 'string' ? result.sourceId : undefined
        return path ? { path, sourceId } : null
      })
      .filter((entry): entry is { path: string; sourceId: string | undefined } => entry !== null)
      .slice(0, typeof body.limit === 'number' ? body.limit : 3)

    const sourceIds = Array.from(new Set(pathEntries.map(entry => entry.sourceId).filter((id): id is string => typeof id === 'string' && id.length > 0)))
    const readPayload: Record<string, unknown> = {
      paths: pathEntries.map(entry => entry.path),
      maxBytesPerFile: typeof body.maxBytesPerFile === 'number' ? body.maxBytesPerFile : 30000
    }
    if (sourceIds.length > 0) {
      readPayload.sourceIds = sourceIds
    } else if (typeof body.sourceId === 'string') {
      readPayload.sourceId = body.sourceId
    }

    const readResult = await executeAction('/api/read-files', readPayload, userToken)
    const files = Array.isArray((readResult as { files?: unknown }).files)
      ? ((readResult as { files: Array<Record<string, unknown>> }).files || [])
      : []

    const fileMap = new Map<string, Record<string, unknown>>()
    for (const file of files) {
      const key = `${typeof file.sourceId === 'string' ? file.sourceId : ''}::${typeof file.path === 'string' ? file.path : ''}`
      if (key !== '::') fileMap.set(key, file)
    }

    return {
      mode: 'search_and_read',
      results: pathEntries.map(entry => {
        const candidates = [
          entry.sourceId ? `${entry.sourceId}::${entry.path}` : '',
          ...Array.from(fileMap.keys()).filter(key => key.endsWith(`::${entry.path}`))
        ].filter(Boolean)
        const match = candidates.map(key => fileMap.get(key)).find(Boolean)
        return {
          sourceId: entry.sourceId || (match && typeof match.sourceId === 'string' ? match.sourceId : undefined),
          path: entry.path,
          title: typeof (results.find(result => result.path === entry.path && (!entry.sourceId || result.sourceId === entry.sourceId))?.title) === 'string'
            ? (results.find(result => result.path === entry.path && (!entry.sourceId || result.sourceId === entry.sourceId))?.title as string)
            : undefined,
          snippet: typeof (results.find(result => result.path === entry.path && (!entry.sourceId || result.sourceId === entry.sourceId))?.snippet) === 'string'
            ? (results.find(result => result.path === entry.path && (!entry.sourceId || result.sourceId === entry.sourceId))?.snippet as string)
            : undefined,
          content: typeof match?.content === 'string' ? match.content : undefined,
          truncated: typeof match?.truncated === 'boolean' ? match.truncated : undefined,
          sizeBytes: typeof match?.sizeBytes === 'number' ? match.sizeBytes : undefined,
          modifiedAt: typeof match?.modifiedAt === 'string' ? match.modifiedAt : undefined
        }
      })
    }
  }
  throw new Error('Invalid mode')
}

export async function dispatchBuildFlowArtifact(body: Record<string, unknown>, userToken?: string) {
  if (body.dryRun === true || body.preflight === true) {
    return preflightWrite({ ...body, changeType: 'create' }, userToken)
  }
  const sourceError = await requireExplicitSourceId(body, userToken)
  if (sourceError) return sourceError
  const result = await executeAction('/api/create-artifact', body, userToken)
  const verified = assertVerifiedWriteResult(result, 'writeBuildFlowArtifact')
  return { ...result as Record<string, unknown>, ...verified }
}

export async function dispatchBuildFlowFileChange(body: Record<string, unknown>, userToken?: string) {
  if (body.dryRun === true || body.preflight === true) {
    return preflightWrite(body, userToken)
  }
  const sourceError = await requireExplicitSourceId(body, userToken)
  if (sourceError) return sourceError

  const changeType = body.changeType
  const payload: Record<string, unknown> = {
    sourceId: body.sourceId,
    path: body.path,
    reason: body.reason
  }

  if (changeType === 'append') {
    payload.content = body.content
    payload.separator = body.separator ?? '\n\n'
    const result = await executeAction('/api/append-file', payload, userToken)
    const verified = assertVerifiedWriteResult(result, 'applyBuildFlowFileChange append')
    return { ...(result as Record<string, unknown>), ...verified }
  }

  if (changeType === 'create') {
    payload.content = body.content
    payload.mode = 'createOnly'
    const result = await executeAction('/api/write-file', payload, userToken)
    const verified = assertVerifiedWriteResult(result, 'applyBuildFlowFileChange create')
    return { ...(result as Record<string, unknown>), ...verified }
  }

  if (changeType === 'overwrite') {
    payload.content = body.content
    payload.mode = 'overwrite'
    const result = await executeAction('/api/write-file', payload, userToken)
    const verified = assertVerifiedWriteResult(result, 'applyBuildFlowFileChange overwrite')
    return { ...(result as Record<string, unknown>), ...verified }
  }

  if (changeType === 'patch') {
    payload.find = body.find
    payload.replace = body.replace
    payload.allowMultiple = body.allowMultiple ?? false
    const result = await executeAction('/api/patch-file', payload, userToken)
    const verified = assertVerifiedWriteResult(result, 'applyBuildFlowFileChange patch')
    return { ...(result as Record<string, unknown>), ...verified }
  }

  if (changeType === 'delete_file' || changeType === 'delete_directory' || changeType === 'rmdir') {
    payload.recursive = body.recursive === true
    payload.onlyIfEmpty = body.onlyIfEmpty !== false
    payload.confirmedByUser = body.confirmedByUser === true
    payload.confirmationToken = typeof body.confirmationToken === 'string' ? body.confirmationToken : undefined
    return executeAction('/api/delete-file', payload, userToken)
  }

  if (changeType === 'move' || changeType === 'rename') {
    payload.to = body.to
    payload.overwrite = body.overwrite === true
    payload.createParents = body.createParents === true || body.createParentDirectories === true
    payload.confirmedByUser = body.confirmedByUser === true
    payload.confirmationToken = typeof body.confirmationToken === 'string' ? body.confirmationToken : undefined
    return executeAction('/api/move-file', payload, userToken)
  }

  if (changeType === 'mkdir') {
    payload.createParents = body.createParents === true || body.createParentDirectories === true
    payload.confirmedByUser = body.confirmedByUser === true
    return executeAction('/api/mkdir', payload, userToken)
  }

  throw new Error('Invalid changeType')
}
