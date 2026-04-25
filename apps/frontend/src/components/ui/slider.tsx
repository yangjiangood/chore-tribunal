import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/shared/lib/cn'

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden border border-[color:var(--console-line)] bg-[var(--console-muted)]">
      <SliderPrimitive.Range className="absolute h-full bg-[var(--console-accent)]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 border border-[color:var(--console-accent-deep)] bg-[var(--console-paper)] shadow-[0_4px_14px_rgba(23,23,23,0.15)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--console-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--console-canvas)] disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
