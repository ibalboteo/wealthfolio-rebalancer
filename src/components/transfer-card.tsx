import { AmountDisplay, Card, cn, Icons } from '@wealthfolio/ui';
import type { PlannedHolding } from '../hooks/use-holdings';
import type { RebalanceAction } from '../lib';
import { TickerAvatar } from './ticker-avatar';

function ContributionLine({
  holding,
  total,
  contribution,
}: {
  holding: PlannedHolding;
  total: number;
  contribution: number; // positive = buying (to), negative = selling (from)
}) {
  if (!holding.plan?.enabled || total === 0) return null;
  const currentPct = (holding.marketValue.base / total) * 100;
  const contributionPct = (contribution / total) * 100;
  const sign = contributionPct > 0 ? '+' : '';
  const colorClass = contributionPct > 0 ? 'text-blue-500' : 'text-red-500';
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {currentPct.toFixed(1)}%{' '}
      <span className={cn('font-semibold', colorClass)}>
        {sign}
        {contributionPct.toFixed(1)}pp
      </span>
    </span>
  );
}

interface TransferCardProps extends RebalanceAction {
  totalPortfolioValue: number;
}

export function TransferCard({
  from,
  to,
  amount,
  currency,
  totalPortfolioValue,
}: TransferCardProps) {
  return (
    <Card className="rounded-lg border bg-card text-card-foreground shadow-md p-6 flex flex-col gap-4 h-64">
      <div className="flex items-center gap-4">
        <TickerAvatar
          symbol={from.instrument?.symbol || `$${from.holdingType}`}
          className="w-12 h-12"
        />
        <div className="grow flex flex-col min-w-0">
          <h3 className="text-sm font-semibold truncate">
            {from.instrument?.name || from.instrument?.symbol || from.holdingType}
          </h3>
          <ContributionLine holding={from} total={totalPortfolioValue} contribution={-amount} />
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
            {to.instrument?.name || to.instrument?.symbol || to.holdingType}
          </h3>
          <ContributionLine holding={to} total={totalPortfolioValue} contribution={amount} />
        </div>
      </div>
    </Card>
  );
}
