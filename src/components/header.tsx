import { cn } from '@wealthfolio/ui';
import type { ReactNode } from 'react';

interface ApplicationHeaderProps {
  heading: string;
  headingPrefix?: string;
  text?: string;
  className?: string;
  children?: ReactNode;
}

export function ApplicationHeader({
  heading,
  headingPrefix,
  text,
  className,
  children,
}: ApplicationHeaderProps) {
  return (
    <div className={cn('flex w-full items-center justify-between', className)}>
      <div className="flex items-center gap-2">
        <div data-tauri-drag-region="true" className="draggable flex items-center space-x-4">
          {headingPrefix && (
            <>
              <h1 className="font-heading text-xl font-bold tracking-tight text-muted-foreground">
                {headingPrefix}
              </h1>
              <span className="h-6 border-l-2"></span>
            </>
          )}

          <h1 className="font-heading text-xl font-bold tracking-tight">{heading}</h1>
          {text && <p className="ml-4 text-lg font-light text-muted-foreground">{text}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
