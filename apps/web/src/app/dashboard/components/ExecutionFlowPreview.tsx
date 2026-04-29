export function ExecutionFlowPreview() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Execution states</h3>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {[
          ['pending', 'bg-slate-400'],
          ['active', 'bg-blue-500'],
          ['done', 'bg-emerald-500'],
          ['blocked', 'bg-amber-500'],
          ['failed', 'bg-red-500'],
          ['verified', 'bg-emerald-600'],
          ['paused', 'bg-slate-500']
        ].map(([label, dotClass]) => (
          <div key={label} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950/50">
            <div className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`} />
            <div className="font-medium text-slate-900 dark:text-slate-50 truncate">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">Load a plan to see task progress here.</p>
    </div>
  )
}
