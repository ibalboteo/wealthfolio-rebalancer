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
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div
          data-tauri-drag-region="true"
          className="draggable flex items-center space-x-4 min-w-0"
        >
          {headingPrefix && (
            <>
              <h1 className="font-heading text-xl font-bold tracking-tight text-muted-foreground">
                {headingPrefix}
              </h1>
              <span className="h-6 border-l-2"></span>
            </>
          )}

          <h1 className="font-heading text-xl font-bold tracking-tight truncate">{heading}</h1>
        </div>
        {text && (
          <p className="hidden sm:block text-sm sm:text-base font-light text-muted-foreground">
            {text}
          </p>
        )}
      </div>
      {children && <div className="flex-shrink-0 ml-4">{children}</div>}
    </div>
  );
}
