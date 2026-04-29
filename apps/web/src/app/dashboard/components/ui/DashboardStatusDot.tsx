import { classNames } from './classNames'

type DashboardStatusDotProps = {
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
  className?: string
}

const TONE_CLASSES: Record<NonNullable<DashboardStatusDotProps['tone']>, string> = {
  neutral: 'bg-slate-400 dark:bg-slate-500',
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500'
}

export function DashboardStatusDot({ tone = 'neutral', className }: DashboardStatusDotProps) {
  return <span className={classNames('inline-block h-1.5 w-1.5 rounded-full', TONE_CLASSES[tone], className)} />
}
