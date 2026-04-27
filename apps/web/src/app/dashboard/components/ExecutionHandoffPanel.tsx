type ExecutionHandoffPanelProps = {
  codexPrompt: string
  claudeCodePrompt: string
  handoffCopyStatus: 'idle' | 'codex-copied' | 'claude-copied' | 'error'
  onCopyCodex: () => void
  onCopyClaude: () => void
}

export function ExecutionHandoffPanel({
  codexPrompt,
  claudeCodePrompt,
  handoffCopyStatus,
  onCopyCodex,
  onCopyClaude
}: ExecutionHandoffPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-base font-semibold text-slate-900 mb-2 dark:text-slate-50">Execution Handoff</h2>
      <p className="text-slate-600 text-sm mb-6 dark:text-slate-300">
        Copy-ready prompts for Codex CLI or Claude Code. Paste into your local terminal or IDE extension.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 dark:text-slate-50">Codex CLI</h3>
          <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 max-h-40 overflow-y-auto dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap dark:text-slate-300">{codexPrompt}</p>
          </div>
          <button
            type="button"
            onClick={onCopyCodex}
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {handoffCopyStatus === 'codex-copied' ? 'Copied!' : 'Copy prompt'}
          </button>
        </div>

        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 dark:text-slate-50">Claude Code</h3>
          <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 max-h-40 overflow-y-auto dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap dark:text-slate-300">{claudeCodePrompt}</p>
          </div>
          <button
            type="button"
            onClick={onCopyClaude}
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {handoffCopyStatus === 'claude-copied' ? 'Copied!' : 'Copy prompt'}
          </button>
        </div>
      </div>

      {handoffCopyStatus !== 'idle' && (
        <div aria-live="polite" className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/50">
          {handoffCopyStatus === 'codex-copied' && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Codex prompt copied to clipboard.</p>
          )}
          {handoffCopyStatus === 'claude-copied' && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Claude Code prompt copied to clipboard.</p>
          )}
          {handoffCopyStatus === 'error' && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Unable to copy prompt. Select the text manually.</p>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          For free GitHub use, copy the prompt and run in your terminal: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono dark:bg-slate-800 dark:text-slate-200">codex [pasted prompt]</code> or use Claude Code extension.
        </p>
      </div>
    </div>
  )
}
