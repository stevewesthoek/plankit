import type { ReactNode } from 'react'
import { classNames } from './classNames'

type DashboardListRowProps = {
  children: ReactNode
  className?: string
}

export function DashboardListRow({ children, className }: DashboardListRowProps) {
  return (
    <div
      className={classNames(
        'flex min-h-8 items-center gap-2 border-b border-bf-border px-3 py-2 text-sm transition-colors duration-150 last:border-b-0 hover:bg-bf-subtle dark:hover:bg-slate-900/40',
        className
      )}
    >
      {children}
    </div>
  )
}
