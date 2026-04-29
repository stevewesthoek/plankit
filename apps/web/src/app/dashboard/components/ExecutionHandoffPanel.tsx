import { Copy, Languages } from 'lucide-react'

import { DashboardButton } from './ui/DashboardButton'
import { DashboardCodeText } from './ui/DashboardCodeText'
import { DashboardPanel } from './ui/DashboardPanel'
import { DashboardSectionHeader } from './ui/DashboardSectionHeader'

type ExecutionHandoffPanelProps = {
  codexPrompt: string
  claudeCodePrompt: string
  handoffCopyStatus: 'idle' | 'codex-copied' | 'claude-copied' | 'error'
  currentSectionLabel: string
  selectedSourceLabel: string | null
  activeModeLabel: string
  writeModeLabel: string
  sourceSummaryLabel: string
  onCopyCodex: () => void
  onCopyClaude: () => void
}

const statusLabelByCopyStatus: Record<ExecutionHandoffPanelProps['handoffCopyStatus'], string> = {
  idle: 'Ready to copy',
  'codex-copied': 'Codex prompt copied',
  'claude-copied': 'Claude prompt copied',
  error: 'Copy failed'
}

export function ExecutionHandoffPanel({
  codexPrompt,
  claudeCodePrompt,
  handoffCopyStatus,
  currentSectionLabel,
  selectedSourceLabel,
  activeModeLabel,
  writeModeLabel,
  sourceSummaryLabel,
  onCopyCodex,
  onCopyClaude
}: ExecutionHandoffPanelProps) {
  const contextLabel = selectedSourceLabel || 'workspace'
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <DashboardPanel variant="flat" className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DashboardSectionHeader
            eyebrow="Handoff"
            title="Copy-ready execution prompts"
            detail={statusLabelByCopyStatus[handoffCopyStatus]}
          />
          <div className="text-right text-[11px] leading-5 text-bf-muted dark:text-slate-400">
            <div className="truncate">Prompt source: {currentSectionLabel}</div>
            <div className="truncate">Context: {contextLabel} · {activeModeLabel} · {writeModeLabel}</div>
          </div>
        </div>
      </DashboardPanel>

      <div className="grid gap-3 xl:grid-cols-2">
        <DashboardPanel variant="flat" className="flex min-h-0 flex-col p-4">
          <DashboardSectionHeader
            title="Codex"
            detail={`Use for scoped implementation or review · ${sourceSummaryLabel}`}
            action={
              <DashboardButton type="button" onClick={onCopyCodex} variant="secondary" className="gap-1.5">
                <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                Copy
              </DashboardButton>
            }
          />
          <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-lg border border-bf-border/70 bg-bf-subtle/40 dark:border-slate-800/70 dark:bg-slate-950/30">
            <div className="max-h-[26rem] overflow-y-auto p-3">
              <DashboardCodeText className="block whitespace-pre-wrap break-words text-[12px] leading-5 text-bf-text dark:text-slate-200">
                {codexPrompt}
              </DashboardCodeText>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel variant="flat" className="flex min-h-0 flex-col p-4">
          <DashboardSectionHeader
            title="Claude Code"
            detail={`Use for long-context orchestration or repo-wide work · ${sourceSummaryLabel}`}
            action={
              <DashboardButton type="button" onClick={onCopyClaude} variant="secondary" className="gap-1.5">
                <Languages className="h-3.5 w-3.5" strokeWidth={1.8} />
                Copy
              </DashboardButton>
            }
          />
          <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-lg border border-bf-border/70 bg-bf-subtle/40 dark:border-slate-800/70 dark:bg-slate-950/30">
            <div className="max-h-[26rem] overflow-y-auto p-3">
              <DashboardCodeText className="block whitespace-pre-wrap break-words text-[12px] leading-5 text-bf-text dark:text-slate-200">
                {claudeCodePrompt}
              </DashboardCodeText>
            </div>
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}
