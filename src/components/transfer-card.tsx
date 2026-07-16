import { AmountDisplay, Card, cn, Icons, Skeleton } from '@wealthfolio/ui';
import { m, useReducedMotion } from 'framer-motion';
import type { PlannedHolding } from '../hooks/use-holdings';
import { currentPct as currentPctOf, type RebalanceAction } from '../lib';
import { TickerAvatar } from './ticker-avatar';

const cardBase = 'rounded-lg border p-6 flex flex-col gap-4 h-64';
const cardVariants = {
  transfer: 'bg-card text-card-foreground border-transparent',
  'on-target': 'border-success/20 bg-success/5',
  drifted: 'border-warning/20 bg-warning/5',
} as const;

/** Border-beam geometry — outer radius and the sliver of border the beam occupies. */
const CARD_RADIUS = '0.5rem';
const BEAM_WIDTH = '1.5px';

/** Placeholder card that mirrors HoldingCard's layout to avoid layout shift while loading. */
export function HoldingCardSkeleton() {
  return (
    <Card className={cn(cardBase, cardVariants.transfer)}>
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 flex-none rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-center gap-4 flex-1">
        <div className="w-12 flex-none" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="flex items-center gap-4 h-12">
        <Skeleton className="w-5 h-5 flex-none rounded-full ml-3.5" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </Card>
  );
}

type TransferCardProps = RebalanceAction & {
  status: 'transfer';
};

type OnTargetCardProps = {
  status: 'on-target';
  holding: PlannedHolding;
  totalPortfolioValue: number;
};

type DriftedCardProps = {
  status: 'drifted';
  holding: PlannedHolding;
  totalPortfolioValue: number;
};

type HoldingCardProps = TransferCardProps | OnTargetCardProps | DriftedCardProps;

export function HoldingCard(props: HoldingCardProps) {
  const className = cn(cardBase, cardVariants[props.status]);

  if (props.status === 'on-target') {
    const { holding, totalPortfolioValue } = props;
    const total = totalPortfolioValue;
    const currentPct = currentPctOf(holding.marketValue.base, total);
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
            <Icons.CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-success">On target</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {currentPct.toFixed(1)}% ({deviationLabel})
            </span>
          </div>
        </div>
      </Card>
    );
  }

  if (props.status === 'drifted') {
    const { holding, totalPortfolioValue } = props;
    const total = totalPortfolioValue;
    const currentPct = currentPctOf(holding.marketValue.base, total);
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
            <Icons.AlertCircle className="w-5 h-5 text-warning" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-warning">Drifted</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {currentPct.toFixed(1)}% ({deviationLabel}) · target {targetPct.toFixed(1)}%
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
    <TransferCardAnimated
      from={from}
      to={to}
      amount={amount}
      currency={currency}
      transferPct={transferPct}
    />
  );
}

function TransferCardAnimated({
  from,
  to,
  amount,
  currency,
  transferPct,
}: {
  from: RebalanceAction['from'];
  to: RebalanceAction['to'];
  amount: number;
  currency: string;
  transferPct: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="relative overflow-hidden h-64"
      style={{ padding: BEAM_WIDTH, borderRadius: CARD_RADIUS, background: 'var(--border)' }}
    >
      {/* Rotating conic gradient — the visible "beam" is the sliver not covered by inner card */}
      {!prefersReducedMotion && (
        <m.div
          className="absolute z-0"
          style={{
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background:
              'conic-gradient(from 0deg, transparent 0deg, transparent 320deg, var(--primary) 350deg, transparent 360deg)',
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
        />
      )}
      {/* Inner card — covers the gradient, leaving only the border visible */}
      <div
        className="relative z-10 flex flex-col gap-4 p-6 h-full bg-card text-card-foreground"
        style={{ borderRadius: `calc(${CARD_RADIUS} - ${BEAM_WIDTH})` }}
      >
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
            <span
              className="text-sm font-medium text-muted-foreground tabular-nums"
              title="Percentage of the source fund being transferred"
            >
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
      </div>
    </div>
  );
}
