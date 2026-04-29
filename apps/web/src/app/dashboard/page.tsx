'use client'

import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import type { KnowledgeSource, WriteMode, ActiveSourcesMode } from '@buildflow/shared'
import { DashboardTopBar } from './components/DashboardTopBar'
import { DashboardShell } from './components/DashboardShell'
import { DashboardOverview } from './components/DashboardOverview'
import { PlanPlaceholderPanel } from './components/PlanPlaceholderPanel'
import { ExecutionFlowPreview } from './components/ExecutionFlowPreview'
import { ExecutionHandoffPanel } from './components/ExecutionHandoffPanel'
import { KnowledgeSourcesPanel } from './components/KnowledgeSourcesPanel'
import { ActiveContextPanel } from './components/ActiveContextPanel'
import { InfoPanels } from './components/InfoPanels'
import { InsightPanel } from './components/InsightPanel'
import { DashboardRail } from './components/DashboardRail'
import { DashboardActivityFeed } from './components/DashboardActivityFeed'
import { DashboardButton } from './components/ui/DashboardButton'
import { DashboardPanel } from './components/ui/DashboardPanel'
import { DashboardCodeText } from './components/ui/DashboardCodeText'

type DashboardSection = 'overview' | 'sources' | 'activity' | 'plan' | 'handoff' | 'settings'

const TERMINAL_INDEX_STATUSES = new Set(['ready', 'failed', 'disabled'])

type FetchSourcesOptions = {
  blocking?: boolean
}

type DashboardSourceSnapshot = {
  sources: KnowledgeSource[]
  activeMode: ActiveSourcesMode
  activeSourceIds: string[]
  writeMode: WriteMode
  savedAt: string
}

const DASHBOARD_SOURCE_CACHE_KEY = 'buildflow-dashboard-source-snapshot'

type DashboardActivityEntry = {
  title: string
  detail: string
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}

const SECTION_LABELS: Record<DashboardSection, string> = {
  overview: 'Overview',
  sources: 'Sources',
  activity: 'Activity',
  plan: 'Plans',
  handoff: 'Handoff',
  settings: 'Settings'
}

const sleep = (ms: number) => new Promise(resolve => globalThis.setTimeout(resolve, ms))

const getAgentErrorMessage = (data: Record<string, unknown> | null | undefined, fallback: string) => {
  const error = typeof data?.error === 'string' ? data.error : fallback
  const detail = typeof data?.details === 'string' ? data.details : typeof data?.detail === 'string' ? data.detail : ''
  return `${error}${detail ? ` ${detail}` : ''}`.trim()
}

const readSourceSnapshot = (): DashboardSourceSnapshot | null => {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_SOURCE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DashboardSourceSnapshot>
    if (!Array.isArray(parsed.sources)) return null
    return {
      sources: parsed.sources,
      activeMode: parsed.activeMode || 'all',
      activeSourceIds: Array.isArray(parsed.activeSourceIds) ? parsed.activeSourceIds : [],
      writeMode: parsed.writeMode || 'safeWrites',
      savedAt: parsed.savedAt || new Date(0).toISOString()
    }
  } catch {
    return null
  }
}

const saveSourceSnapshot = (snapshot: DashboardSourceSnapshot) => {
  try {
    window.localStorage.setItem(DASHBOARD_SOURCE_CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    // Local storage is a convenience cache only. Ignore quota/private-mode failures.
  }
}

const buildActivityEntries = (args: {
  loading: boolean
  error: string | null
  mutationError: string | null
  mutationNotice: string | null
  sources: KnowledgeSource[]
  agentConnected: boolean
  activeMode: ActiveSourcesMode
  writeMode: WriteMode
}): DashboardActivityEntry[] => {
  const readyCount = args.sources.filter(source => source.enabled && source.indexStatus === 'ready').length
  const indexingCount = args.sources.filter(source => source.enabled && source.indexStatus === 'indexing').length
  const failedCount = args.sources.filter(source => source.enabled && source.indexStatus === 'failed').length
  const entries: DashboardActivityEntry[] = []

  if (args.loading) {
    entries.push({ title: 'Loading workspace', detail: 'BuildFlow is fetching the latest source, context, and write-mode state.', tone: 'neutral' })
  } else if (args.agentConnected) {
    entries.push({ title: 'Agent connected', detail: 'The local agent is available and the dashboard can refresh source state.', tone: 'good' })
  } else {
    entries.push({ title: 'Agent unavailable', detail: 'BuildFlow could not reach the local agent right now.', tone: 'warn' })
  }

  const sourceSummary =
    indexingCount > 0
      ? 'Some sources are still indexing.'
      : failedCount > 0
        ? 'Some sources need attention.'
        : readyCount > 0
          ? 'Sources are ready.'
          : 'No sources are connected yet.'
  entries.push({ title: 'Source summary', detail: sourceSummary, tone: readyCount > 0 ? 'good' : indexingCount > 0 ? 'warn' : 'neutral' })
  entries.push({ title: 'Context mode', detail: `Active context is set to ${args.activeMode}.`, tone: 'neutral' })
  entries.push({ title: 'Write mode', detail: `Current write mode: ${args.writeMode}.`, tone: 'neutral' })

  if (args.mutationNotice) {
    entries.unshift({ title: 'Dashboard notice', detail: args.mutationNotice, tone: 'good' })
  }

  if (args.mutationError) {
    entries.unshift({ title: 'Source action error', detail: args.mutationError, tone: 'bad' })
  }

  if (args.error) {
    entries.unshift({ title: 'Source refresh issue', detail: args.error, tone: 'warn' })
  }

  return entries.slice(0, 8)
}

const fetchJsonWithRetry = async (url: string, attempts = 3): Promise<{ response: Response; data: Record<string, unknown> }> => {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { cache: 'no-store' })
      const data = await response.json().catch(() => ({})) as Record<string, unknown>
      if ([502, 503, 504].includes(response.status) && attempt < attempts) {
        await sleep(350 * attempt)
        continue
      }
      return { response, data }
    } catch (err) {
      lastError = err
      if (attempt < attempts) {
        await sleep(350 * attempt)
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

const getMutationErrorMessage = (data: any, err: unknown, fallback: string) => {
  const fromData = typeof data?.userMessage === 'string'
    ? data.userMessage
    : typeof data?.message === 'string'
      ? data.message
      : typeof data?.error === 'string'
        ? data.error
        : ''
  if (fromData) return fromData
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err) return err
  return fallback
}

export default function Dashboard() {
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [agentConnected, setAgentConnected] = useState(false)
  const [sourcePath, setSourcePath] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [mutationLoading, setMutationLoading] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [mutationNotice, setMutationNotice] = useState<string | null>(null)
  const [loadErrorDetail, setLoadErrorDetail] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<ActiveSourcesMode>('all')
  const [activeSourceIds, setActiveSourceIds] = useState<string[]>([])
  const [writeMode, setWriteMode] = useState<WriteMode>('safeWrites')
  const [handoffCopyStatus, setHandoffCopyStatus] = useState<'idle' | 'codex-copied' | 'claude-copied' | 'error'>('idle')
  const [activeDashboardSection, setActiveDashboardSection] = useState<DashboardSection>('overview')
  const [showAddSourceForm, setShowAddSourceForm] = useState(false)

  const addSourceFormRef = useRef<HTMLFormElement>(null)
  const snapshotRef = useRef<DashboardSourceSnapshot | null>(null)
  const themeInitializedRef = useRef(false)
  const snapshotHydratedRef = useRef(false)

  const codexPrompt = `Review the current BuildFlow dashboard implementation.
Check DESIGN.md for design system principles.
Preserve all API routes, Custom GPT schema, and existing endpoint contracts.
Follow the task order in docs/product/tasks/v1.2-dashboard.md.
Implement the next scoped dashboard task with clean, minimal changes.
Run type-check and build verification after changes.`

  const claudeCodePrompt = `Work in the local BuildFlow repo.
Follow DESIGN.md for design principles and brand consistency.
Maintain the fixed-viewport dashboard architecture; no page scroll.
Run pnpm type-check and pnpm build after changes.
Verify OpenAPI health: curl http://127.0.0.1:3054/api/openapi
Keep all services healthy on ports 3052, 3053, 3054.`

  const copyToClipboard = async (text: string, status: 'codex-copied' | 'claude-copied') => {
    try {
      await navigator.clipboard.writeText(text)
      setHandoffCopyStatus(status)
      setTimeout(() => setHandoffCopyStatus('idle'), 2000)
    } catch {
      setHandoffCopyStatus('error')
      setTimeout(() => setHandoffCopyStatus('idle'), 2000)
    }
  }

  const fetchSources = async (options: FetchSourcesOptions = {}) => {
    const snapshot = snapshotRef.current
    const blocking = options.blocking ?? (!snapshot && sources.length === 0)
    let fetchedSources: KnowledgeSource[] = snapshot?.sources ?? sources
    let fetchedActiveMode: ActiveSourcesMode = snapshot?.activeMode ?? activeMode
    let fetchedActiveIds: string[] = snapshot?.activeSourceIds ?? activeSourceIds
    let fetchedWriteMode: WriteMode = snapshot?.writeMode ?? writeMode
    try {
      setError(null)
      setLoadErrorDetail(null)
      const { response, data } = await fetchJsonWithRetry('/api/agent/sources')
      if (!response.ok) {
        throw new Error(getAgentErrorMessage(data, `Failed to fetch sources: ${response.status}`))
      }

      fetchedSources = Array.isArray(data.sources) ? data.sources as KnowledgeSource[] : []
      setSources(fetchedSources)
      setAgentConnected(true)
      const { response: activeResponse, data: activeData } = await fetchJsonWithRetry('/api/agent/active-sources')
      if (!activeResponse.ok) {
        setMutationNotice(getAgentErrorMessage(activeData, `Active source state was not refreshed: ${activeResponse.status}`))
      } else {
        fetchedActiveMode = (activeData.mode as ActiveSourcesMode) || 'all'
        fetchedActiveIds = Array.isArray(activeData.activeSourceIds) ? activeData.activeSourceIds as string[] : []
        setActiveMode(fetchedActiveMode)
        setActiveSourceIds(fetchedActiveIds)
      }
      const { response: writeResponse, data: writeData } = await fetchJsonWithRetry('/api/agent/write-mode')
      if (!writeResponse.ok) {
        setMutationNotice(getAgentErrorMessage(writeData, `Write mode was not refreshed: ${writeResponse.status}`))
      } else {
        fetchedWriteMode = (writeData.writeMode as WriteMode) || 'safeWrites'
        setWriteMode(fetchedWriteMode)
      }
      const nextSnapshot: DashboardSourceSnapshot = {
        sources: fetchedSources,
        activeMode: fetchedActiveMode,
        activeSourceIds: fetchedActiveIds,
        writeMode: fetchedWriteMode,
        savedAt: new Date().toISOString()
      }
      snapshotRef.current = nextSnapshot
      saveSourceSnapshot(nextSnapshot)
      setAgentConnected(true)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setLoadErrorDetail(message)
      if (blocking && !snapshotRef.current) {
        setError('Unable to load sources')
      } else {
        setError(null)
        setMutationNotice(
          `BuildFlow agent was briefly unavailable while refreshing source state. Retry refresh if this does not update. ${message}`
        )
      }
      if (fetchedSources.length > 0) {
        setSources(fetchedSources)
      }
      setActiveMode(fetchedActiveMode)
      setActiveSourceIds(fetchedActiveIds)
      setWriteMode(fetchedWriteMode)
      setAgentConnected(false)
      return false
    } finally {
      setLoading(false)
    }
  }

  const toggleActiveSource = async (sourceId: string) => {
    const next = activeSourceIds.includes(sourceId)
      ? activeSourceIds.filter(id => id !== sourceId)
      : [...activeSourceIds, sourceId]
    await mutateSources('/api/agent/active-sources', { mode: next.length > 1 ? 'multi' : 'single', activeSourceIds: next })
  }

  useEffect(() => {
    if (snapshotHydratedRef.current) return
    snapshotHydratedRef.current = true

    const snapshot = readSourceSnapshot()
    snapshotRef.current = snapshot
    if (snapshot) {
      setSources(snapshot.sources)
      setActiveMode(snapshot.activeMode)
      setActiveSourceIds(snapshot.activeSourceIds)
      setWriteMode(snapshot.writeMode)
      setAgentConnected(true)
      setError(null)
      setLoadErrorDetail(null)
      setLoading(false)
    }

    void fetchSources({ blocking: !snapshot })
  }, [])

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('buildflow-dashboard-theme')
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : preferredTheme)
    themeInitializedRef.current = true
  }, [])

  useEffect(() => {
    if (!themeInitializedRef.current) return
    window.localStorage.setItem('buildflow-dashboard-theme', theme)
  }, [theme])

  const handleToggleTheme = () => {
    setTheme(current => (current === 'dark' ? 'light' : 'dark'))
  }

  const mutateSources = async (url: string, payload: Record<string, unknown>) => {
    setMutationLoading(true)
    setMutationError(null)
    setMutationNotice(null)

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(getMutationErrorMessage(data, null, `Request failed: ${response.status}`))
      }

      const refreshed = await fetchSources({ blocking: false })
      if (refreshed) {
        setMutationNotice('Source changes were applied and the dashboard refreshed.')
      }
      return true
    } catch (err) {
      setMutationError(getMutationErrorMessage(null, err, 'Source action failed'))
      if (url === '/api/agent/sources/toggle' || url === '/api/agent/sources/reindex' || url === '/api/agent/sources/add' || url === '/api/agent/sources/remove' || url === '/api/agent/active-sources' || url === '/api/agent/write-mode') {
        void fetchSources({ blocking: false }).catch(() => {})
      }
      return false
    } finally {
      setMutationLoading(false)
    }
  }

  const waitForTerminalIndexStatus = async (sourceId: string, timeoutMs = 60000) => {
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeoutMs) {
      let response: Response
      let data: Record<string, unknown>
      try {
        ({ response, data } = await fetchJsonWithRetry('/api/agent/sources'))
      } catch (err) {
        const remaining = timeoutMs - (Date.now() - startedAt)
        if (remaining <= 0) break
        setMutationNotice('Reindex is still running; source refresh was temporarily unavailable.')
        await sleep(Math.min(1500, remaining))
        continue
      }

      if (!response.ok) {
        if ([502, 503, 504].includes(response.status)) {
          const remaining = timeoutMs - (Date.now() - startedAt)
          if (remaining <= 0) break
          setMutationNotice('Reindex is still running; source refresh was temporarily unavailable.')
          await sleep(Math.min(1500, remaining))
          continue
        }
        throw new Error(getMutationErrorMessage(data, null, `Failed to refresh sources: ${response.status}`))
      }

      const nextSources = Array.isArray(data.sources) ? (data.sources as KnowledgeSource[]) : []
      setSources(nextSources)

      const current = nextSources.find(source => source.id === sourceId)
      if (!current) {
        throw new Error(`Source not found after reindex: ${sourceId}`)
      }

      if (TERMINAL_INDEX_STATUSES.has(current.indexStatus || 'unknown')) {
        if (typeof data.activeMode === 'string') {
          setActiveMode(data.activeMode as ActiveSourcesMode)
        }
        if (Array.isArray(data.activeSourceIds)) {
          setActiveSourceIds(data.activeSourceIds)
        }
        return current
      }

      setMutationNotice(`Reindexing ${current.label || sourceId}... (${current.indexStatus || 'unknown'})`)
      await sleep(1500)
    }

    throw new Error(`Reindex timed out after ${Math.round(timeoutMs / 1000)}s for source ${sourceId}`)
  }

  const handleReindexSource = async (source: KnowledgeSource) => {
    setMutationError(null)
    setMutationNotice(null)

    const success = await mutateSources('/api/agent/sources/reindex', { sourceId: source.id })
    if (!success) return

    try {
      await waitForTerminalIndexStatus(source.id)
      setMutationNotice(`Reindex complete for ${source.label}`)
    } catch (err) {
      setMutationError(null)
      setMutationNotice(String(err))
    }
  }

  const handleAddSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!sourcePath.trim()) {
      setMutationError('Knowledge source path is required')
      return
    }

    const success = await mutateSources('/api/agent/sources/add', {
      path: sourcePath.trim(),
      label: sourceLabel.trim() || undefined,
      id: sourceId.trim() || undefined
    })

    if (success) {
      setSourcePath('')
      setSourceLabel('')
      setSourceId('')
      setShowAddSourceForm(false)
    }
  }

  const handleSetMode = async (mode: ActiveSourcesMode) => {
    const enabledCount = sources.filter(source => source.enabled).length
    if ((mode === 'single' || mode === 'multi') && enabledCount === 0) {
      setMutationError(`Cannot set ${mode} mode while no sources are enabled`)
      return
    }
    const nextIds = mode === 'all' ? [] : activeSourceIds.slice(0, mode === 'single' ? 1 : Math.max(activeSourceIds.length, 1))
    await mutateSources('/api/agent/active-sources', { mode, activeSourceIds: nextIds })
  }

  const handleWriteMode = async (nextMode: WriteMode) => {
    await mutateSources('/api/agent/write-mode', { writeMode: nextMode })
  }

  const currentSectionLabel = SECTION_LABELS[activeDashboardSection]
  const topBarStatusText = mutationError || mutationNotice || error
  const activityEntries = buildActivityEntries({
    loading,
    error,
    mutationError,
    mutationNotice,
    sources,
    agentConnected,
    activeMode,
    writeMode
  })

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="h-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
        <DashboardTopBar
          currentSectionLabel={currentSectionLabel}
          agentConnected={agentConnected}
          statusText={topBarStatusText}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onRefresh={() => fetchSources({ blocking: false })}
        />
        <DashboardShell
          leftRail={<DashboardRail activeSection={activeDashboardSection} sources={sources} onSelectSection={setActiveDashboardSection} />}
          mainContent={
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
              {error && (
                <div className="px-5 pt-4 lg:px-6">
                  <DashboardPanel className="border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold">Unable to load sources</div>
                        <p className="mt-1 text-xs text-red-700 dark:text-red-200">{error}</p>
                        {loadErrorDetail && <p className="mt-1 text-[11px] text-red-600 dark:text-red-300"><DashboardCodeText className="break-words text-[11px] text-red-600 dark:text-red-300">{loadErrorDetail}</DashboardCodeText></p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <DashboardButton type="button" onClick={() => fetchSources()} disabled={mutationLoading} variant="secondary" className="border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-900 dark:text-red-200 dark:hover:bg-slate-800">
                          Retry load
                        </DashboardButton>
                      </div>
                    </div>
                  </DashboardPanel>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-4">
                  {activeDashboardSection === 'overview' && (
                    <DashboardOverview
                      loading={loading}
                      agentConnected={agentConnected}
                      sources={sources}
                      writeMode={writeMode}
                      onManageSources={() => setActiveDashboardSection('sources')}
                      onOpenHandoff={() => setActiveDashboardSection('handoff')}
                    />
                  )}

                  {activeDashboardSection === 'sources' && (
                    <KnowledgeSourcesPanel
                      sources={sources}
                      loading={loading}
                      mutationLoading={mutationLoading}
                      mutationError={mutationError}
                      mutationNotice={mutationNotice}
                      showAddSourceForm={showAddSourceForm}
                      sourcePath={sourcePath}
                      sourceLabel={sourceLabel}
                      sourceId={sourceId}
                      activeSourceIds={activeSourceIds}
                      onAddSourceSubmit={handleAddSource}
                      onSourcePathChange={setSourcePath}
                      onSourceLabelChange={setSourceLabel}
                      onSourceIdChange={setSourceId}
                      onToggleActiveSource={toggleActiveSource}
                      onToggleEnabled={(sourceId, nextEnabled) => mutateSources('/api/agent/sources/toggle', { sourceId, enabled: nextEnabled })}
                      onReindexSource={handleReindexSource}
                      onRemoveSource={(source) => {
                        if (window.confirm(`Remove knowledge source "${source.label}"?`)) {
                          mutateSources('/api/agent/sources/remove', { sourceId: source.id })
                        }
                      }}
                      onToggleAddSourceForm={() => setShowAddSourceForm(prev => !prev)}
                      addSourceFormRef={addSourceFormRef}
                    />
                  )}

                  {activeDashboardSection === 'activity' && (
                    <DashboardActivityFeed
                      entries={activityEntries}
                      emptyMessage="BuildFlow activity will appear here."
                    />
                  )}

                  {activeDashboardSection === 'plan' && (
                    <div className="space-y-4">
                      <PlanPlaceholderPanel sources={sources} agentConnected={agentConnected} />
                      <ExecutionFlowPreview />
                    </div>
                  )}

                  {activeDashboardSection === 'handoff' && (
                    <ExecutionHandoffPanel
                      codexPrompt={codexPrompt}
                      claudeCodePrompt={claudeCodePrompt}
                      handoffCopyStatus={handoffCopyStatus}
                      onCopyCodex={() => copyToClipboard(codexPrompt, 'codex-copied')}
                      onCopyClaude={() => copyToClipboard(claudeCodePrompt, 'claude-copied')}
                    />
                  )}

                  {activeDashboardSection === 'settings' && (
                    <div className="space-y-4 overflow-y-auto pr-1">
                      <ActiveContextPanel activeMode={activeMode} writeMode={writeMode} activeSourceIds={activeSourceIds} onSetMode={handleSetMode} onSetWriteMode={handleWriteMode} />
                      <InfoPanels />
                    </div>
                  )}
                </div>
            </div>
          }
          rightPanel={
            <InsightPanel
              loading={loading}
              error={error}
              section={activeDashboardSection}
              activeMode={activeMode}
              writeMode={writeMode}
              agentConnected={agentConnected}
              activityEntries={activityEntries}
            />
          }
        />
      </div>
    </div>
  )
}
