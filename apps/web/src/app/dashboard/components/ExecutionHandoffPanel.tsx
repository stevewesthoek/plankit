import { Copy, Languages } from 'lucide-react'

import { DashboardButton } from './ui/DashboardButton'
import { DashboardCodeText } from './ui/DashboardCodeText'
import { DashboardPanel } from './ui/DashboardPanel'
import { DashboardSectionHeader } from './ui/DashboardSectionHeader'

type ExecutionHandoffPanelProps = {
  codexPrompt: string
  claudeCodePrompt: string
  handoffCopyStatus: 'idle' | 'codex-copied' | 'claude-copied' | 'error'
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
  onCopyCodex,
  onCopyClaude
}: ExecutionHandoffPanelProps) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <DashboardPanel className="p-4">
        <DashboardSectionHeader
          eyebrow="Handoff"
          title="Copy-ready execution prompts"
          detail={statusLabelByCopyStatus[handoffCopyStatus]}
        />
      </DashboardPanel>

      <div className="grid gap-3 xl:grid-cols-2">
        <DashboardPanel className="flex min-h-0 flex-col p-4">
          <DashboardSectionHeader
            title="Codex"
            detail="Use for scoped implementation or review."
            action={
              <DashboardButton type="button" onClick={onCopyCodex} variant="secondary" className="gap-1.5">
                <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                Copy
              </DashboardButton>
            }
          />
          <div className="mt-3 rounded-lg border border-bf-border bg-bf-subtle p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <DashboardCodeText className="whitespace-pre-wrap break-words text-[12px] leading-5 text-bf-text dark:text-slate-200">
              {codexPrompt}
            </DashboardCodeText>
          </div>
        </DashboardPanel>

        <DashboardPanel className="flex min-h-0 flex-col p-4">
          <DashboardSectionHeader
            title="Claude Code"
            detail="Use for long-context orchestration or repo-wide work."
            action={
              <DashboardButton type="button" onClick={onCopyClaude} variant="secondary" className="gap-1.5">
                <Languages className="h-3.5 w-3.5" strokeWidth={1.8} />
                Copy
              </DashboardButton>
            }
          />
          <div className="mt-3 rounded-lg border border-bf-border bg-bf-subtle p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <DashboardCodeText className="whitespace-pre-wrap break-words text-[12px] leading-5 text-bf-text dark:text-slate-200">
              {claudeCodePrompt}
            </DashboardCodeText>
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}
