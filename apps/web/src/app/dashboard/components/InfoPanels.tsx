export function InfoPanels() {
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Execution modes</h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">direct-agent: local agent (3052) | relay-agent: via relay (3053)</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Set via <code className="rounded bg-slate-100 px-1 dark:bg-slate-950 dark:text-slate-100">BUILDFLOW_BACKEND_MODE</code>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Local setup</h2>
        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
          <li>• <code className="rounded bg-slate-100 px-1 dark:bg-slate-950">pnpm install</code></li>
          <li>• <code className="rounded bg-slate-100 px-1 dark:bg-slate-950">pnpm local:restart</code></li>
          <li>• Open <code className="rounded bg-slate-100 px-1 dark:bg-slate-950">http://127.0.0.1:3054</code></li>
          <li>• See README.md for source setup and ChatGPT import</li>
        </ul>
      </div>
    </>
  )
}
