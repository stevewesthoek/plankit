import { DashboardPanel } from './ui/DashboardPanel'
import { DashboardSectionHeader } from './ui/DashboardSectionHeader'
import { DashboardStatusDot } from './ui/DashboardStatusDot'

type DashboardActivityEntry = {
  title: string
  detail: string
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}

type DashboardActivityFeedProps = {
  entries: DashboardActivityEntry[]
  emptyMessage: string
}

const TONE_CLASSES: Record<NonNullable<DashboardActivityEntry['tone']>, string> = {
  neutral: 'text-slate-700 dark:text-slate-300',
  good: 'text-emerald-700 dark:text-emerald-300',
  warn: 'text-amber-700 dark:text-amber-300',
  bad: 'text-red-700 dark:text-red-300'
}

export function DashboardActivityFeed({ entries, emptyMessage }: DashboardActivityFeedProps) {
  return (
    <DashboardPanel className="h-full min-h-0 overflow-hidden">
      <div className="border-b border-bf-border px-4 py-3 dark:border-slate-800">
        <DashboardSectionHeader eyebrow="Activity" title="Recent BuildFlow events" />
      </div>
      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-4 py-4">
            <div className="rounded-lg border border-dashed border-bf-border bg-bf-subtle px-4 py-6 text-[13px] text-bf-muted dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              {emptyMessage}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-bf-border dark:divide-slate-800">
            {entries.map((entry, index) => (
              <div key={`${entry.title}-${index}`} className="flex items-start gap-3 px-4 py-3">
                <DashboardStatusDot tone={entry.tone || 'neutral'} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-bf-text dark:text-slate-50">{entry.title}</div>
                  <div className={`mt-0.5 truncate text-[12px] leading-5 ${TONE_CLASSES[entry.tone || 'neutral']}`}>{entry.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardPanel>
  )
}
