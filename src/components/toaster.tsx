import { Icons } from '@wealthfolio/ui';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  // Default to system theme since we don't have access to settings context
  const theme: 'light' | 'dark' | 'system' = 'system';

  return (
    <Sonner
      theme={theme}
      position="top-center"
      className="toaster group"
      expand={true}
      richColors
      icons={{
        success: <Icons.CheckCircle className="size-4" />,
        info: <Icons.Info className="size-4" />,
        warning: <Icons.AlertTriangle className="size-4" />,
        error: <Icons.XCircle className="size-4" />,
        loading: <Icons.Loader className="size-4 animate-spin" />,
        close: <Icons.Close className="size-4" />,
      }}
      toastOptions={{
        classNames: {
          closeButton: '!absolute !top-2 !right-2 !left-auto !transform-none !border-none',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--toast-bg, hsl(var(--background)))',
          '--normal-text': 'var(--toast-fg, hsl(var(--foreground)))',
          '--normal-border': 'var(--toast-border, hsl(var(--border)))',
          '--border-radius': 'var(--radius, 0.5rem)',
          '--success-bg': 'var(--toast-success-bg, hsl(var(--background)))',
          '--success-text': 'var(--toast-success-fg, hsl(var(--foreground)))',
          '--success-border': 'var(--toast-success-border, hsl(var(--border)))',
          '--error-bg': 'var(--toast-error-bg, hsl(var(--background)))',
          '--error-text': 'var(--toast-error-fg, hsl(var(--foreground)))',
          '--error-border': 'var(--toast-error-border, hsl(var(--border)))',
          '--warning-bg': 'var(--toast-warning-bg, hsl(var(--background)))',
          '--warning-text': 'var(--toast-warning-fg, hsl(var(--foreground)))',
          '--warning-border': 'var(--toast-warning-border, hsl(var(--border)))',
          '--info-bg': 'var(--toast-info-bg, hsl(var(--background)))',
          '--info-text': 'var(--toast-info-fg, hsl(var(--foreground)))',
          '--info-border': 'var(--toast-info-border, hsl(var(--border)))',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
