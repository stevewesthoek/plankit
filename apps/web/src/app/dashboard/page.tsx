'use client'

import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { KnowledgeSource, WriteMode, ActiveSourcesMode } from '@buildflow/shared'
import {
  getAgentHealthLabel,
  getAgentHealthClassName,
  getSourceEnabledClassName,
  getSourceIndexStatusClassName,
  getSourceIndexStatusLabel,
  getSourceActiveClassName
} from './helpers'

const TERMINAL_INDEX_STATUSES = new Set(['ready', 'failed', 'disabled'])

export default function Dashboard() {
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">BuildFlow Dashboard</h1>

        {/* Connected Agent Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Connected Agent</h2>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getAgentHealthClassName(agentConnected)}`} />
            <span className="text-gray-700">
              {getAgentHealthLabel(agentConnected)}
            </span>
          </div>
        </div>

        {/* Knowledge Sources Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Knowledge Sources</h2>
          <p className="text-gray-600 text-sm mb-6">
            Configured knowledge sources that are searched and read together through ChatGPT.
          </p>
          {error ? (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-4 text-red-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Unable to load sources</p>
                  <p className="text-sm">{error}</p>
                  {loadErrorDetail ? <p className="text-xs mt-1 text-red-700">{loadErrorDetail}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => fetchSources()}
                  className="rounded bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  disabled={mutationLoading}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleAddSource} className="border border-gray-200 rounded-lg p-4 mb-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Add Knowledge Source</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Path *</span>
                  <input
                    value={sourcePath}
                    onChange={e => setSourcePath(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="~/notes"
                    disabled={mutationLoading}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Label</span>
                  <input
                    value={sourceLabel}
                    onChange={e => setSourceLabel(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="My Notes"
                    disabled={mutationLoading}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">ID</span>
                  <input
                    value={sourceId}
                    onChange={e => setSourceId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="my-notes"
                    disabled={mutationLoading}
                  />
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={mutationLoading}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {mutationLoading ? 'Working...' : 'Add source'}
            </button>
            {mutationError ? <p className="text-sm text-red-700">{mutationError}</p> : null}
            {mutationNotice ? <p className="text-sm text-emerald-700">{mutationNotice}</p> : null}
          </form>

          {loading ? (
            <div className="text-gray-500">Loading sources...</div>
          ) : sources.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center text-gray-500">
              No knowledge sources configured. Run: <code className="text-gray-700 font-mono">buildflow connect &lt;path&gt;</code>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map(source => (
                <div key={source.id} className="border border-gray-200 rounded p-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{source.label}</div>
                    <div className="text-sm text-gray-600 font-mono">{source.path}</div>
                    <div className="text-xs text-gray-500 mt-1">ID: {source.id}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded text-xs font-semibold ${getSourceEnabledClassName(source.enabled)}`}>
                      {source.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                    <div className={`px-3 py-1 rounded text-xs font-semibold ${getSourceIndexStatusClassName(source.indexStatus)}`}>
                      {getSourceIndexStatusLabel(source)}
                    </div>
                    <div className={`px-3 py-1 rounded text-xs font-semibold ${getSourceActiveClassName(activeSourceIds.includes(source.id))}`}>
                      {activeSourceIds.includes(source.id) ? 'Active' : 'Inactive'}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={mutationLoading || !source.enabled}
                        onClick={() => toggleActiveSource(source.id)}
                        className="rounded border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 disabled:opacity-50"
                      >
                        Toggle Active
                      </button>
                      <button
                        type="button"
                        disabled={mutationLoading}
                        onClick={() => mutateSources('/api/agent/sources/toggle', { sourceId: source.id, enabled: !source.enabled })}
                        className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
                      >
                        {source.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        disabled={mutationLoading || !source.enabled || source.indexStatus === 'indexing'}
                        onClick={() => handleReindexSource(source)}
                        className="rounded border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 disabled:opacity-50"
                      >
                        {source.indexStatus === 'indexing' ? 'Indexing...' : 'Reindex'}
                      </button>
                      <button
                        type="button"
                        disabled={mutationLoading}
                        onClick={() => {
                          if (window.confirm(`Remove knowledge source "${source.label}"?`)) {
                            mutateSources('/api/agent/sources/remove', { sourceId: source.id })
                          }
                        }}
                        className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Execution Mode Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-2">Execution Modes</h2>
          <p className="text-blue-800 text-sm">
            BuildFlow supports two execution modes for ChatGPT Actions:
          </p>
          <ul className="text-blue-800 text-sm space-y-1 mt-3 ml-4">
            <li>• <strong>direct-agent (default):</strong> Web app calls local agent directly on port 3052</li>
            <li>• <strong>relay-agent (Phase 5C+):</strong> Web app calls relay on port 3053, which routes to agent via WebSocket. Requires matching RELAY_PROXY_TOKEN on both sides.</li>
          </ul>
          <p className="text-blue-700 text-xs mt-3">
            Set mode via <code className="bg-blue-100 px-1 rounded">BUILDFLOW_BACKEND_MODE</code> environment variable.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Active Context</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button className={`px-3 py-1 rounded text-sm ${activeMode === 'single' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`} onClick={() => handleSetMode('single')} type="button">single</button>
            <button className={`px-3 py-1 rounded text-sm ${activeMode === 'multi' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`} onClick={() => handleSetMode('multi')} type="button">multi</button>
            <button className={`px-3 py-1 rounded text-sm ${activeMode === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`} onClick={() => handleSetMode('all')} type="button">all</button>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Enabled sources show their index status. Use Reindex after enabling a source before expecting search results.
          </div>
          <div className="text-sm text-gray-600">Active source ids: {activeSourceIds.length > 0 ? activeSourceIds.join(', ') : 'all enabled sources'}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={`px-3 py-1 rounded text-sm ${writeMode === 'readOnly' ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`} onClick={() => handleWriteMode('readOnly')}>readOnly</button>
            <button type="button" className={`px-3 py-1 rounded text-sm ${writeMode === 'artifactsOnly' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100'}`} onClick={() => handleWriteMode('artifactsOnly')}>artifactsOnly</button>
            <button type="button" className={`px-3 py-1 rounded text-sm ${writeMode === 'safeWrites' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`} onClick={() => handleWriteMode('safeWrites')}>safeWrites</button>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Getting Started</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Install and Initialize</h3>
              <code className="bg-gray-100 p-3 rounded block text-sm mb-2">npm install -g buildflow</code>
              <code className="bg-gray-100 p-3 rounded block text-sm">buildflow init</code>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Add Knowledge Sources</h3>
              <p className="text-gray-600 text-sm mb-2">Connect local folders to search and read from:</p>
              <code className="bg-gray-100 p-3 rounded block text-sm mb-2">buildflow connect ~/my-vault</code>
              <p className="text-gray-600 text-xs">Repeat to add multiple sources (Brain, Mind, docs, etc.)</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Start the Agent</h3>
              <code className="bg-gray-100 p-3 rounded block text-sm">buildflow serve</code>
              <p className="text-gray-600 text-xs mt-2">Agent listens on http://127.0.0.1:3052</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">4. Configure ChatGPT Custom Actions</h3>
              <p className="text-gray-600 text-sm">
                Import the OpenAPI schema and set Bearer token authentication. All configured sources will be searched together.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
