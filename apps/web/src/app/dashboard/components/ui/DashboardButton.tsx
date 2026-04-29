import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from './classNames'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type DashboardButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'border-bf-accent bg-bf-accent text-white hover:opacity-90 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100',
  secondary: 'border-bf-border bg-bf-surface text-bf-text hover:bg-bf-subtle dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
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
        'inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </button>
  )
}
