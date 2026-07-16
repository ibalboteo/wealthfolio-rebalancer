import { Avatar, AvatarFallback } from '@wealthfolio/ui';

interface TickerAvatarProps {
  symbol: string;
  className?: string;
}

export const TickerAvatar = ({ symbol, className = 'w-8 h-8' }: TickerAvatarProps) => {
  // Extract the base symbol (before any dot or hyphen) for display
  const baseSymbol = symbol ? symbol.split(/[.-]/)[0].toUpperCase() : '';

  return (
    <Avatar
      className={`bg-primary text-primary-foreground dark:bg-white/10 backdrop-blur-md border-white/20 p-1.5 ${className}`}
    >
      <AvatarFallback className="text-xs font-medium bg-transparent">
        {baseSymbol ? baseSymbol : '•'}
      </AvatarFallback>
    </Avatar>
  );
};
