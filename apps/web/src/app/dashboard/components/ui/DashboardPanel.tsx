import type { ReactNode } from 'react'
import { classNames } from './classNames'

type DashboardPanelProps = {
  className?: string
  children: ReactNode
  variant?: 'default' | 'flat' | 'raised'
}

const VARIANT_CLASSES: Record<NonNullable<DashboardPanelProps['variant']>, string> = {
  default: 'border border-bf-border/55 bg-bf-surface/92 text-bf-text dark:border-slate-800/60 dark:bg-slate-950/30',
  flat: 'bg-bf-surface/70 text-bf-text dark:bg-slate-950/22',
  raised: 'border border-bf-border/55 bg-bf-surface/98 text-bf-text shadow-[0_14px_34px_-28px_rgba(15,23,42,0.20)] dark:border-slate-800/60 dark:bg-slate-900/88 dark:shadow-[0_14px_34px_-28px_rgba(15,23,42,0.40)]'
}

export function DashboardPanel({ className, children, variant = 'default' }: DashboardPanelProps) {
  return (
    <section className={classNames('rounded-lg', VARIANT_CLASSES[variant], className)}>
      {children}
    </section>
  )
}
