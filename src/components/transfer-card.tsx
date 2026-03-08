import { AmountDisplay, Card, Icons } from '@wealthfolio/ui';
import type { PlannedHolding } from '../hooks/use-holdings';
import type { RebalanceAction } from '../lib';
import { TickerAvatar } from './ticker-avatar';

const cardBase = 'rounded-lg border shadow-md p-6 flex flex-col gap-4 h-64';
const cardVariants = {
  transfer: 'bg-card text-card-foreground',
  'on-target': 'border-success/20 bg-success/5',
} as const;

type TransferCardProps = RebalanceAction & {
  status: 'transfer';
};

type OnTargetCardProps = {
  status: 'on-target';
  holding: PlannedHolding;
  totalPortfolioValue: number;
};

type HoldingCardProps = TransferCardProps | OnTargetCardProps;

export function HoldingCard(props: HoldingCardProps) {
  const className = `${cardBase} ${cardVariants[props.status]}`;

  if (props.status === 'on-target') {
    const { holding, totalPortfolioValue } = props;
    const total = totalPortfolioValue;
    const currentPct = total > 0 ? (holding.marketValue.base / total) * 100 : 0;
    const targetPct = holding.plan?.target ?? 0;
    const deviation = currentPct - targetPct;
    const deviationLabel = `${deviation >= 0 ? '+' : ''}${deviation.toFixed(1)}pp`;

    return (
      <Card className={className}>
        <div className="flex items-center gap-4">
          <TickerAvatar
            symbol={holding.instrument?.symbol || `$${holding.holdingType}`}
            className="w-12 h-12 flex-none"
          />
          <h3 className="text-sm font-semibold truncate">
            {holding.instrument?.name || holding.instrument?.symbol || holding.holdingType}
          </h3>
        </div>

        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 flex-none" />
          <AmountDisplay
            value={holding.marketValue.base}
            currency={holding.baseCurrency}
            className="text-xl font-bold"
          />
        </div>

        <div className="flex items-center gap-4 h-12">
          <div className="w-12 flex-none flex justify-center">
            <Icons.CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-green-500">On target</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {currentPct.toFixed(1)}% ({deviationLabel})
            </span>
          </div>
        </div>
      </Card>
    );
  }

  const { from, to, amount, currency } = props;
  const transferPct =
    from.marketValue.base > 0 ? Math.min(100, (amount / from.marketValue.base) * 100) : 0;

  return (
    <Card className={className}>
      <div className="flex items-center gap-4">
        <TickerAvatar
          symbol={from.instrument?.symbol || `$${from.holdingType}`}
          className="w-12 h-12 flex-none"
        />
        <h3 className="text-sm font-semibold truncate">
          {from.instrument?.name || from.instrument?.symbol || from.holdingType}
        </h3>
      </div>

      <div className="flex items-center gap-4 flex-1">
        <div className="w-12 flex-none flex justify-center">
          <Icons.ArrowDown className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex items-baseline gap-2">
          <AmountDisplay value={amount} currency={currency} className="text-xl font-bold" />
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {transferPct.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <TickerAvatar
          symbol={to.instrument?.symbol || `$${to.holdingType}`}
          className="w-12 h-12 flex-none"
        />
        <h3 className="text-sm font-semibold truncate">
          {to.instrument?.name || to.instrument?.symbol || to.holdingType}
        </h3>
      </div>
    </Card>
  );
}
