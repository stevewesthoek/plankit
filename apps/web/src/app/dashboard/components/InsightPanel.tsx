import type { ActiveSourcesMode, WriteMode } from '@buildflow/shared'
import { getActiveContextLabel, getAgentHealthLabel, getWriteModeLabel } from '../helpers'

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

  const shownActivity = activityEntries.slice(0, 5)

  return (
    <aside className="hidden h-full min-h-0 w-full overflow-hidden border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 xl:flex xl:w-[18rem] 2xl:w-[20rem]">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="shrink-0 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{titleBySection[section]}</div>
          <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
            {section === 'activity' ? 'Recent activity' : 'Current state'}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 overflow-x-hidden">
          <div className="space-y-3">
            <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span>Agent</span>
                <span className={`min-w-0 truncate text-right ${agentConnected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>{getAgentHealthLabel(agentConnected)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span>Context</span>
                <span className="min-w-0 truncate text-right">{getActiveContextLabel(activeMode)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span>Write</span>
                <span className="min-w-0 truncate text-right">{getWriteModeLabel(writeMode)}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">Source refresh</div>
                <p className="mt-1 min-w-0 truncate text-xs leading-5">{error}</p>
              </div>
            )}

            {section === 'activity' ? (
              <div className="space-y-2">
                {shownActivity.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                    BuildFlow activity will appear here.
                  </div>
                ) : (
                  shownActivity.map((entry, index) => (
                    <div key={`${entry.title}-${index}`} className="border-b border-slate-200 py-2.5 last:border-b-0 dark:border-slate-800">
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-current opacity-70" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{entry.title}</div>
                          <div className={`mt-0.5 truncate text-xs leading-5 ${toneClasses[entry.tone || 'neutral']}`}>{entry.detail}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{loading ? 'Refreshing state' : agentConnected ? 'Live state' : 'Last known state'}</span>
                    <span>Inspector</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {shownActivity.slice(0, 2).map((entry, index) => (
                    <div key={`${entry.title}-${index}`} className="flex items-start gap-3 border-b border-slate-200 py-2 last:border-b-0 dark:border-slate-800">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-current opacity-70" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{entry.title}</div>
                          <div className={`mt-0.5 truncate text-xs leading-5 ${toneClasses[entry.tone || 'neutral']}`}>{entry.detail}</div>
                        </div>
                      </div>
                    ))}
                    {shownActivity.length === 0 && <p className="text-xs text-slate-600 dark:text-slate-400">No recent events yet.</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
