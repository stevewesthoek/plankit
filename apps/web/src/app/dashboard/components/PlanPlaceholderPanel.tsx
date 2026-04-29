import type { KnowledgeSource } from '@buildflow/shared'

type PlanPlaceholderPanelProps = {
  sources: KnowledgeSource[]
  agentConnected: boolean
  variant?: 'full' | 'compact'
}

export function PlanPlaceholderPanel({ sources, agentConnected, variant = 'full' }: PlanPlaceholderPanelProps) {
  if (variant === 'compact') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Plan</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No plan loaded yet</p>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Next</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {sources.length === 0
                ? 'Add a source'
                : !agentConnected
                  ? 'Start agent'
                  : 'Create plan'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Current plan</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No plan loaded yet</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Create a plan in ChatGPT to begin tracking it here.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Next action</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {sources.length === 0
            ? 'Add a knowledge source'
            : !agentConnected
              ? 'Start the local agent'
              : 'Create or load a plan'}
        </p>
      </div>
    </div>
  )
}
