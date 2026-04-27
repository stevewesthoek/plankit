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

const TERMINAL_INDEX_STATUSES = new Set(['ready', 'failed', 'disabled'])

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

  const knowledgeSourcesRef = useRef<HTMLDivElement>(null)
  const addSourceFormRef = useRef<HTMLFormElement>(null)
  const themeInitializedRef = useRef(false)

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

  const fetchSources = async () => {
    let fetchedSources: KnowledgeSource[] = sources
    let fetchedActiveMode: ActiveSourcesMode = activeMode
    let fetchedActiveIds: string[] = activeSourceIds
    let fetchedWriteMode: WriteMode = writeMode
    try {
      setError(null)
      setLoadErrorDetail(null)
      const response = await fetch('/api/agent/sources', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = data?.details ? ` ${data.details}` : data?.detail ? ` ${data.detail}` : ''
        throw new Error(`${data?.error || `Failed to fetch sources: ${response.status}`}${detail}`.trim())
      }

      fetchedSources = data.sources || []
      setSources(fetchedSources)
      setAgentConnected(true)
      const activeResponse = await fetch('/api/agent/active-sources', { cache: 'no-store' })
      const activeData = await activeResponse.json().catch(() => ({}))
      if (!activeResponse.ok) {
        const detail = activeData?.details ? ` ${activeData.details}` : activeData?.detail ? ` ${activeData.detail}` : ''
        setLoadErrorDetail(`${activeData?.error || `Failed to fetch active sources: ${activeResponse.status}`}${detail}`.trim())
        setActiveMode('all')
        setActiveSourceIds([])
      } else {
        fetchedActiveMode = activeData.mode || 'all'
        fetchedActiveIds = activeData.activeSourceIds || []
        setActiveMode(fetchedActiveMode)
        setActiveSourceIds(fetchedActiveIds)
      }
      const writeResponse = await fetch('/api/agent/write-mode', { cache: 'no-store' })
      const writeData = await writeResponse.json().catch(() => ({}))
      if (!writeResponse.ok) {
        const detail = writeData?.details ? ` ${writeData.details}` : writeData?.detail ? ` ${writeData.detail}` : ''
        setLoadErrorDetail(`${writeData?.error || `Failed to fetch write mode: ${writeResponse.status}`}${detail}`.trim())
        fetchedWriteMode = 'safeWrites'
        setWriteMode(fetchedWriteMode)
      } else {
        fetchedWriteMode = writeData.writeMode || 'safeWrites'
        setWriteMode(fetchedWriteMode)
      }
      setAgentConnected(true)
    } catch (err) {
      setLoadErrorDetail(String(err))
      setError('Unable to load sources')
      if (fetchedSources.length > 0) {
        setSources(fetchedSources)
      }
      setActiveMode(fetchedActiveMode)
      setActiveSourceIds(fetchedActiveIds)
      setWriteMode(fetchedWriteMode)
      setAgentConnected(false)
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
    fetchSources()
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
        const details = data?.details ? ` ${data.details}` : ''
        throw new Error(`${data?.error || `Request failed: ${response.status}`}${details}`.trim())
      }

      await fetchSources()
      return true
    } catch (err) {
      setMutationError(String(err))
      if (url === '/api/agent/sources/toggle' || url === '/api/agent/sources/reindex' || url === '/api/agent/sources/add' || url === '/api/agent/sources/remove' || url === '/api/agent/active-sources' || url === '/api/agent/write-mode') {
        await fetchSources().catch(() => {})
      }
      return false
    } finally {
      setMutationLoading(false)
    }
  }

  const waitForTerminalIndexStatus = async (sourceId: string, timeoutMs = 60000) => {
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeoutMs) {
      const response = await fetch('/api/agent/sources', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(`${data?.error || `Failed to refresh sources: ${response.status}`}`)
      }

      const nextSources: KnowledgeSource[] = data.sources || []
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
      await new Promise(resolve => window.setTimeout(resolve, 1500))
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

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="h-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
        <DashboardTopBar
          agentConnected={agentConnected}
          mutationError={mutationError}
          mutationNotice={mutationNotice}
          error={error}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        <DashboardShell
          leftRail={
            <div className="w-80 border-r border-slate-200 bg-slate-50 overflow-y-auto dark:border-slate-800 dark:bg-slate-950">
              <div className="p-6 space-y-8">
                <div>
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4 dark:text-slate-400">Navigation</h2>
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-sm text-slate-700 rounded-md hover:bg-slate-100 cursor-pointer transition-colors dark:text-slate-300 dark:hover:bg-slate-900">Overview</div>
                    <div className="px-3 py-2 text-sm text-slate-700 rounded-md hover:bg-slate-200 bg-slate-100 cursor-pointer transition-colors font-medium dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800">Sources</div>
                    <div className="px-3 py-2 text-sm text-slate-700 rounded-md hover:bg-slate-100 cursor-pointer transition-colors dark:text-slate-300 dark:hover:bg-slate-900">Settings</div>
                  </div>
                </div>
              </div>
            </div>
          }
          mainContent={
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8 max-w-none">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-red-900 text-sm">Unable to Load Sources</h3>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                        {loadErrorDetail && (
                          <p className="text-red-600 text-xs mt-2 font-mono bg-red-100 px-2 py-1 rounded">{loadErrorDetail}</p>
                        )}
                        <p className="text-red-700 text-xs mt-3">
                          Check that the BuildFlow agent is running: <code className="bg-red-100 px-1 rounded font-mono">buildflow serve</code>
                        </p>
                      </div>
                      <button type="button" onClick={() => fetchSources()} disabled={mutationLoading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 shrink-0 hover:bg-red-700 transition-colors">
                        Retry
                      </button>
                    </div>
                  </div>
                )}
                <DashboardOverview
                  loading={loading}
                  sources={sources}
                  activeMode={activeMode}
                  writeMode={writeMode}
                  onManageSources={() => knowledgeSourcesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  onAddSource={() => addSourceFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                />
                <PlanPlaceholderPanel sources={sources} agentConnected={agentConnected} />
                <ExecutionFlowPreview />
                <ExecutionHandoffPanel
                  codexPrompt={codexPrompt}
                  claudeCodePrompt={claudeCodePrompt}
                  handoffCopyStatus={handoffCopyStatus}
                  onCopyCodex={() => copyToClipboard(codexPrompt, 'codex-copied')}
                  onCopyClaude={() => copyToClipboard(claudeCodePrompt, 'claude-copied')}
                />
                <KnowledgeSourcesPanel
                  sources={sources}
                  loading={loading}
                  mutationLoading={mutationLoading}
                  mutationError={mutationError}
                  mutationNotice={mutationNotice}
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
                  addSourceFormRef={addSourceFormRef}
                />
                <ActiveContextPanel activeMode={activeMode} writeMode={writeMode} activeSourceIds={activeSourceIds} onSetMode={handleSetMode} onSetWriteMode={handleWriteMode} />
                <InfoPanels />
              </div>
            </div>
          }
          rightPanel={
            <InsightPanel
              loading={loading}
              error={error}
              sourceCount={sources.length}
            />
          }
        />
      </div>
    </div>
  )
}
