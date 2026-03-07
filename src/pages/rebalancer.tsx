import type { AddonContext } from '@wealthfolio/addon-sdk';
import {
  AmountDisplay,
  Button,
  Icons,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@wealthfolio/ui';
import { pascalCase } from 'change-case';
import { Suspense, useState } from 'react';
import {
  AccountSelector,
  ApplicationHeader,
  HoldingPlanner,
  TickerAvatar,
  TransferCard,
} from '../components';
import { type PlannedHolding, useSuspenseHoldings } from '../hooks/use-holdings';
import {
  type RebalancePlan,
  TOLERANCE_MAX,
  TOLERANCE_MIN,
  TOLERANCE_STEP,
  useConfigure,
  useRebalance,
  useTolerance,
} from '../hooks/use-rebalance';
import { addonName, useSelectedAccount } from '../lib';

interface EditPlanSheetProps {
  ctx: AddonContext;
  label?: string;
  compact?: boolean;
}

export function EditPlanSheet({ ctx, label = 'Edit Plan', compact = false }: EditPlanSheetProps) {
  const [open, setOpen] = useState(false);
  const [tolerancePp, setTolerancePp] = useTolerance();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          name="plan-button"
          role="combobox"
          aria-expanded={open}
          className="flex items-center gap-2"
        >
          <Icons.Settings className="h-4 w-4" />
          {compact ? <span className="hidden sm:inline">{label}</span> : label}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Edit Plan</SheetTitle>
          <SheetDescription>
            Adjust your target allocations to create a personalized investment plan.
          </SheetDescription>
        </SheetHeader>

        {/* Tolerance threshold control */}
        <div className="flex-shrink-0 flex items-center justify-between border rounded-lg px-4 py-3 bg-muted/30">
          <div className="leading-tight">
            <p className="text-sm font-medium">Rebalance threshold</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tolerancePp === 0
                ? 'Rebalance on any deviation'
                : `Skip transfers below ${tolerancePp}pp deviation`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setTolerancePp(tolerancePp - TOLERANCE_STEP)}
              disabled={tolerancePp <= TOLERANCE_MIN}
              aria-label="Decrease threshold"
            >
              <Icons.Minus className="h-3 w-3" />
            </Button>
            <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
              {tolerancePp === 0 ? 'Any' : `${tolerancePp.toFixed(1)} pp`}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setTolerancePp(tolerancePp + TOLERANCE_STEP)}
              disabled={tolerancePp >= TOLERANCE_MAX}
              aria-label="Increase threshold"
            >
              <Icons.Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <HoldingPlanner ctx={ctx} onSave={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PreviewSheet({
  holdings,
  rebalancePlan,
  tolerancePp = 0,
}: {
  holdings: PlannedHolding[];
  rebalancePlan: RebalancePlan | undefined;
  tolerancePp?: number;
}) {
  const total = rebalancePlan?.totalPreviewValue ?? 0;
  const previewById = new Map(rebalancePlan?.previewHoldings.map((h) => [h.id, h]));
  // A holding is "on target" when its absolute deviation is within the configured threshold
  const greenThreshold = Math.max(0.5, tolerancePp);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button name="preview-button" variant="outline" className="flex items-center gap-2">
          <Icons.Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Preview</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Allocation — Current vs Target</SheetTitle>
          <SheetDescription>
            How each position compares to its target after rebalancing.
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0 items-center border-b pb-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
          <span>Holding</span>
          <span className="text-right">Current → Target</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {holdings
            .filter((h) => h.plan?.enabled)
            .map((h) => {
              const currentPct = total > 0 ? (h.marketValue.base / total) * 100 : 0;
              const targetPct = h.plan.target ?? 0;
              const deviation = targetPct - currentPct;
              const projected = previewById.get(h.id);
              const deviationColor =
                Math.abs(deviation) < greenThreshold
                  ? 'text-green-500'
                  : deviation > 0
                    ? 'text-blue-500'
                    : 'text-red-500';
              return (
                <div
                  key={h.id}
                  className="flex items-center gap-3 rounded-md px-1 py-2 hover:bg-muted/40"
                >
                  <TickerAvatar
                    symbol={h.instrument?.symbol || `$${h.holdingType}`}
                    className="w-8 h-8 flex-none"
                  />
                  <div className="grow min-w-0">
                    <div className="text-sm font-medium truncate">
                      {h.instrument?.name || h.instrument?.symbol || h.holdingType}
                    </div>
                    {projected && (
                      <AmountDisplay
                        value={projected.marketValue.base}
                        currency={h.baseCurrency}
                        className="text-xs text-muted-foreground"
                      />
                    )}
                  </div>
                  <div className="text-right tabular-nums shrink-0">
                    <div className="text-sm">
                      <span className="text-muted-foreground">{currentPct.toFixed(1)}%</span>
                      <span className="mx-1 text-muted-foreground/50">→</span>
                      <span className="font-semibold">{targetPct.toFixed(1)}%</span>
                    </div>
                    <div className={`text-xs font-medium ${deviationColor}`}>
                      {deviation > 0 ? '+' : ''}
                      {deviation.toFixed(1)}pp
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center flex-1 min-h-0">
      <Icons.Loader className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

interface RebalancerContentProps {
  ctx: AddonContext;
  accountId: string;
}

function RebalancerContent({ ctx, accountId }: RebalancerContentProps) {
  const { data: holdings } = useSuspenseHoldings({ accountId, ctx });
  const [tolerancePp] = useTolerance();
  const rebalancePlan = useRebalance({ ctx, tolerance: tolerancePp / 100 });
  const configurationRequired = useConfigure();

  const hasHoldings = holdings.length > 0;
  const hasPlan = hasHoldings && !configurationRequired;
  const hasTransfers = (rebalancePlan?.transfers?.length ?? 0) > 0;

  if (!hasHoldings) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 gap-6">
        <p className="text-lg font-light text-muted-foreground">
          No transactions found in this account.
        </p>
        <Button
          onClick={() => ctx.api.navigation.navigate('/activities')}
          className="flex items-center gap-2"
        >
          <Icons.Plus className="h-4 w-4" />
          Add Transactions
        </Button>
      </div>
    );
  }

  if (configurationRequired) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 gap-6">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <Icons.AlertCircle className="h-6 w-6 text-muted-foreground" />
          <p className="text-lg font-light text-muted-foreground">
            Please configure your plan to establish target allocations.
          </p>
        </div>
        <EditPlanSheet ctx={ctx} label="Create Plan" />
      </div>
    );
  }

  return (
    <>
      {hasPlan && (
        <div className="flex justify-end gap-2 shrink-0">
          {hasTransfers && (
            <PreviewSheet
              holdings={holdings}
              rebalancePlan={rebalancePlan}
              tolerancePp={tolerancePp}
            />
          )}
          <EditPlanSheet ctx={ctx} compact />
        </div>
      )}
      {!hasTransfers ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-0 gap-3 text-center">
          <Icons.CheckCircle className="h-8 w-8 text-green-500" />
          <p className="text-lg font-light text-muted-foreground max-w-sm">
            {tolerancePp > 0
              ? `No position deviates by more than ${tolerancePp}pp — portfolio is on target.`
              : 'Your portfolio is on target — no transfers needed right now.'}
          </p>
          <p className="text-sm text-muted-foreground/70 max-w-xs">
            Come back after your next contribution or market move to check again.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
            {rebalancePlan?.transfers.map(({ from, to, amount, currency }) => (
              <TransferCard
                key={`${from.id}-${to.id}`}
                from={from}
                to={to}
                amount={amount}
                currency={currency}
                totalPortfolioValue={rebalancePlan.totalPreviewValue}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function Rebalancer({ ctx }: { ctx: AddonContext }) {
  const { selectedAccount } = useSelectedAccount();

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex flex-col h-full w-full gap-6">
        <ApplicationHeader
          className="shrink-0"
          heading={pascalCase(addonName)}
          text="Keep your portfolio aligned with your investment goals"
        >
          <AccountSelector ctx={ctx} />
        </ApplicationHeader>

        {!selectedAccount ? (
          <div className="flex items-center justify-center flex-1 min-h-0">
            <p className="text-lg font-light text-muted-foreground text-center max-w-md">
              Please select an account to identify rebalance opportunities.
            </p>
          </div>
        ) : (
          <Suspense fallback={<LoadingSpinner />}>
            <RebalancerContent ctx={ctx} accountId={selectedAccount.id} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
