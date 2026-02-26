import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import ClickSpark from './ClickSpark'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-blue-600',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border border-gray-200 bg-white text-gray-700 shadow-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700',
        secondary:
          'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg shadow-blue-500/25 hover:from-blue-600 hover:to-emerald-600',
        ghost:
          'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800/80',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-5 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-4 has-[>svg]:px-2.5',
        lg: 'h-11 px-8 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <ClickSpark
      sparkColor="#fff"
      sparkSize={16}
      sparkRadius={32}
      sparkCount={12}
      duration={520}
    >
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    </ClickSpark>
  )
}

export { Button, buttonVariants }
