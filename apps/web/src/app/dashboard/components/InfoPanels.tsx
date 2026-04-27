export function InfoPanels() {
  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:border-blue-950/50 dark:bg-blue-950/20">
        <h2 className="text-sm font-semibold text-blue-900 mb-1 dark:text-blue-200">Execution Modes</h2>
        <p className="text-blue-800 text-xs dark:text-blue-100">direct-agent: local agent (3052) | relay-agent: via relay (3053)</p>
        <p className="text-blue-700 text-xs mt-2 dark:text-blue-200">
          Set via <code className="bg-blue-100 px-1 rounded dark:bg-blue-900/60 dark:text-blue-100">BUILDFLOW_BACKEND_MODE</code>
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-sm font-semibold text-slate-900 mb-2 dark:text-slate-50">Local Setup</h2>
        <ul className="text-xs text-slate-600 space-y-1 dark:text-slate-300">
          <li>• <code className="bg-slate-100 px-1 rounded dark:bg-slate-950">pnpm install</code></li>
          <li>• <code className="bg-slate-100 px-1 rounded dark:bg-slate-950">pnpm local:restart</code></li>
          <li>• Open <code className="bg-slate-100 px-1 rounded dark:bg-slate-950">http://127.0.0.1:3054</code></li>
          <li>• See README.md for source setup and ChatGPT import</li>
        </ul>
      </div>
    </>
  )
}
