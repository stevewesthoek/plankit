import type { KnowledgeSource, WriteMode } from '@buildflow/shared'
import {
  getAgentHealthClassName,
  getAgentHealthLabel,
  getReadySourceCount,
  getWriteModeLabel
} from '../helpers'

type DashboardOverviewProps = {
  loading: boolean
  agentConnected: boolean
  sources: KnowledgeSource[]
  writeMode: WriteMode
  onManageSources: () => void
  onOpenHandoff: () => void
}

export function DashboardOverview({
  loading,
  agentConnected,
  sources,
  writeMode,
  onManageSources,
  onOpenHandoff
}: DashboardOverviewProps) {
  const readyCount = getReadySourceCount(sources)
  const writeModeLabel = getWriteModeLabel(writeMode)
  const sourceSummary = sources.length === 0
    ? 'No sources connected.'
    : readyCount > 0
      ? `${readyCount} ready`
      : 'Indexing in progress'

  const nextAction =
    sources.length === 0
      ? 'Add your first source'
      : readyCount > 0
        ? 'Open Handoff'
        : 'Review readiness'

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Overview</div>
            <h2 className="mt-1 text-[1.05rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              A compact local workbench for safe execution.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Keep the workspace calm and move straight to the next useful step.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
            <span className={`h-2 w-2 rounded-full ${getAgentHealthClassName(agentConnected)}`} />
            {loading ? 'Loading' : getAgentHealthLabel(agentConnected)}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Next step</div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {sources.length === 0
                ? 'Add a source to make the workspace useful.'
                : readyCount > 0
                  ? 'Open Handoff or switch to Sources.'
                  : 'Review sources and wait for indexing to finish.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onManageSources} className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900">
              Sources
            </button>
            <button type="button" onClick={onOpenHandoff} className="h-8 rounded-md bg-slate-900 px-3 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
              Handoff
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${getAgentHealthClassName(agentConnected)}`} />
            {agentConnected ? 'Agent connected' : 'Agent offline'}
          </span>
          <span>{sourceSummary}</span>
          <span>{writeModeLabel}</span>
        </div>
      </section>
    </div>
  )
}
