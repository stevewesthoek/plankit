export function InfoPanels() {
  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm dark:border-blue-950/50 dark:bg-blue-950/20">
        <h2 className="text-base font-semibold text-blue-900 mb-2 dark:text-blue-200">Execution Modes</h2>
        <p className="text-blue-800 text-sm dark:text-blue-100">BuildFlow supports two execution modes for ChatGPT Actions:</p>
        <ul className="text-blue-800 text-xs space-y-1 mt-3 ml-4 dark:text-blue-100">
          <li>• <strong>direct-agent (default):</strong> Web app calls local agent directly on port 3052</li>
          <li>• <strong>relay-agent (Phase 5C+):</strong> Web app calls relay on port 3053, which routes to agent via WebSocket. Requires matching RELAY_PROXY_TOKEN on both sides.</li>
        </ul>
        <p className="text-blue-700 text-xs mt-3 dark:text-blue-200">
          Set mode via <code className="bg-blue-100 px-1 rounded dark:bg-blue-900/60 dark:text-blue-100">BUILDFLOW_BACKEND_MODE</code> environment variable.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-base font-semibold text-slate-900 mb-4 dark:text-slate-50">Getting Started</h2>
        <div className="space-y-5">
          <div>
            <h3 className="font-medium text-slate-900 mb-2 text-sm dark:text-slate-50">1. Install and Initialize</h3>
            <code className="bg-slate-100 p-2.5 rounded-lg block text-xs mb-2 text-slate-800 dark:bg-slate-950 dark:text-slate-200">npm install -g buildflow</code>
            <code className="bg-slate-100 p-2.5 rounded-lg block text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-200">buildflow init</code>
          </div>
          <div>
            <h3 className="font-medium text-slate-900 mb-2 text-sm dark:text-slate-50">2. Add Knowledge Sources</h3>
            <p className="text-slate-600 text-xs mb-2 dark:text-slate-300">Connect local folders to search and read from:</p>
            <code className="bg-slate-100 p-2.5 rounded-lg block text-xs mb-2 text-slate-800 dark:bg-slate-950 dark:text-slate-200">buildflow connect ~/my-vault</code>
            <p className="text-slate-600 text-xs dark:text-slate-300">Repeat to add multiple sources (Brain, Mind, docs, etc.)</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900 mb-2 text-sm dark:text-slate-50">3. Start the Agent</h3>
            <code className="bg-slate-100 p-2.5 rounded-lg block text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-200">buildflow serve</code>
            <p className="text-slate-600 text-xs mt-2 dark:text-slate-300">Agent listens on http://127.0.0.1:3052</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900 mb-2 text-sm dark:text-slate-50">4. Configure ChatGPT Custom Actions</h3>
            <p className="text-slate-600 text-xs dark:text-slate-300">Import the OpenAPI schema and set Bearer token authentication. All configured sources will be searched together.</p>
          </div>
        </div>
      </div>
    </>
  )
}
