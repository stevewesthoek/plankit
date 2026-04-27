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
    <div className="flex flex-col p-6">
      <div className="shrink-0 pb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1 dark:text-slate-50">Knowledge Sources</h2>
        <p className="text-slate-600 text-sm dark:text-slate-300">Configured knowledge sources that are searched and read together through ChatGPT.</p>
      </div>

      <form
        ref={addSourceFormRef}
        onSubmit={onAddSourceSubmit}
        className="shrink-0 border border-slate-200 rounded-lg p-4 mb-6 space-y-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50"
      >
        <div>
          <h3 className="font-semibold text-slate-900 mb-3 text-sm dark:text-slate-50">Add Knowledge Source</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-700 mb-2 dark:text-slate-300">Path *</span>
              <input
                value={sourcePath}
                onChange={e => onSourcePathChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                placeholder="~/notes"
                disabled={mutationLoading}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-700 mb-2 dark:text-slate-300">Label</span>
              <input
                value={sourceLabel}
                onChange={e => onSourceLabelChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                placeholder="My Notes"
                disabled={mutationLoading}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-700 mb-2 dark:text-slate-300">ID</span>
              <input
                value={sourceId}
                onChange={e => onSourceIdChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                placeholder="my-notes"
                disabled={mutationLoading}
              />
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={mutationLoading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-slate-800 transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {mutationLoading ? 'Working...' : 'Add source'}
        </button>
        {mutationError ? (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:border-red-900/40 dark:bg-red-950/40">
            <p className="text-xs text-red-700 font-medium dark:text-red-200">Error: {mutationError}</p>
          </div>
        ) : null}
        {mutationNotice ? (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:border-emerald-900/40 dark:bg-emerald-950/40">
            <p className="text-xs text-emerald-700 font-medium dark:text-emerald-200">{mutationNotice}</p>
          </div>
        ) : null}
      </form>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block mb-3">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin dark:border-slate-700 dark:border-t-slate-400" />
              </div>
              <p className="text-sm text-slate-600 font-medium dark:text-slate-300">Loading sources...</p>
            </div>
          </div>
        ) : sources.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center dark:border-slate-700 dark:bg-slate-950/30">
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">No knowledge sources connected yet</p>
              <p className="text-sm text-slate-600 mt-2 dark:text-slate-300">Connect a local folder to get started with BuildFlow.</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 my-4 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-xs text-slate-700 font-mono dark:text-slate-300">buildflow connect &lt;path&gt;</p>
              <p className="text-xs text-slate-600 mt-2 dark:text-slate-400">
                Example: <code className="bg-slate-100 px-1 rounded dark:bg-slate-800 dark:text-slate-200">buildflow connect ~/my-vault</code>
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">After connecting, sources will appear here and can be searched through ChatGPT.</p>
          </div>
        ) : (
          <div className="space-y-3 py-3 pr-3">
            {sources.map(source => (
              <div key={source.id} className="border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-900">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm dark:text-slate-50">{source.label}</div>
                  <div className="text-xs text-slate-600 font-mono truncate mt-1 dark:text-slate-300">{source.path}</div>
                  <div className="text-xs text-slate-500 mt-2 dark:text-slate-400">ID: {source.id}</div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getSourceEnabledClassName(source.enabled)}`}>
                    {source.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getSourceIndexStatusClassName(source.indexStatus)}`}>
                    {getSourceIndexStatusLabel(source)}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getSourceActiveClassName(activeSourceIds.includes(source.id))}`}>
                    {activeSourceIds.includes(source.id) ? 'Active' : 'Inactive'}
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end mt-1">
                    <button
                      type="button"
                      disabled={mutationLoading || !source.enabled}
                      onClick={() => onToggleActiveSource(source.id)}
                      className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
                        mutationLoading || !source.enabled
                          ? 'border-slate-200 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:text-slate-600'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                      }`}
                    >
                      Toggle Active
                    </button>
                    <button
                      type="button"
                      disabled={mutationLoading}
                      onClick={() => onToggleEnabled(source.id, !source.enabled)}
                      className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
                        mutationLoading ? 'border-slate-200 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:text-slate-600' : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                      }`}
                    >
                      {source.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      disabled={mutationLoading || !source.enabled || source.indexStatus === 'indexing'}
                      onClick={() => onReindexSource(source)}
                      className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
                        mutationLoading || !source.enabled || source.indexStatus === 'indexing'
                          ? 'border-slate-200 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:text-slate-600'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                      }`}
                    >
                      {source.indexStatus === 'indexing' ? 'Indexing...' : 'Reindex'}
                    </button>
                    <button
                      type="button"
                      disabled={mutationLoading}
                      onClick={() => onRemoveSource(source)}
                      className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
                        mutationLoading ? 'border-slate-200 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:text-slate-600' : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
                      }`}
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
    </div>
  )
}
