import type { ReactNode } from 'react'

import { getAgentHealthClassName, getAgentHealthLabel } from '../helpers'

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
    <div className="shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-950/88">
      <div className="flex h-12 items-center justify-between gap-3 px-4 lg:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="text-slate-700 dark:text-slate-200">BuildFlow</span>
            <span>·</span>
            <span>{currentSectionLabel}</span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 xl:flex">
          <span className={`h-1.5 w-1.5 rounded-full ${getAgentHealthClassName(agentConnected)}`} />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {getAgentHealthLabel(agentConnected)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {children}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Refresh dashboard"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={`Switch dashboard theme to ${theme === 'dark' ? 'light' : 'dark'}`}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      {statusText && (
        <div className="border-t border-slate-200 px-5 py-2 text-[11px] lg:px-6 dark:border-slate-800">
          <div className="flex min-h-5 items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className={`h-1.5 w-1.5 rounded-full ${/error|unable|fail|disconnect/i.test(statusText) ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="truncate">
              {statusText}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
