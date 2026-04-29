import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from './classNames'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type DashboardButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'border-bf-accent bg-bf-accent text-white shadow-[0_1px_2px_rgba(15,23,42,0.10)] hover:bg-slate-800 hover:text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 dark:hover:bg-slate-200 dark:hover:text-slate-900',
  secondary: 'border-bf-border/80 bg-bf-surface text-bf-text hover:bg-bf-subtle dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost: 'border-transparent bg-transparent text-bf-text hover:bg-bf-subtle dark:text-slate-200 dark:hover:bg-slate-900',
  danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200 dark:hover:bg-red-950/30'
}

export function DashboardButton({
  variant = 'secondary',
  className,
  children,
  ...props
}: DashboardButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        'inline-flex h-7 items-center justify-center rounded-[10px] border px-2.5 text-[12px] font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px dark:focus-visible:ring-slate-500/40 dark:focus-visible:ring-offset-slate-950',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </button>
  )
}
