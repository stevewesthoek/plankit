import type { FormEvent, RefObject } from 'react'
import type { KnowledgeSource } from '@buildflow/shared'
import {
  getSourceIndexStatusClassName,
  getSourceIndexStatusLabel
} from '../helpers'

type KnowledgeSourcesPanelProps = {
  sources: KnowledgeSource[]
  loading: boolean
  mutationLoading: boolean
  mutationError: string | null
  mutationNotice: string | null
  showAddSourceForm: boolean
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
  onToggleAddSourceForm: () => void
  addSourceFormRef: RefObject<HTMLFormElement>
}

export function KnowledgeSourcesPanel({
  sources,
  loading,
  mutationLoading,
  mutationError,
  mutationNotice,
  showAddSourceForm,
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
  onToggleAddSourceForm,
  addSourceFormRef
}: KnowledgeSourcesPanelProps) {
  const shouldShowAddForm = sources.length === 0 || showAddSourceForm

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-5 lg:p-6">
      <section className="shrink-0 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Sources</h2>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {mutationError || mutationNotice || 'Connected local folders and source state.'}
            </div>
          </div>
          {sources.length > 0 ? (
            <button
              type="button"
              onClick={onToggleAddSourceForm}
              className="h-7 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {showAddSourceForm ? 'Hide add source' : 'Add source'}
            </button>
          ) : null}
        </div>
      </section>

      {shouldShowAddForm ? (
        <section className="shrink-0 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <form ref={addSourceFormRef} onSubmit={onAddSourceSubmit} className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Path *</span>
              <input
                value={sourcePath}
                onChange={e => onSourcePathChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
                placeholder="~/notes"
                disabled={mutationLoading}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Label</span>
              <input
                value={sourceLabel}
                onChange={e => onSourceLabelChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
                placeholder="My Notes"
                disabled={mutationLoading}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">ID</span>
              <input
                value={sourceId}
                onChange={e => onSourceIdChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
                placeholder="my-notes"
                disabled={mutationLoading}
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={mutationLoading}
                className="h-8 w-full rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {mutationLoading ? 'Working...' : 'Add source'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Source list</h3>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{sources.filter(source => source.enabled).length} enabled</div>
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
              <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(10rem,1fr)_2.5rem] gap-2 border-b border-slate-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>Source</span>
                <span>Status</span>
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
                    <article key={source.id} className="grid grid-cols-[minmax(0,1.7fr)_minmax(10rem,1fr)_2.5rem] items-center gap-2 px-3 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-950/30">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${source.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          <h4 className="truncate font-medium text-slate-900 dark:text-slate-50">{source.label}</h4>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{source.path}</p>
                      </div>
                      <div className="min-w-0 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="truncate">
                          <span className={`font-medium ${getSourceIndexStatusClassName(source.indexStatus)}`}>
                            {getSourceIndexStatusLabel(source)}
                          </span>
                          <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                          <span>{source.id}</span>
                        </div>
                        <div className="mt-0.5 truncate text-slate-500 dark:text-slate-400">
                          {source.enabled ? 'Enabled' : 'Disabled'} · {isActive ? 'Active' : 'Idle'}
                        </div>
                      </div>
                      <details className="relative justify-self-end">
                        <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                          <span aria-hidden="true" className="text-sm leading-none">⋯</span>
                        </summary>
                        <div className="absolute right-0 top-10 z-10 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                          {actions.map(action => (
                            <button
                              key={action.label}
                              type="button"
                              disabled={action.disabled}
                              onClick={action.onClick}
                              className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
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
