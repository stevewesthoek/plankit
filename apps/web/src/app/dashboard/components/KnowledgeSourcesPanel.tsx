import type { FormEvent, RefObject } from 'react'
import type { KnowledgeSource } from '@buildflow/shared'
import { MoreHorizontal } from 'lucide-react'

import { DashboardButton } from './ui/DashboardButton'
import { DashboardCodeText } from './ui/DashboardCodeText'
import { DashboardListRow } from './ui/DashboardListRow'
import { DashboardPanel } from './ui/DashboardPanel'
import { DashboardSectionHeader } from './ui/DashboardSectionHeader'
import { DashboardStatusDot } from './ui/DashboardStatusDot'

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
  selectedSourceId: string | null
  onAddSourceSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSourcePathChange: (value: string) => void
  onSourceLabelChange: (value: string) => void
  onSourceIdChange: (value: string) => void
  onSelectSource: (sourceId: string) => void
  onToggleActiveSource: (sourceId: string) => void
  onToggleEnabled: (source: KnowledgeSource, nextEnabled: boolean) => void
  onReindexSource: (source: KnowledgeSource) => void
  onRemoveSource: (source: KnowledgeSource) => void
  onToggleAddSourceForm: () => void
  addSourceFormRef: RefObject<HTMLFormElement>
}

const getStatusSummary = (source: KnowledgeSource) => {
  const fileCount = typeof source.indexedFileCount === 'number' ? `${source.indexedFileCount} files` : 'files unknown'
  return `${source.indexStatus || 'unknown'} · ${fileCount}`
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
  selectedSourceId,
  onAddSourceSubmit,
  onSourcePathChange,
  onSourceLabelChange,
  onSourceIdChange,
  onSelectSource,
  onToggleActiveSource,
  onToggleEnabled,
  onReindexSource,
  onRemoveSource,
  onToggleAddSourceForm,
  addSourceFormRef
}: KnowledgeSourcesPanelProps) {
  const shouldShowAddForm = sources.length === 0 || showAddSourceForm
  const readyCount = sources.filter(source => source.enabled && source.indexStatus === 'ready').length
  const indexingCount = sources.filter(source => source.enabled && source.indexStatus === 'indexing').length
  const statusCopy = mutationError || mutationNotice || 'Connected local folders and source state.'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 lg:p-5">
      <DashboardPanel variant="flat" className="p-3">
        <DashboardSectionHeader
          eyebrow="Sources"
          title="Sources"
          detail={statusCopy}
          action={
            sources.length > 0 ? (
              <DashboardButton type="button" onClick={onToggleAddSourceForm} variant="secondary">
                {showAddSourceForm ? 'Hide add source' : 'Add source'}
              </DashboardButton>
            ) : null
          }
        />
      </DashboardPanel>

      {shouldShowAddForm ? (
        <DashboardPanel variant="flat" className="shrink-0 p-3">
          <form ref={addSourceFormRef} onSubmit={onAddSourceSubmit} className="grid gap-3 md:grid-cols-[1.15fr_0.95fr_0.95fr_auto]">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-bf-muted dark:text-slate-400">Path *</span>
              <input
                value={sourcePath}
                onChange={e => onSourcePathChange(e.target.value)}
                className="w-full rounded-md border border-bf-border bg-bf-surface px-3 py-2 text-[13px] text-bf-text outline-none transition-colors placeholder:text-bf-muted focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
                placeholder="~/notes"
                disabled={mutationLoading}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-bf-muted dark:text-slate-400">Label</span>
              <input
                value={sourceLabel}
                onChange={e => onSourceLabelChange(e.target.value)}
                className="w-full rounded-md border border-bf-border bg-bf-surface px-3 py-2 text-[13px] text-bf-text outline-none transition-colors placeholder:text-bf-muted focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
                placeholder="My Notes"
                disabled={mutationLoading}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-bf-muted dark:text-slate-400">ID</span>
              <input
                value={sourceId}
                onChange={e => onSourceIdChange(e.target.value)}
                className="w-full rounded-md border border-bf-border bg-bf-surface px-3 py-2 text-[13px] text-bf-text outline-none transition-colors placeholder:text-bf-muted focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
                placeholder="my-notes"
                disabled={mutationLoading}
              />
            </label>
            <div className="flex items-end">
              <DashboardButton type="submit" disabled={mutationLoading} variant="primary" className="w-full">
                {mutationLoading ? 'Working...' : 'Add source'}
              </DashboardButton>
            </div>
          </form>
        </DashboardPanel>
      ) : null}

      <DashboardPanel variant="flat" className="min-h-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between border-b border-bf-border/70 px-3 py-2.5 dark:border-slate-800/70">
          <DashboardSectionHeader title="Source list" detail={`${readyCount} ready · ${indexingCount} indexing`} />
        </div>

        <div className="min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-bf-border border-t-slate-500 dark:border-slate-700 dark:border-t-slate-400" />
                <p className="text-[13px] font-medium text-bf-muted dark:text-slate-300">Loading sources...</p>
              </div>
            </div>
          ) : sources.length === 0 ? (
            <div className="p-3">
              <div className="rounded-lg border border-dashed border-bf-border/70 bg-bf-subtle/40 px-5 py-8 text-center dark:border-slate-700/70 dark:bg-slate-950/24">
                <p className="text-[13px] font-semibold text-bf-text dark:text-slate-50">No knowledge sources connected yet</p>
                <p className="mt-2 text-[13px] text-bf-muted dark:text-slate-300">Connect a local folder to start indexing content for ChatGPT.</p>
                <div className="mt-4 rounded-md border border-bf-border/70 bg-bf-surface/65 px-4 py-3 text-left text-[12px] text-bf-text dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-300">
                  <DashboardCodeText>buildflow connect &lt;path&gt;</DashboardCodeText>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(8.5rem,0.9fr)_2.5rem] gap-2 border-b border-bf-border/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-bf-muted dark:border-slate-800/60 dark:text-slate-400">
                <span>Source</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-bf-border/60 dark:divide-slate-800/60">
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
                      onClick: () => onToggleEnabled(source, !source.enabled)
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
                    <DashboardListRow
                      key={source.id}
                      className="grid grid-cols-[minmax(0,1.8fr)_minmax(8.5rem,0.9fr)_2.5rem] gap-2 px-3"
                      selected={selectedSourceId === source.id}
                      onClick={() => onSelectSource(source.id)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <DashboardStatusDot tone={source.enabled ? 'good' : 'neutral'} />
                          <h4 className="truncate text-[13px] font-medium text-bf-text dark:text-slate-50">{source.label}</h4>
                        </div>
                        <div className="mt-0.5 truncate font-mono-ui text-[11px] text-bf-muted dark:text-slate-400">{source.path}</div>
                      </div>
                      <div className="min-w-0 text-[11px] text-bf-muted dark:text-slate-300">
                        <div className="truncate">
                          <span className="font-medium text-bf-text dark:text-slate-100">{getStatusSummary(source)}</span>
                        </div>
                        <div className="mt-0.5 truncate text-bf-muted dark:text-slate-400">
                          {source.enabled ? 'Enabled' : 'Disabled'} · {isActive ? 'Active' : 'Idle'}
                        </div>
                      </div>
                      <details className="relative justify-self-end">
                        <summary
                          className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-[10px] border border-bf-border bg-bf-surface text-bf-muted transition-colors duration-150 hover:bg-bf-subtle hover:text-bf-text dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                          onClick={event => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </summary>
                        <div
                          className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-md border border-bf-border bg-bf-surface p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                          onClick={event => event.stopPropagation()}
                        >
                          {actions.map(action => (
                            <button
                              key={action.label}
                              type="button"
                              disabled={action.disabled}
                              onClick={event => {
                                event.stopPropagation()
                                action.onClick()
                              }}
                              className="block w-full rounded-md px-3 py-2 text-left text-[12px] text-bf-text transition-colors duration-150 hover:bg-bf-subtle disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </details>
                    </DashboardListRow>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DashboardPanel>
    </div>
  )
}
