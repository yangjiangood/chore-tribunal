import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cn } from '@/shared/lib/cn'

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 items-center border border-[color:var(--console-line)] bg-[var(--console-muted)] transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--console-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--console-canvas)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-[var(--console-accent)] data-[state=checked]:border-[color:var(--console-accent-deep)]',
      className,
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 translate-x-1 border border-[color:var(--console-line)] bg-[var(--console-paper)] shadow-sm ring-0 transition-transform',
        'data-[state=checked]:translate-x-6 data-[state=checked]:border-[color:var(--console-accent-deep)]',
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
