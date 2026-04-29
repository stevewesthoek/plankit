import type { ActiveSourcesMode, WriteMode } from '@buildflow/shared'
import { DashboardPanel } from './ui/DashboardPanel'
import { DashboardMetaRow } from './ui/DashboardMetaRow'
import { DashboardSectionHeader } from './ui/DashboardSectionHeader'
import { DashboardStatusDot } from './ui/DashboardStatusDot'

type DashboardSection = 'overview' | 'sources' | 'activity' | 'plan' | 'handoff' | 'settings'

type DashboardActivityEntry = {
  title: string
  detail: string
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}

type InsightPanelProps = {
  loading: boolean
  error: string | null
  section: DashboardSection
  activeMode: ActiveSourcesMode
  writeMode: WriteMode
  agentConnected: boolean
  activityEntries: DashboardActivityEntry[]
}

const toneClasses: Record<NonNullable<DashboardActivityEntry['tone']>, string> = {
  neutral: 'text-slate-700 dark:text-slate-300',
  good: 'text-emerald-700 dark:text-emerald-300',
  warn: 'text-amber-700 dark:text-amber-300',
  bad: 'text-red-700 dark:text-red-300'
}

export function InsightPanel({
  loading,
  error,
  section,
  activeMode,
  writeMode,
  agentConnected,
  activityEntries
}: InsightPanelProps) {
  const titleBySection: Record<DashboardSection, string> = {
    overview: 'Inspector',
    sources: 'Sources',
    activity: 'Activity',
    plan: 'Plans',
    handoff: 'Handoff',
    settings: 'Settings'
  }

  const shownActivity = activityEntries.slice(0, 4)

  return (
    <aside className="hidden h-full min-h-0 w-full overflow-hidden border-l border-bf-border bg-bf-bg dark:border-slate-800 dark:bg-slate-950/88 xl:flex xl:w-[18rem] 2xl:w-[20rem]">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="shrink-0 border-b border-bf-border px-4 py-4 dark:border-slate-800">
          <DashboardSectionHeader eyebrow={titleBySection[section]} title={section === 'activity' ? 'Recent activity' : 'Current state'} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
          <div className="space-y-3">
            <DashboardPanel className="p-3">
              <div className="space-y-2">
                <DashboardMetaRow label="Agent" value={<span className="inline-flex items-center gap-1.5"><DashboardStatusDot tone={agentConnected ? 'good' : 'neutral'} />{agentConnected ? 'Connected' : 'Disconnected'}</span>} />
                <DashboardMetaRow label="Context" value={activeMode === 'single' ? 'Single source' : activeMode === 'multi' ? 'Multiple sources' : 'All enabled'} />
                <DashboardMetaRow label="Write" value={writeMode === 'safeWrites' ? 'Safe writes' : writeMode === 'artifactsOnly' ? 'Artifacts only' : 'Read only'} />
              </div>
            </DashboardPanel>

            {error ? (
              <DashboardPanel className="p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bf-muted">Source refresh</div>
                <p className="mt-1 min-w-0 break-words text-[13px] leading-5 text-red-700 dark:text-red-200">{error}</p>
              </DashboardPanel>
            ) : null}

            {section === 'activity' ? (
              <DashboardPanel className="p-0">
                <div className="divide-y divide-bf-border dark:divide-slate-800">
                  {shownActivity.length === 0 ? (
                    <div className="px-4 py-4 text-[13px] text-bf-muted dark:text-slate-300">BuildFlow activity will appear here.</div>
                  ) : (
                    shownActivity.map((entry, index) => (
                      <div key={`${entry.title}-${index}`} className="flex items-start gap-3 px-4 py-3">
                        <DashboardStatusDot tone={entry.tone || 'neutral'} className="mt-1" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-bf-text dark:text-slate-50">{entry.title}</div>
                          <div className={`mt-0.5 truncate text-[12px] leading-5 ${toneClasses[entry.tone || 'neutral']}`}>{entry.detail}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DashboardPanel>
            ) : (
              <DashboardPanel className="p-0">
                <div className="divide-y divide-bf-border dark:divide-slate-800">
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bf-muted">Live state</div>
                    <p className="mt-1 text-[13px] text-bf-muted dark:text-slate-300">
                      {loading ? 'Refreshing source state...' : agentConnected ? 'Current state is live.' : 'Showing last known state.'}
                    </p>
                  </div>
                  {shownActivity.length === 0 ? (
                    <div className="px-4 py-4 text-[13px] text-bf-muted dark:text-slate-300">No recent events yet.</div>
                  ) : (
                    shownActivity.slice(0, 3).map((entry, index) => (
                      <div key={`${entry.title}-${index}`} className="flex items-start gap-3 px-4 py-3">
                        <DashboardStatusDot tone={entry.tone || 'neutral'} className="mt-1" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-bf-text dark:text-slate-50">{entry.title}</div>
                          <div className={`mt-0.5 truncate text-[12px] leading-5 ${toneClasses[entry.tone || 'neutral']}`}>{entry.detail}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DashboardPanel>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
