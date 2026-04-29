import type { KnowledgeSource } from '@buildflow/shared'

import type { DashboardLocalPlan, DashboardPlanTaskStatus } from '../types'
import { DashboardButton } from './ui/DashboardButton'
import { DashboardCodeText } from './ui/DashboardCodeText'
import { DashboardListRow } from './ui/DashboardListRow'
import { DashboardMetaRow } from './ui/DashboardMetaRow'
import { DashboardPanel } from './ui/DashboardPanel'
import { DashboardSectionHeader } from './ui/DashboardSectionHeader'
import { DashboardStatusDot } from './ui/DashboardStatusDot'

type PlanPlaceholderPanelProps = {
  sources: KnowledgeSource[]
  agentConnected: boolean
  selectedSource: KnowledgeSource | null
  plan: DashboardLocalPlan | null
  onCreatePlan: () => void
  onUpdateTaskStatus: (taskId: string, status: DashboardPlanTaskStatus) => void
  onClearPlan: () => void
  onOpenHandoff: () => void
  variant?: 'full' | 'compact'
}

const STATUS_SEQUENCE: DashboardPlanTaskStatus[] = ['pending', 'active', 'done', 'blocked']

const STATUS_TONE: Record<DashboardPlanTaskStatus, 'neutral' | 'good' | 'warn' | 'bad'> = {
  pending: 'neutral',
  active: 'good',
  done: 'good',
  blocked: 'warn'
}

const nextStatus = (status: DashboardPlanTaskStatus) => {
  const index = STATUS_SEQUENCE.indexOf(status)
  return STATUS_SEQUENCE[(index + 1) % STATUS_SEQUENCE.length]
}

const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function PlanPlaceholderPanel({
  sources,
  agentConnected,
  selectedSource,
  plan,
  onCreatePlan,
  onUpdateTaskStatus,
  onClearPlan,
  onOpenHandoff,
  variant = 'full'
}: PlanPlaceholderPanelProps) {
  const readyCount = sources.filter(source => source.enabled && source.indexStatus === 'ready').length
  const nextAction =
    sources.length === 0
      ? 'Add a source first'
      : !agentConnected
        ? 'Start the local agent'
        : plan
          ? 'Continue plan'
          : 'Create local plan'

  if (variant === 'compact') {
    return (
      <DashboardPanel variant="flat" className="p-4">
        <DashboardSectionHeader eyebrow="Plan" title={plan ? plan.title : 'No plan loaded yet'} detail={plan ? `${plan.tasks.length} local tasks` : 'Create a local plan from the current workspace.'} />
        <div className="mt-4 space-y-2">
          <DashboardMetaRow label="Next" value={nextAction} className="text-[12px]" />
          <DashboardButton type="button" variant="secondary" className="w-full justify-start" onClick={plan ? onOpenHandoff : onCreatePlan}>
            {plan ? 'Open handoff' : nextAction}
          </DashboardButton>
        </div>
      </DashboardPanel>
    )
  }

  if (!plan) {
    return (
      <div className="space-y-3">
        <DashboardPanel variant="flat" className="p-4">
          <DashboardSectionHeader
            eyebrow="Plan"
            title="Create a local execution plan"
            detail="Generate a small in-browser plan from the current source context."
          />
          <div className="mt-4 grid gap-2 text-[12px] text-bf-muted dark:text-slate-300 sm:grid-cols-3">
            <div className="rounded-md border border-bf-border/50 px-3 py-2 dark:border-slate-800/60">
              <div className="text-bf-text dark:text-slate-100">{sources.length}</div>
              <div>sources</div>
            </div>
            <div className="rounded-md border border-bf-border/50 px-3 py-2 dark:border-slate-800/60">
              <div className="text-bf-text dark:text-slate-100">{readyCount}</div>
              <div>ready</div>
            </div>
            <div className="rounded-md border border-bf-border/50 px-3 py-2 dark:border-slate-800/60">
              <div className="truncate text-bf-text dark:text-slate-100">{selectedSource?.label || 'Workspace'}</div>
              <div>context</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <DashboardButton type="button" variant="primary" onClick={onCreatePlan} disabled={sources.length === 0 || !agentConnected}>
              Create plan
            </DashboardButton>
            <DashboardButton type="button" variant="secondary" onClick={onOpenHandoff}>
              Open handoff
            </DashboardButton>
          </div>
          {sources.length === 0 || !agentConnected ? (
            <p className="mt-3 text-[12px] text-bf-muted dark:text-slate-400">
              {sources.length === 0 ? 'Add a source before creating a plan.' : 'Reconnect the local agent before creating a plan.'}
            </p>
          ) : null}
        </DashboardPanel>
      </div>
    )
  }

  const doneCount = plan.tasks.filter(task => task.status === 'done').length
  const activeTask = plan.tasks.find(task => task.status === 'active') || plan.tasks.find(task => task.status === 'pending') || plan.tasks[0]

  return (
    <div className="space-y-3">
      <DashboardPanel variant="flat" className="p-4">
        <DashboardSectionHeader
          eyebrow="Plan"
          title={plan.title}
          detail={plan.summary}
          action={
            <div className="flex items-center gap-2">
              <DashboardButton type="button" variant="secondary" onClick={onOpenHandoff}>Handoff</DashboardButton>
              <DashboardButton type="button" variant="ghost" onClick={onClearPlan}>Clear</DashboardButton>
            </div>
          }
        />
        <div className="mt-4 grid gap-2 text-[12px] sm:grid-cols-3">
          <DashboardMetaRow label="Progress" value={`${doneCount}/${plan.tasks.length} done`} />
          <DashboardMetaRow label="Context" value={plan.sourceId ? <DashboardCodeText>{plan.sourceId}</DashboardCodeText> : 'Workspace'} />
          <DashboardMetaRow label="Updated" value={formatTime(plan.updatedAt)} />
        </div>
      </DashboardPanel>

      <DashboardPanel variant="flat" className="overflow-hidden">
        <DashboardSectionHeader eyebrow="Tasks" title="Local execution tasks" detail="Cycle task status locally as work progresses." className="p-4 pb-2" />
        <div className="divide-y divide-bf-border/55 dark:divide-slate-800/60">
          {plan.tasks.map((task, index) => (
            <DashboardListRow key={task.id} className="items-start rounded-none px-4 py-3 hover:bg-bf-subtle/55 dark:hover:bg-slate-900/35">
              <DashboardStatusDot tone={STATUS_TONE[task.status]} className="mt-1.5" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-mono-ui text-[10px] text-bf-muted dark:text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                  <span className="truncate text-[12px] font-medium text-bf-text dark:text-slate-100">{task.title}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-bf-muted dark:text-slate-300">{task.detail}</p>
              </div>
              <DashboardButton type="button" variant="secondary" className="shrink-0" onClick={() => onUpdateTaskStatus(task.id, nextStatus(task.status))}>
                {task.status}
              </DashboardButton>
            </DashboardListRow>
          ))}
        </div>
      </DashboardPanel>

      {activeTask ? (
        <DashboardPanel variant="flat" className="p-4">
          <DashboardSectionHeader eyebrow="Next" title={activeTask.title} detail="Use Handoff to copy the current plan context into your coding tool." />
          <div className="mt-4 flex flex-wrap gap-2">
            <DashboardButton type="button" variant="primary" onClick={onOpenHandoff}>Prepare handoff</DashboardButton>
            <DashboardButton type="button" variant="secondary" onClick={() => onUpdateTaskStatus(activeTask.id, 'done')}>Mark done</DashboardButton>
          </div>
        </DashboardPanel>
      ) : null}
    </div>
  )
}
