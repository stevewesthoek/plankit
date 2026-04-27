import type { ReactNode } from 'react'

type DashboardShellProps = {
  leftRail: ReactNode
  mainContent: ReactNode
  rightPanel: ReactNode
}

export function DashboardShell({ leftRail, mainContent, rightPanel }: DashboardShellProps) {
  return (
    <div className="flex flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
      {leftRail}
      {mainContent}
      {rightPanel}
    </div>
  )
}
