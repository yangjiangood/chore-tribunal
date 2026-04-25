import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/cn'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border text-sm font-medium',
    'cursor-pointer touch-manipulation transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out',
    'hover:-translate-y-px active:translate-y-0 active:scale-[0.985]',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--console-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--console-canvas)]',
  ],
  {
    variants: {
      variant: {
        default:
          'border-[color:var(--console-line)] bg-[var(--console-panel)] text-[var(--console-ink)] hover:bg-[var(--console-paper)]',
        primary:
          'border-[color:var(--console-accent-deep)] bg-[var(--console-accent)] text-[var(--console-accent-ink)] hover:bg-[var(--console-accent-deep)]',
        subtle:
          'border-[color:var(--console-line-soft)] bg-[var(--console-muted)] text-[var(--console-ink-soft)] hover:bg-[var(--console-paper)]',
        ghost:
          'border-transparent bg-transparent text-[var(--console-ink-soft)] hover:border-[color:var(--console-line-soft)] hover:bg-[var(--console-muted)]',
        danger:
          'border-[color:var(--console-danger-deep)] bg-[var(--console-danger)] text-white hover:bg-[var(--console-danger-deep)]',
      },
      size: {
        sm: 'h-9 px-3',
        default: 'h-11 px-4',
        lg: 'h-12 px-5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  },
)
Button.displayName = 'Button'

export { Button }
