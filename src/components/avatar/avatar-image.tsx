import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@wealthfolio/ui';
import type { ComponentPropsWithoutRef } from 'react';

interface AvatarImageProps extends ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {}

function AvatarImage({ className, ...props }: AvatarImageProps) {
  return (
    <AvatarPrimitive.Image className={cn('aspect-square h-full w-full', className)} {...props} />
  );
}

export { AvatarImage };
export type { AvatarImageProps };
