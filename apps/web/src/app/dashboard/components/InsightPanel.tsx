import type { ActiveSourcesMode, KnowledgeSource, WriteMode } from '@buildflow/shared'
import { getActiveContextLabel, getAgentHealthLabel, getWriteModeLabel, getReadySourceCount, getIndexingSourceCount, getFailedSourceCount } from '../helpers'

type DashboardSection = 'overview' | 'sources' | 'activity' | 'plan' | 'handoff' | 'settings'

type DashboardActivityEntry = {
  title: string
  detail: string
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}

type InsightPanelProps = {
  loading: boolean
  error: string | null
  sourceCount: number
  section: DashboardSection
  activeMode: ActiveSourcesMode
  writeMode: WriteMode
  agentConnected: boolean
  sources: KnowledgeSource[]
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
  sourceCount,
  section,
  activeMode,
  writeMode,
  agentConnected,
  sources,
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

  const readyCount = getReadySourceCount(sources)
  const indexingCount = getIndexingSourceCount(sources)
  const failedCount = getFailedSourceCount(sources)
  const shownActivity = activityEntries.slice(0, 5)

  return (
    <aside className="hidden h-full min-h-0 w-full border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 xl:flex xl:w-[20rem] 2xl:w-[22rem]">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="shrink-0 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{titleBySection[section]}</div>
          <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
            {section === 'activity' ? 'Recent activity' : 'Workspace inspector'}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
            {section === 'activity'
              ? 'Track the latest dashboard and source events without leaving the main workspace.'
              : 'Quick state and reminders live here while the shell stays compact.'}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-2.5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Health</div>
              <div className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
                  <span>Agent</span>
                  <span className={agentConnected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}>{getAgentHealthLabel(agentConnected)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
                  <span>Sources</span>
                  <span>{sourceCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
                  <span>Ready</span>
                  <span>{readyCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
                  <span>Indexing</span>
                  <span>{indexingCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
                  <span>Failed</span>
                  <span>{failedCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
                  <span>Context</span>
                  <span>{getActiveContextLabel(activeMode)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Write</span>
                  <span>{getWriteModeLabel(writeMode)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">Source refresh</div>
                <p className="mt-1 text-xs leading-5">{error}</p>
              </div>
            )}

            {section === 'activity' ? (
              <div className="space-y-2">
                {shownActivity.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                    BuildFlow activity will appear here.
                  </div>
                ) : (
                  shownActivity.map((entry, index) => (
                    <div key={`${entry.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{entry.title}</div>
                      <div className={`mt-1 text-xs leading-5 ${toneClasses[entry.tone || 'neutral']}`}>{entry.detail}</div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Workflow</div>
                  <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <p>{loading ? 'Loading current dashboard state.' : agentConnected ? 'Dashboard state is connected and ready.' : 'Use the last known state while the agent reconnects.'}</p>
                    <p>Keep the shell compact and use the Sources and Handoff views when you need to drill in.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Recent event</div>
                  <div className="mt-2 space-y-2">
                    {shownActivity.slice(0, 2).map((entry, index) => (
                      <div key={`${entry.title}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                        <div className="font-medium text-slate-900 dark:text-slate-50">{entry.title}</div>
                        <div className={`mt-1 leading-5 ${toneClasses[entry.tone || 'neutral']}`}>{entry.detail}</div>
                      </div>
                    ))}
                    {shownActivity.length === 0 && <p className="text-xs text-slate-600 dark:text-slate-400">No recent events yet.</p>}
                  </div>
                </div>
              </>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              BuildFlow keeps source state visible even when refreshes fail temporarily.
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
