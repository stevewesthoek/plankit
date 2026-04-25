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
  contextMode: 'single' | 'multi' | 'all'
  activeSourceIds: string[]
  sources: NormalizedSource[]
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

function normalizeContextResult(
  sourcesPayload: unknown,
  activePayload: unknown,
  fallbackStatus: 'ok' = 'ok'
): NormalizedContextResult {
  const listedSources = Array.isArray((sourcesPayload as { sources?: unknown }).sources)
    ? ((sourcesPayload as { sources: Array<Record<string, unknown>> }).sources || [])
    : []
  const activeSourceIds = Array.isArray((activePayload as { activeSourceIds?: unknown }).activeSourceIds)
    ? (((activePayload as { activeSourceIds: string[] }).activeSourceIds || []).filter(id => typeof id === 'string'))
    : []
  const mode = (activePayload as { mode?: unknown }).mode
  const contextMode = mode === 'single' || mode === 'multi' || mode === 'all' ? mode : 'all'
  const activeIds = new Set(activeSourceIds)
  const activeById = new Map<string, Record<string, unknown>>()

  for (const source of listedSources) {
    const id = typeof source.id === 'string' ? source.id : ''
    if (!id) continue
    activeById.set(id, source)
  }

  const sources: NormalizedSource[] = listedSources.map(source => {
    const id = typeof source.id === 'string' ? source.id : ''
    const label = typeof source.label === 'string' && source.label.trim() ? source.label : id
    const enabled = source.enabled !== false
    const active = activeIds.has(id) || source.active === true
    const type = typeof source.type === 'string' && source.type.trim() ? source.type : undefined
    return type ? { id, label, enabled, active, type } : { id, label, enabled, active }
  })

  if (sources.length === 0 && activeIds.size > 0) {
    for (const id of activeIds) {
      sources.push({ id, label: id, enabled: true, active: true })
    }
  }

  return {
    status: fallbackStatus,
    contextMode,
    activeSourceIds,
    sources
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

export async function dispatchBuildFlowContext(body: Record<string, unknown>) {
  const action = body.action
  if (action === 'list_sources') {
    const [sourcesPayload, activePayload] = await Promise.all([
      fetchJson('/api/sources/list', { method: 'GET' }),
      executeAction('/api/get-active-sources', {})
    ])
    return normalizeContextResult(sourcesPayload, activePayload)
  }
  if (action === 'get_active') {
    const [sourcesPayload, activePayload] = await Promise.all([
      fetchJson('/api/sources/list', { method: 'GET' }),
      executeAction('/api/get-active-sources', {})
    ])
    return normalizeContextResult(sourcesPayload, activePayload)
  }
  if (action === 'set_active') {
    const payload: Record<string, unknown> = {
      mode: body.contextMode,
      activeSourceIds: body.sourceIds
    }
    const result = await executeAction('/api/set-active-sources', payload)
    const sourcesPayload = await fetchJson('/api/sources/list', { method: 'GET' })
    return normalizeContextResult(sourcesPayload, result)
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
    return executeAction('/api/read-files', payload)
  }
  if (mode === 'search_and_read') {
    if (typeof body.query !== 'string' || !body.query) throw new Error('Missing query parameter')
    const payload: Record<string, unknown> = {
      query: body.query,
      limit: typeof body.limit === 'number' ? body.limit : 3,
      maxBytesPerFile: typeof body.maxBytesPerFile === 'number' ? body.maxBytesPerFile : 30000
    }
    if (Array.isArray(body.sourceIds)) payload.sourceIds = body.sourceIds
    if (typeof body.sourceId === 'string') payload.sourceId = body.sourceId
    return executeAction('/api/search-and-read', payload)
  }
  throw new Error('Invalid mode')
}

export async function dispatchBuildFlowArtifact(body: Record<string, unknown>) {
  const sourceError = await requireExplicitSourceId(body)
  if (sourceError) return sourceError
  return executeAction('/api/create-artifact', body)
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
    return executeAction('/api/append-file', payload)
  }

  if (changeType === 'create') {
    payload.content = body.content
    payload.mode = 'createOnly'
    return executeAction('/api/write-file', payload)
  }

  if (changeType === 'overwrite') {
    payload.content = body.content
    payload.mode = 'overwrite'
    return executeAction('/api/write-file', payload)
  }

  if (changeType === 'patch') {
    payload.find = body.find
    payload.replace = body.replace
    payload.allowMultiple = body.allowMultiple ?? false
    return executeAction('/api/patch-file', payload)
  }

  throw new Error('Invalid changeType')
}
