import { AmountDisplay, Card, Icons } from '@wealthfolio/ui';
import type { RebalanceAction } from '../lib';
import { TickerAvatar } from './ticker-avatar';

export function TransferCard({ from, to, amount, currency }: RebalanceAction) {
  return (
    <Card className="rounded-lg border bg-card text-card-foreground shadow-md p-6 flex flex-col gap-4 h-64">
      <div className="flex items-center gap-4">
        <TickerAvatar
          symbol={from.instrument?.symbol || `$${from.holdingType}`}
          className="w-12 h-12"
        />
        <div className="grow flex flex-col min-w-0">
          <h3 className="text-sm font-semibold truncate">
            {from.instrument?.name || from.holdingType}
          </h3>
          <span className="text-xs text-muted-foreground truncate">{from.instrument?.symbol}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 justify-center flex-1">
        <Icons.ArrowDown className="w-8 h-8 mx-2 text-muted-foreground" />
        <AmountDisplay value={amount} currency={currency} className="text-xl font-bold" />
      </div>
      <div className="flex items-center gap-4">
        <TickerAvatar
          symbol={to.instrument?.symbol || `$${to.holdingType}`}
          className="w-12 h-12"
        />
        <div className="grow flex flex-col min-w-0">
          <h3 className="text-sm font-semibold truncate">
            {to.instrument?.name || to.holdingType}
          </h3>
          <span className="text-xs text-muted-foreground truncate">{to.instrument?.symbol}</span>
        </div>
      </div>
    </Card>
  );
}
