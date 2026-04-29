import type { ReactNode } from 'react'
import { classNames } from './classNames'

type DashboardPanelProps = {
  className?: string
  children: ReactNode
}

export function DashboardPanel({ className, children }: DashboardPanelProps) {
  return (
    <section className={classNames('rounded-xl border border-bf-border bg-bf-surface text-bf-text dark:bg-bf-surface/90', className)}>
      {children}
    </section>
  )
}
