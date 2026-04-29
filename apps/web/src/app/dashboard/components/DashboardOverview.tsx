import type { KnowledgeSource, WriteMode } from '@buildflow/shared'
import {
  getAgentHealthLabel,
  getReadySourceCount,
  getWriteModeLabel
} from '../helpers'
import { DashboardButton } from './ui/DashboardButton'
import { DashboardPanel } from './ui/DashboardPanel'
import { DashboardSectionHeader } from './ui/DashboardSectionHeader'
import { DashboardStatusDot } from './ui/DashboardStatusDot'

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
      <DashboardPanel className="p-4">
        <DashboardSectionHeader
          eyebrow="Overview"
          title="A compact local workbench for safe execution."
          detail="Keep the workspace calm and move straight to the next useful step."
          action={
            <div className="flex items-center gap-2 text-[11px] font-medium text-bf-muted dark:text-slate-400">
              <DashboardStatusDot tone={agentConnected ? 'good' : 'neutral'} />
              <span className="truncate">{loading ? 'Loading' : getAgentHealthLabel(agentConnected)}</span>
            </div>
          }
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-bf-border pt-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bf-muted dark:text-slate-400">Next step</div>
            <p className="mt-1 text-[13px] text-bf-muted dark:text-slate-300">
              {sources.length === 0
                ? 'Add a source to make the workspace useful.'
                : readyCount > 0
                  ? 'Open Handoff or switch to Sources.'
                  : 'Review sources and wait for indexing to finish.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DashboardButton type="button" onClick={onManageSources} variant="secondary">
              Sources
            </DashboardButton>
            <DashboardButton type="button" onClick={onOpenHandoff} variant="primary">
              Handoff
            </DashboardButton>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-bf-muted dark:text-slate-300">
          <span>{sourceSummary}</span>
          <span>{writeModeLabel}</span>
        </div>
      </DashboardPanel>
    </div>
  )
}
