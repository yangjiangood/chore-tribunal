import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface ConsoleSectionProps {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function ConsoleSection({
  eyebrow,
  title,
  description,
  children,
  className,
}: ConsoleSectionProps) {
  return (
    <section className={cn('console-section', className)}>
      <header className="console-section__header">
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        {description ? <span>{description}</span> : null}
      </header>
      {children}
    </section>
  )
}
