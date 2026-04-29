import type { FormEvent, RefObject } from 'react'
import type { KnowledgeSource } from '@buildflow/shared'
import {
  getSourceActiveClassName,
  getSourceEnabledClassName,
  getSourceIndexStatusClassName,
  getSourceIndexStatusLabel
} from '../helpers'

type KnowledgeSourcesPanelProps = {
  sources: KnowledgeSource[]
  loading: boolean
  mutationLoading: boolean
  mutationError: string | null
  mutationNotice: string | null
  sourcePath: string
  sourceLabel: string
  sourceId: string
  activeSourceIds: string[]
  onAddSourceSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSourcePathChange: (value: string) => void
  onSourceLabelChange: (value: string) => void
  onSourceIdChange: (value: string) => void
  onToggleActiveSource: (sourceId: string) => void
  onToggleEnabled: (sourceId: string, nextEnabled: boolean) => void
  onReindexSource: (source: KnowledgeSource) => void
  onRemoveSource: (source: KnowledgeSource) => void
  addSourceFormRef: RefObject<HTMLFormElement>
}

export function KnowledgeSourcesPanel({
  sources,
  loading,
  mutationLoading,
  mutationError,
  mutationNotice,
  sourcePath,
  sourceLabel,
  sourceId,
  activeSourceIds,
  onAddSourceSubmit,
  onSourcePathChange,
  onSourceLabelChange,
  onSourceIdChange,
  onToggleActiveSource,
  onToggleEnabled,
  onReindexSource,
  onRemoveSource,
  addSourceFormRef
}: KnowledgeSourcesPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-5 lg:p-6">
      <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Sources</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Connected local folders, indexes, and source state.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
            {sources.length} total
          </div>
        </div>

        <form ref={addSourceFormRef} onSubmit={onAddSourceSubmit} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40 md:grid-cols-[1.2fr_1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Path *</span>
            <input
              value={sourcePath}
              onChange={e => onSourcePathChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
              placeholder="~/notes"
              disabled={mutationLoading}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Label</span>
            <input
              value={sourceLabel}
              onChange={e => onSourceLabelChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
              placeholder="My Notes"
              disabled={mutationLoading}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">ID</span>
            <input
              value={sourceId}
              onChange={e => onSourceIdChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
              placeholder="my-notes"
              disabled={mutationLoading}
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={mutationLoading}
              className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {mutationLoading ? 'Working...' : 'Add source'}
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Source actions stay inline and use the agent directly.</span>
          {mutationError ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {mutationError}
            </span>
          ) : null}
          {mutationNotice ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              {mutationNotice}
            </span>
          ) : null}
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Source list</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Compact rows with source state and overflow actions.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
            {sources.filter(source => source.enabled).length} enabled
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500 dark:border-slate-700 dark:border-t-slate-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading sources...</p>
              </div>
            </div>
          ) : sources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-950/30">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">No knowledge sources connected yet</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Connect a local folder to start indexing content for ChatGPT.</p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                buildflow connect &lt;path&gt;
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[minmax(0,1.6fr)_8rem_6.5rem_6rem_7rem_3rem] gap-2 border-b border-slate-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>Source</span>
                <span>Status / files</span>
                <span>Enabled</span>
                <span>Active</span>
                <span>Access</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {sources.map(source => {
                  const isActive = activeSourceIds.includes(source.id)
                  const actions = [
                    {
                      label: isActive ? 'Deactivate' : 'Activate',
                      disabled: mutationLoading || (!source.enabled && !isActive),
                      onClick: () => onToggleActiveSource(source.id)
                    },
                    {
                      label: source.enabled ? 'Disable' : 'Enable',
                      disabled: mutationLoading,
                      onClick: () => onToggleEnabled(source.id, !source.enabled)
                    },
                    {
                      label: source.indexStatus === 'indexing' ? 'Indexing...' : 'Reindex',
                      disabled: mutationLoading || !source.enabled || source.indexStatus === 'indexing',
                      onClick: () => onReindexSource(source)
                    },
                    {
                      label: 'Remove',
                      disabled: mutationLoading,
                      onClick: () => onRemoveSource(source)
                    }
                  ]

                  return (
                    <article key={source.id} className="grid grid-cols-[minmax(0,1.6fr)_8rem_6.5rem_6rem_7rem_3rem] items-center gap-2 px-3 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-950/30">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate font-medium text-slate-900 dark:text-slate-50">{source.label}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getSourceActiveClassName(isActive)}`}>
                            {isActive ? 'active' : 'inactive'}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{source.path}</p>
                      </div>
                      <div className="min-w-0 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className={`inline-flex rounded-full px-2 py-1 font-medium ${getSourceIndexStatusClassName(source.indexStatus)}`}>
                          {getSourceIndexStatusLabel(source)}
                        </div>
                        <div className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">{source.id}</div>
                      </div>
                      <div className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${getSourceEnabledClassName(source.enabled)}`}>
                        {source.enabled ? 'Enabled' : 'Disabled'}
                      </div>
                      <div className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${getSourceActiveClassName(isActive)}`}>
                        {isActive ? 'Active' : 'Idle'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {source.indexStatus === 'ready' ? 'Read' : 'Sync'}
                      </div>
                      <details className="relative justify-self-end">
                        <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                          <span aria-hidden="true" className="text-base leading-none">⋯</span>
                        </summary>
                        <div className="absolute right-0 top-10 z-10 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                          {actions.map(action => (
                            <button
                              key={action.label}
                              type="button"
                              disabled={action.disabled}
                              onClick={action.onClick}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </details>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
