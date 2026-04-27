export function ExecutionFlowPreview() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-base font-semibold text-slate-900 mb-2 dark:text-slate-50">Execution Flow</h2>
      <p className="text-slate-600 text-sm mb-6 dark:text-slate-300">
        Preview how BuildFlow will track plan progress once a plan is loaded.
      </p>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 dark:text-slate-400">Task States</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            ['pending', 'Queued to start', 'bg-slate-400'],
            ['active', 'In progress', 'bg-blue-500'],
            ['done', 'Completed', 'bg-emerald-500'],
            ['blocked', 'Needs attention', 'bg-amber-500'],
            ['failed', 'Error occurred', 'bg-red-500'],
            ['verified', 'Confirmed good', 'bg-emerald-600'],
            ['paused', 'Waiting', 'bg-slate-500']
          ].map(([label, description, dotClass]) => (
            <div key={label} className="flex items-start gap-2 px-3 py-2 rounded-md bg-slate-50 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50">
              <div className={`w-2 h-2 rounded-full ${dotClass} mt-1.5 flex-shrink-0`} />
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-900 dark:text-slate-50">{label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 dark:text-slate-400">Execution Timeline</h3>
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
          <p className="text-sm text-slate-600 dark:text-slate-300">No execution flow yet.</p>
          <p className="text-xs text-slate-500 mt-2 dark:text-slate-400">Load a plan to preview tasks, status, and progress here.</p>
        </div>
      </div>
    </div>
  )
}
