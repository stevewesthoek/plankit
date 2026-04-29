import type { KnowledgeSource } from '@buildflow/shared'

import { DashboardButton } from './ui/DashboardButton'
import { DashboardMetaRow } from './ui/DashboardMetaRow'
import { DashboardPanel } from './ui/DashboardPanel'
import { DashboardSectionHeader } from './ui/DashboardSectionHeader'
import { DashboardStatusDot } from './ui/DashboardStatusDot'

type PlanPlaceholderPanelProps = {
  sources: KnowledgeSource[]
  agentConnected: boolean
  variant?: 'full' | 'compact'
}

export function PlanPlaceholderPanel({ sources, agentConnected, variant = 'full' }: PlanPlaceholderPanelProps) {
  const nextAction =
    sources.length === 0
      ? 'Add a source'
      : !agentConnected
        ? 'Start agent'
        : 'Create plan'

  if (variant === 'compact') {
    return (
      <DashboardPanel className="p-4">
        <DashboardSectionHeader eyebrow="Plan" title="No plan loaded yet" detail="Use the next step below to begin." />
        <div className="mt-4 space-y-2">
          <DashboardMetaRow
            label="Next"
            value={nextAction}
            className="text-[12px]"
          />
          <DashboardButton type="button" variant="secondary" className="w-full justify-start">
            {nextAction}
          </DashboardButton>
        </div>
      </DashboardPanel>
    )
  }

  return (
    <div className="space-y-3">
      <DashboardPanel className="p-4">
        <DashboardSectionHeader eyebrow="Plan" title="Current plan" detail="No plan loaded yet." />
        <div className="mt-4 flex items-center gap-2 text-[12px] text-bf-muted">
          <DashboardStatusDot tone={agentConnected ? 'good' : 'neutral'} />
          <span>{agentConnected ? 'Agent connected' : 'Agent offline'}</span>
          <span className="text-bf-border dark:text-slate-700">·</span>
          <span>{sources.length} sources</span>
        </div>
      </DashboardPanel>

      <DashboardPanel className="p-4">
        <DashboardSectionHeader eyebrow="Next" title="Next action" detail="Move the workspace forward with one step." />
        <div className="mt-4 flex flex-wrap gap-2">
          <DashboardButton type="button" variant="primary">
            {nextAction}
          </DashboardButton>
          <DashboardButton type="button" variant="secondary">
            Review sources
          </DashboardButton>
        </div>
      </DashboardPanel>
    </div>
  )
}
