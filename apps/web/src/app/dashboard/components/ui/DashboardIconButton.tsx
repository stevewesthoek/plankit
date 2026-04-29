import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from './classNames'

type DashboardIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}

export function DashboardIconButton({
  label,
  className,
  children,
  ...props
}: DashboardIconButtonProps) {
  return (
    <button
      {...props}
      type={props.type || 'button'}
      aria-label={label}
      className={classNames(
        'inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-bf-border/80 bg-bf-surface text-bf-muted transition-colors duration-150 hover:bg-bf-subtle hover:text-bf-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-slate-500/40 dark:focus-visible:ring-offset-slate-950',
        className
      )}
    >
      {children}
    </button>
  )
}
