import * as React from 'react'
import { cn } from '@/shared/lib/cn'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-11 w-full rounded-none border border-[color:var(--console-line)] bg-[var(--console-paper)] px-3 py-2 text-sm text-[var(--console-ink)]',
          'placeholder:text-[var(--console-ink-faint)] selection:bg-[var(--console-accent)] selection:text-[var(--console-accent-ink)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--console-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--console-canvas)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
