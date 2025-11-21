import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@wealthfolio/ui';
import type { ComponentPropsWithoutRef } from 'react';

interface AvatarFallbackProps extends ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {}

function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted',
        className
      )}
      {...props}
    />
  );
}

export { AvatarFallback };
export type { AvatarFallbackProps };
