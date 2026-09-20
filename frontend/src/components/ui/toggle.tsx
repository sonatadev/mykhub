import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-sm text-sm font-medium transition-colors hover:bg-muted data-[state=on]:bg-muted data-[state=on]:text-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
  {
    variants: {
      size: {
        default: 'h-8 w-8',
        sm: 'h-7 w-7',
      },
    },
    defaultVariants: { size: 'default' },
  }
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ size }), className)} {...props} />
));
Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
