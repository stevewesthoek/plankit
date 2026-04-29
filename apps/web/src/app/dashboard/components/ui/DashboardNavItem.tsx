import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from './classNames'

type DashboardNavItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  icon?: ReactNode
  children: ReactNode
}

export function DashboardNavItem({
  active,
  icon,
  className,
  children,
  ...props
}: DashboardNavItemProps) {
  return (
    <button
      {...props}
      type={props.type || 'button'}
      className={classNames(
        'flex h-7 w-full items-center gap-2 rounded-[10px] px-2.5 text-left text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px dark:focus-visible:ring-offset-slate-950',
        active
          ? 'bg-bf-subtle/90 text-bf-text dark:bg-slate-900/80 dark:text-slate-50'
          : 'text-slate-600 hover:bg-bf-subtle/70 dark:text-slate-400 dark:hover:bg-slate-900/55',
        className
      )}
    >
      {icon ? <span className="flex h-4 w-4 shrink-0 items-center justify-center text-current">{icon}</span> : null}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  )
}
