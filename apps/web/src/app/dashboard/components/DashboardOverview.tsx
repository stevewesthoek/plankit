import type { ActiveSourcesMode, KnowledgeSource, WriteMode } from '@buildflow/shared'
import {
  getActiveContextLabel,
  getAgentHealthClassName,
  getAgentHealthLabel,
  getFailedSourceCount,
  getIndexingSourceCount,
  getReadySourceCount,
  getWriteModeLabel
} from '../helpers'

type DashboardOverviewProps = {
  loading: boolean
  agentConnected: boolean
  sources: KnowledgeSource[]
  activeMode: ActiveSourcesMode
  writeMode: WriteMode
  onManageSources: () => void
  onAddSource: () => void
  onOpenHandoff: () => void
}

export function DashboardOverview({
  loading,
  agentConnected,
  sources,
  activeMode,
  writeMode,
  onManageSources,
  onAddSource,
  onOpenHandoff
}: DashboardOverviewProps) {
  const enabledCount = sources.filter(source => source.enabled).length
  const readyCount = getReadySourceCount(sources)
  const failedCount = getFailedSourceCount(sources)
  const indexingCount = getIndexingSourceCount(sources)
  const sourceCountLabel = sources.length === 1 ? '1 source' : `${sources.length} sources`
  const enabledCountLabel = enabledCount === 1 ? '1 enabled' : `${enabledCount} enabled`
  const activeModeLabel = getActiveContextLabel(activeMode)
  const writeModeLabel = getWriteModeLabel(writeMode)

  const cards = [
    { label: 'Sources', value: sourceCountLabel },
    { label: 'Enabled', value: enabledCountLabel },
    { label: 'Ready', value: `${readyCount}` },
    { label: 'Indexing', value: `${indexingCount}` },
    { label: 'Failed', value: `${failedCount}` },
    { label: 'Context', value: activeModeLabel },
    { label: 'Write mode', value: writeModeLabel },
    { label: 'Agent', value: getAgentHealthLabel(agentConnected) }
  ]

  const nextAction =
    sources.length === 0
      ? 'Add your first source'
      : readyCount > 0
        ? 'Open Handoff'
        : 'Review readiness'

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Overview</div>
            <h2 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              A compact local workbench for sources, plans, and safe execution.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              BuildFlow Local stays on your machine. Connect sources, watch indexing, and move from context to handoff without leaving the dashboard shell.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
            <span className={`h-2 w-2 rounded-full ${getAgentHealthClassName(agentConnected)}`} />
            {loading ? 'Loading' : getAgentHealthLabel(agentConnected)}
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-[11px] sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Ready</div>
            <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50">{readyCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Indexing</div>
            <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50">{indexingCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Failed</div>
            <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50">{failedCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Context</div>
            <div className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-50">{activeModeLabel}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Write</div>
            <div className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-50">{writeModeLabel}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Next step</div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {sources.length === 0
                ? 'Add a source to make the workspace useful.'
                : readyCount > 0
                  ? 'Open Handoff or switch to Sources for action.'
                  : 'Review sources and wait for indexing to finish.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onManageSources} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900">
              Manage sources
            </button>
            <button type="button" onClick={onAddSource} className="rounded-full bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
              Add source
            </button>
            <button type="button" onClick={onOpenHandoff} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900">
              Open handoff
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{card.label}</div>
            <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-50">{card.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
        <span className="font-medium text-slate-900 dark:text-slate-50">BuildFlow Local</span> keeps the free GitHub path on your machine and gives you a clear next action instead of a wall of cards.
      </section>
    </div>
  )
}
