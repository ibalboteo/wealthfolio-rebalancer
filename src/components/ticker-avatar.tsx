import { Avatar, AvatarFallback } from '@wealthfolio/ui';

interface TickerAvatarProps {
  symbol: string;
  className?: string;
}

export const TickerAvatar = ({ symbol, className = 'w-8 h-8' }: TickerAvatarProps) => {
  // Extract the base symbol (before any dot or hyphen) for display
  const baseSymbol = symbol ? symbol.split(/[.-]/)[0].toUpperCase() : '';

  return (
    <Avatar className={`bg-muted text-muted-foreground border border-border p-1.5 ${className}`}>
      <AvatarFallback className="text-xs font-medium bg-transparent">
        {baseSymbol ? baseSymbol : '•'}
      </AvatarFallback>
    </Avatar>
  );
};
