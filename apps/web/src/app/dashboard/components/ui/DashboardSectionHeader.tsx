import type { ReactNode } from 'react'
import { classNames } from './classNames'

type DashboardSectionHeaderProps = {
  eyebrow?: string
  title: string
  detail?: string
  action?: ReactNode
  className?: string
}

export function DashboardSectionHeader({
  eyebrow,
  title,
  detail,
  action,
  className
}: DashboardSectionHeaderProps) {
  return (
    <div className={classNames('flex items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bf-muted">{eyebrow}</div> : null}
        <h2 className="truncate text-sm font-semibold text-bf-text dark:text-slate-50">{title}</h2>
        {detail ? <p className="mt-0.5 truncate text-xs text-bf-muted">{detail}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
