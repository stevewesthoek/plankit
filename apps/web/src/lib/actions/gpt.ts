import { executeAction, ActionTransportError } from './transport'
import { getBackendUrl } from './config'

type NormalizedSource = {
  id: string
  label: string
  enabled: boolean
  active: boolean
  type?: string
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

export async function requireExplicitSourceId(body: Record<string, unknown>) {
  if (typeof body.sourceId === 'string' && body.sourceId.length > 0) {
    return null
  }

  const active = await executeAction('/api/get-active-sources', {})
  const activeIds = Array.isArray((active as { activeSourceIds?: unknown }).activeSourceIds)
    ? ((active as { activeSourceIds: string[] }).activeSourceIds || [])
    : []

  if (activeIds.length === 1) {
    return null
  }

  return { error: 'Target sourceId required when multiple sources are active.', status: 400 }
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
  const indexed = source.indexed === true
  const indexStatus = typeof source.indexStatus === 'string' && source.indexStatus.trim() ? source.indexStatus : undefined
  const indexedFileCount = typeof source.indexedFileCount === 'number' ? source.indexedFileCount : undefined
  const lastIndexedAt = typeof source.lastIndexedAt === 'string' && source.lastIndexedAt.trim() ? source.lastIndexedAt : undefined
  const searchable = typeof source.searchable === 'boolean' ? source.searchable : (indexStatus ?? (indexed ? 'ready' : 'pending')) === 'ready'
  return { id, label, enabled, active, ...(type ? { type } : {}), ...(indexed !== undefined ? { indexed } : {}), ...(indexStatus ? { indexStatus } : {}), ...(indexedFileCount !== undefined ? { indexedFileCount } : {}), ...(lastIndexedAt ? { lastIndexedAt } : {}), ...(searchable !== undefined ? { searchable } : {}) }
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
    ...(source.type ? { type: source.type } : {})
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
    return { error: err.message, status: err.statusCode }
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

async function loadSourceMap() {
  const sourcesPayload = await fetchJson('/api/sources/list', { method: 'GET' })
  const sources = normalizeSourcesList(sourcesPayload)
  const map = new Map(sources.map(source => [source.id, source]))
  return { sourcesPayload, sources, map }
}

async function ensureContextSourcesAllowed(sourceIds: string[]) {
  const { map } = await loadSourceMap()
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

export async function listBuildFlowSources() {
  const sourcesPayload = await fetchJson('/api/sources/list', { method: 'GET' })
  return {
    status: 'ok' as const,
    sources: normalizeSourcesList(sourcesPayload).map(source => ({
      id: source.id,
      label: source.label,
      enabled: source.enabled,
      active: source.active,
      indexStatus: source.indexStatus ?? (source.searchable ? 'ready' : 'pending'),
      searchable: source.searchable === true
    }))
  }
}

export async function getBuildFlowActiveContext() {
  const activePayload = await executeAction('/api/get-active-sources', {})
  return normalizeActiveContext(activePayload)
}

export async function setBuildFlowActiveContext(body: Record<string, unknown>) {
  validateContextSelection(body)
  await ensureContextSourcesAllowed(body.sourceIds as string[])
  const result = await executeAction('/api/set-active-sources', {
    mode: body.contextMode,
    activeSourceIds: body.sourceIds
  })
  const sourcesPayload = await fetchJson('/api/sources/list', { method: 'GET' })
  return normalizeContextResult(sourcesPayload, result)
}

export async function dispatchBuildFlowContext(body: Record<string, unknown>) {
  const action = body.action
  if (action === 'list_sources') {
    return listBuildFlowSources()
  }
  if (action === 'get_active') {
    return getBuildFlowActiveContext()
  }
  if (action === 'set_active') {
    return setBuildFlowActiveContext(body)
  }
  throw new Error('Invalid action')
}

export async function dispatchBuildFlowInspect(body: Record<string, unknown>) {
  const mode = body.mode
  if (mode === 'list_files') {
    const payload: Record<string, unknown> = {
      path: typeof body.path === 'string' ? body.path : '',
      depth: typeof body.depth === 'number' ? body.depth : 3,
      limit: typeof body.limit === 'number' ? body.limit : 50
    }
    if (Array.isArray(body.sourceIds)) payload.sourceIds = body.sourceIds
    if (typeof body.sourceId === 'string') payload.sourceId = body.sourceId
    return executeAction('/api/list-files', payload)
  }
  if (mode === 'search') {
    if (typeof body.query !== 'string' || !body.query) throw new Error('Missing query parameter')
    const payload: Record<string, unknown> = {
      query: body.query,
      limit: typeof body.limit === 'number' ? body.limit : 50
    }
    if (Array.isArray(body.sourceIds)) payload.sourceIds = body.sourceIds
    if (typeof body.sourceId === 'string') payload.sourceId = body.sourceId
    return executeAction('/api/search', payload)
  }
  throw new Error('Invalid mode')
}

export async function dispatchBuildFlowRead(body: Record<string, unknown>) {
  const mode = body.mode
  if (mode === 'read_paths') {
    if (!Array.isArray(body.paths) || body.paths.length === 0) throw new Error('Missing paths parameter')
    const payload: Record<string, unknown> = {
      paths: body.paths,
      maxBytesPerFile: typeof body.maxBytesPerFile === 'number' ? body.maxBytesPerFile : 30000
    }
    if (Array.isArray(body.sourceIds)) payload.sourceIds = body.sourceIds
    if (typeof body.sourceId === 'string') payload.sourceId = body.sourceId
    const result = await executeAction('/api/read-files', payload)
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

    const searchResult = await executeAction('/api/search', searchPayload)
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

    const readResult = await executeAction('/api/read-files', readPayload)
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

export async function dispatchBuildFlowArtifact(body: Record<string, unknown>) {
  const sourceError = await requireExplicitSourceId(body)
  if (sourceError) return sourceError
  const result = await executeAction('/api/create-artifact', body)
  const verified = assertVerifiedWriteResult(result, 'writeBuildFlowArtifact')
  return { ...result as Record<string, unknown>, ...verified }
}

export async function dispatchBuildFlowFileChange(body: Record<string, unknown>) {
  const sourceError = await requireExplicitSourceId(body)
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
    const result = await executeAction('/api/append-file', payload)
    const verified = assertVerifiedWriteResult(result, 'applyBuildFlowFileChange append')
    return { ...(result as Record<string, unknown>), ...verified }
  }

  if (changeType === 'create') {
    payload.content = body.content
    payload.mode = 'createOnly'
    const result = await executeAction('/api/write-file', payload)
    const verified = assertVerifiedWriteResult(result, 'applyBuildFlowFileChange create')
    return { ...(result as Record<string, unknown>), ...verified }
  }

  if (changeType === 'overwrite') {
    payload.content = body.content
    payload.mode = 'overwrite'
    const result = await executeAction('/api/write-file', payload)
    const verified = assertVerifiedWriteResult(result, 'applyBuildFlowFileChange overwrite')
    return { ...(result as Record<string, unknown>), ...verified }
  }

  if (changeType === 'patch') {
    payload.find = body.find
    payload.replace = body.replace
    payload.allowMultiple = body.allowMultiple ?? false
    const result = await executeAction('/api/patch-file', payload)
    const verified = assertVerifiedWriteResult(result, 'applyBuildFlowFileChange patch')
    return { ...(result as Record<string, unknown>), ...verified }
  }

  throw new Error('Invalid changeType')
}
