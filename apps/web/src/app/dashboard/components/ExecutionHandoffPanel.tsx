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
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <h3 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Codex CLI</h3>
        <div className="mb-3 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
          <p className="whitespace-pre-wrap font-mono text-xs text-slate-700 dark:text-slate-300">{codexPrompt}</p>
        </div>
        <button
          type="button"
          onClick={onCopyCodex}
          className="shrink-0 rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {handoffCopyStatus === 'codex-copied' ? 'Copied!' : 'Copy prompt'}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <h3 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Claude Code</h3>
        <div className="mb-3 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
          <p className="whitespace-pre-wrap font-mono text-xs text-slate-700 dark:text-slate-300">{claudeCodePrompt}</p>
        </div>
        <button
          type="button"
          onClick={onCopyClaude}
          className="shrink-0 rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {handoffCopyStatus === 'claude-copied' ? 'Copied!' : 'Copy prompt'}
        </button>
      </div>

      {handoffCopyStatus !== 'idle' && (
        <div aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs dark:border-emerald-900 dark:bg-emerald-950/20">
          {handoffCopyStatus === 'codex-copied' && (
            <p className="font-medium text-emerald-800 dark:text-emerald-200">Codex prompt copied!</p>
          )}
          {handoffCopyStatus === 'claude-copied' && (
            <p className="font-medium text-emerald-800 dark:text-emerald-200">Claude Code prompt copied!</p>
          )}
          {handoffCopyStatus === 'error' && (
            <p className="font-medium text-amber-800 dark:text-amber-200">Unable to copy. Select manually.</p>
          )}
        </div>
      )}
    </div>
  )
}
