import type { ReactNode } from 'react'
import { classNames } from './classNames'

type DashboardCodeTextProps = {
  children: ReactNode
  className?: string
}

export function DashboardCodeText({ children, className }: DashboardCodeTextProps) {
  return <span className={classNames('font-mono-ui text-[12px] leading-5', className)}>{children}</span>
}
