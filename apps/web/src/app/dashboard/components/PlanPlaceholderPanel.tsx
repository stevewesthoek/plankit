import type { KnowledgeSource } from '@buildflow/shared'

type PlanPlaceholderPanelProps = {
  sources: KnowledgeSource[]
  agentConnected: boolean
}

export function PlanPlaceholderPanel({ sources, agentConnected }: PlanPlaceholderPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-50">Current Plan</h3>
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-sm text-slate-600 dark:text-slate-300">No plan loaded yet.</p>
            <p className="text-xs text-slate-500 mt-3 dark:text-slate-400">
              Create a plan in the Custom GPT, then use BuildFlow to track and continue it here.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-50">Next Action</h3>
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {sources.length === 0
                ? 'Connect a source to get started.'
                : !agentConnected
                  ? 'Start the local agent to continue.'
                  : 'Create or load a plan from ChatGPT.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4 dark:text-slate-400">Plan Structure (future)</h3>
        <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="w-4 h-4 rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />
            <span>Plan title</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="w-4 h-4 rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />
            <span>Plan status</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="w-4 h-4 rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />
            <span>Task checklist</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="w-4 h-4 rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />
            <span>Resume / continue action</span>
          </div>
        </div>
      </div>
    </div>
  )
}
