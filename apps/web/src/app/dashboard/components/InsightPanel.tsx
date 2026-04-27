type InsightPanelProps = {
  loading: boolean
  error: string | null
  sourceCount: number
}

export function InsightPanel({ loading, error, sourceCount }: InsightPanelProps) {
  const guidance = error
    ? 'Resolve the connection issue before continuing. The dashboard keeps the current state visible so you can recover without losing context.'
    : loading
      ? 'Waiting for BuildFlow to finish loading source state and agent status.'
      : sourceCount === 0
        ? 'Connect a knowledge source first, then use the overview and handoff panels to continue.'
        : 'The stack is ready. Use the main panels for source management, execution flow, and prompt handoff.'

  const nextFocus = error
    ? 'Retry the load from the top bar and confirm the local agent connection.'
    : sourceCount === 0
      ? 'Add a source, then return to the overview to confirm the new workspace state.'
      : 'Keep the overview as the source of truth and use the handoff panel when you are ready.'

  return (
    <div className="w-96 border-l border-slate-200 bg-slate-50 overflow-y-auto dark:border-slate-800 dark:bg-slate-950">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4 dark:text-slate-400">Workflow Guidance</h2>
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-lg p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 dark:text-slate-400">Current Focus</div>
              <p className="text-sm text-slate-700 leading-6 dark:text-slate-300">{guidance}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 dark:text-slate-400">Next Best Action</div>
              <p className="text-sm text-slate-700 leading-6 dark:text-slate-300">{nextFocus}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 dark:text-slate-400">Handoff Readiness</h2>
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-sm text-slate-700 leading-6 dark:text-slate-300">
              Ready for handoff when the overview is healthy and a source is configured.
            </p>
            <p className="text-sm text-slate-700 leading-6 dark:text-slate-300">
              Use the Execution Handoff panel in the main column for Codex or Claude prompts.
            </p>
            <p className="text-sm text-slate-700 leading-6 dark:text-slate-300">
              If verification fails, run pnpm local:verify before continuing.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
