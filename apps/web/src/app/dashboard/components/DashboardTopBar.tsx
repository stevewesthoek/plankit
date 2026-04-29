import type { ReactNode } from 'react'
import { Moon, RefreshCw, Sun } from 'lucide-react'

import { getAgentHealthLabel } from '../helpers'
import { DashboardIconButton } from './ui/DashboardIconButton'
import { DashboardStatusDot } from './ui/DashboardStatusDot'

type DashboardTopBarProps = {
  currentSectionLabel: string
  agentConnected: boolean
  statusText?: string | null
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onRefresh: () => void
  children?: ReactNode
}

export function DashboardTopBar({
  currentSectionLabel,
  agentConnected,
  statusText,
  theme,
  onToggleTheme,
  onRefresh,
  children
}: DashboardTopBarProps) {
  return (
    <div className="shrink-0 border-b border-bf-border bg-bf-surface/95 backdrop-blur supports-[backdrop-filter]:bg-bf-surface/90 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex h-12 items-center justify-between gap-3 px-4 lg:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="text-slate-700 dark:text-slate-200">BuildFlow</span>
            <span>·</span>
            <span>{currentSectionLabel}</span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 xl:flex">
          <DashboardStatusDot tone={agentConnected ? 'good' : 'neutral'} />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {getAgentHealthLabel(agentConnected)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {children}
          <DashboardIconButton
            type="button"
            onClick={onRefresh}
            label="Refresh dashboard"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
          </DashboardIconButton>
          <DashboardIconButton
            type="button"
            onClick={onToggleTheme}
            label={`Switch dashboard theme to ${theme === 'dark' ? 'light' : 'dark'}`}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Moon className="h-3.5 w-3.5" strokeWidth={1.8} />}
          </DashboardIconButton>
        </div>
      </div>

      {statusText && (
        <div className="border-t border-bf-border bg-bf-subtle px-5 py-2 text-[11px] dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex min-h-5 items-center gap-2 text-bf-muted dark:text-slate-300">
            <span className={`h-1.5 w-1.5 rounded-full ${/error|unable|fail|disconnect/i.test(statusText) ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="truncate">{statusText}</span>
          </div>
        </div>
      )}
    </div>
  )
}
