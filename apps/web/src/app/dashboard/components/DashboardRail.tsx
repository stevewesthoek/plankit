import type { KnowledgeSource } from '@buildflow/shared'
import { getSourceIndexStatusLabel } from '../helpers'

type DashboardSection = 'overview' | 'sources' | 'activity' | 'plan' | 'handoff' | 'settings'

type DashboardRailProps = {
  activeSection: DashboardSection
  sources: KnowledgeSource[]
  onSelectSection: (section: DashboardSection) => void
}

const NAV_ITEMS: { id: DashboardSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sources', label: 'Sources' },
  { id: 'activity', label: 'Activity' },
  { id: 'plan', label: 'Plans' },
  { id: 'handoff', label: 'Handoff' },
  { id: 'settings', label: 'Settings' }
]

export function DashboardRail({
  activeSection,
  sources,
  onSelectSection
}: DashboardRailProps) {
  const shownSources = sources.slice(0, 5)

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-slate-50/95 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="shrink-0 border-b border-slate-200 px-3 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
            BF
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">BuildFlow Local</div>
          </div>
        </div>
      </div>

      <nav className="shrink-0 px-2.5 py-2.5">
        <div className="space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-50'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900/70'
                }`}
              >
                <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="min-h-0 flex-1 px-2.5 pb-2.5">
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Sources</div>
          <div className="min-h-0 flex-1 overflow-y-auto px-0.5">
            {shownSources.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                No sources yet. Add a local folder in Sources.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {shownSources.map(source => (
                  <div key={source.id} className="grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-center gap-2 py-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${source.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{source.label}</div>
                      <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">{getSourceIndexStatusLabel(source)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
