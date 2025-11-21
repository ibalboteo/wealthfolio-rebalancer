import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@wealthfolio/ui';
import type { ComponentPropsWithoutRef } from 'react';

interface AvatarProps extends ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {}

function Avatar({ className, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
}

export { Avatar };
export type { AvatarProps };
