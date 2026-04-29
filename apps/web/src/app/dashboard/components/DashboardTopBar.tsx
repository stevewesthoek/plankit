import type { ReactNode } from 'react'

import { getAgentHealthClassName, getAgentHealthLabel } from '../helpers'

type DashboardTopBarProps = {
  currentSectionLabel: string
  activeModeLabel: string
  writeModeLabel: string
  sourceCount: number
  agentConnected: boolean
  mutationError: string | null
  mutationNotice: string | null
  error: string | null
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onRefresh: () => void
  children?: ReactNode
}

export function DashboardTopBar({
  currentSectionLabel,
  activeModeLabel,
  writeModeLabel,
  sourceCount,
  agentConnected,
  mutationError,
  mutationNotice,
  error,
  theme,
  onToggleTheme,
  onRefresh,
  children
}: DashboardTopBarProps) {
  return (
    <div className="shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-950/88">
      <div className="flex h-14 items-center justify-between gap-4 px-5 lg:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              BuildFlow
            </span>
            <span>{currentSectionLabel}</span>
          </div>
          <h1 className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">BuildFlow Local dashboard</h1>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 xl:flex">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {sourceCount} sources
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {activeModeLabel}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {writeModeLabel}
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              agentConnected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${getAgentHealthClassName(agentConnected)}`} />
            {getAgentHealthLabel(agentConnected)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {children}
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={`Switch dashboard theme to ${theme === 'dark' ? 'light' : 'dark'}`}
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </div>

      {(mutationError || mutationNotice || error) && (
        <div className="border-t border-slate-200 px-5 py-2 text-[11px] lg:px-6 dark:border-slate-800">
          <div className="flex min-h-5 items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className={`h-1.5 w-1.5 rounded-full ${mutationError || error ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="truncate">
              {mutationError
                ? mutationError
                : mutationNotice
                  ? mutationNotice
                  : error || 'Source state is up to date.'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
