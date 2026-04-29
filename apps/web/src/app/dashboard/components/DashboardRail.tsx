import type { ActiveSourcesMode, KnowledgeSource, WriteMode } from '@buildflow/shared'
import { getActiveContextLabel, getSourceEnabledClassName, getSourceIndexStatusClassName, getSourceIndexStatusLabel, getSourceActiveClassName } from '../helpers'

type DashboardSection = 'overview' | 'sources' | 'activity' | 'plan' | 'handoff' | 'settings'

type DashboardRailProps = {
  activeSection: DashboardSection
  agentConnected: boolean
  sources: KnowledgeSource[]
  activeMode: ActiveSourcesMode
  writeMode: WriteMode
  onSelectSection: (section: DashboardSection) => void
}

const NAV_ITEMS: { id: DashboardSection; label: string; description: string }[] = [
  { id: 'overview', label: 'Overview', description: 'State and next step' },
  { id: 'sources', label: 'Sources', description: 'Connected repositories' },
  { id: 'activity', label: 'Activity', description: 'Recent BuildFlow events' },
  { id: 'plan', label: 'Plans', description: 'Packets and progress' },
  { id: 'handoff', label: 'Handoff', description: 'Codex and Claude prompts' },
  { id: 'settings', label: 'Settings', description: 'Context and write mode' }
]

export function DashboardRail({
  activeSection,
  agentConnected,
  sources,
  activeMode,
  writeMode,
  onSelectSection
}: DashboardRailProps) {
  const readyCount = sources.filter(source => source.enabled && source.indexStatus === 'ready').length
  const indexingCount = sources.filter(source => source.enabled && source.indexStatus === 'indexing').length
  const failedCount = sources.filter(source => source.enabled && source.indexStatus === 'failed').length
  const shownSources = sources.slice(0, 5)

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-slate-50/95 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="shrink-0 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
            BF
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">BuildFlow Local</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Local AI workbench</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            {agentConnected ? 'Connected' : 'Offline'}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            {readyCount} ready
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            {getActiveContextLabel(activeMode)}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            {writeMode === 'safeWrites' ? 'Safe writes' : writeMode}
          </span>
        </div>
      </div>

      <nav className="shrink-0 px-3 py-3">
        <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Navigation</div>
        <div className="space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50'
                    : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-900/70'
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.description}</div>
                </div>
                <div
                  className={`h-2 w-2 rounded-full border ${
                    isActive
                      ? 'border-slate-400 bg-slate-900 dark:border-slate-500 dark:bg-slate-100'
                      : 'border-slate-300 bg-transparent dark:border-slate-700'
                  }`}
                />
              </button>
            )
          })}
        </div>
      </nav>

      <div className="min-h-0 flex-1 px-3 pb-3">
        <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
          <div className="shrink-0 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Sources</div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{sources.length} connected</div>
              </div>
              <div className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getSourceEnabledClassName(sources.filter(source => source.enabled).length > 0)}`}>
                {sources.filter(source => source.enabled).length} enabled
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">{indexingCount} indexing</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">{failedCount} failed</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {shownSources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                No sources yet. Add a local folder in Sources.
              </div>
            ) : (
              <div className="space-y-1.5">
                {shownSources.map(source => (
                  <div key={source.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{source.label}</div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{source.path}</div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getSourceActiveClassName(source.enabled)}`}>
                        {source.enabled ? 'on' : 'off'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${getSourceIndexStatusClassName(source.indexStatus)}`}>
                        {getSourceIndexStatusLabel(source)}
                      </span>
                      <span className="rounded-full border border-slate-200 px-2 py-0.5 font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        {source.id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>Settings</span>
              <button
                type="button"
                onClick={() => onSelectSection('settings')}
                className="rounded-full border border-slate-200 px-2.5 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Open
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
