import { DashboardMetaRow } from './ui/DashboardMetaRow'
import { DashboardPanel } from './ui/DashboardPanel'
import { DashboardSectionHeader } from './ui/DashboardSectionHeader'
import { DashboardStatusDot } from './ui/DashboardStatusDot'

export function ExecutionFlowPreview() {
  const states: Array<[string, 'neutral' | 'good' | 'warn' | 'bad']> = [
    ['pending', 'neutral' as const],
    ['active', 'good' as const],
    ['done', 'good' as const],
    ['blocked', 'warn' as const],
    ['failed', 'bad' as const],
    ['verified', 'good' as const],
    ['paused', 'neutral' as const]
  ]

  return (
    <DashboardPanel className="p-4">
      <DashboardSectionHeader eyebrow="Execution" title="Execution states" detail="Progress markers used in plans and handoffs." />
      <div className="mt-4 divide-y divide-bf-border dark:divide-slate-800">
        {states.map(([label, tone]) => (
          <DashboardMetaRow
            key={label}
            label={<span className="inline-flex items-center gap-2"><DashboardStatusDot tone={tone} />{label}</span>}
            value="State marker"
            className="py-2 text-[12px]"
          />
        ))}
      </div>
      <p className="mt-3 text-[12px] text-bf-muted">Load a plan to see task progress here.</p>
    </DashboardPanel>
  )
}
