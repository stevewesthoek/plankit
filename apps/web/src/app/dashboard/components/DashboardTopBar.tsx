import type { ReactNode } from 'react'

import { getAgentHealthClassName, getAgentHealthLabel } from '../helpers'

type DashboardTopBarProps = {
  agentConnected: boolean
  mutationError: string | null
  mutationNotice: string | null
  error: string | null
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  children?: ReactNode
}

export function DashboardTopBar({
  agentConnected,
  mutationError,
  mutationNotice,
  error,
  theme,
  onToggleTheme,
  children
}: DashboardTopBarProps) {
  return (
    <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 dark:border-slate-800 dark:bg-slate-950/90">
      <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50">BuildFlow Dashboard</h1>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label={`Switch dashboard theme to ${theme === 'dark' ? 'light' : 'dark'}`}
        >
          Theme: {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
        {children}
        {mutationError && (
          <div className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
            Error: {mutationError.split(':')[0]}
          </div>
        )}
        {mutationNotice && !error && (
          <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
            {mutationNotice}
          </div>
        )}
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${
            agentConnected
              ? 'bg-emerald-50 border-emerald-200 dark:border-emerald-900/40 dark:bg-emerald-950/30'
              : 'bg-slate-100 border-slate-300 dark:border-slate-700 dark:bg-slate-900'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${getAgentHealthClassName(agentConnected)}`} />
          <span className={`text-xs font-medium ${agentConnected ? 'text-emerald-700 dark:text-emerald-200' : 'text-slate-600 dark:text-slate-300'}`}>
            {getAgentHealthLabel(agentConnected)}
          </span>
        </div>
      </div>
    </div>
  )
}
