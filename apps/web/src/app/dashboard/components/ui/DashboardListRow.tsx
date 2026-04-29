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
        'flex min-h-7 items-center gap-2 rounded-md px-3 py-1.5 text-[12px] transition-colors duration-150 hover:bg-bf-subtle/70 dark:hover:bg-slate-900/45',
        className
      )}
    >
      {children}
    </div>
  )
}
