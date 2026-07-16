import type { AddonContext } from '@wealthfolio/addon-sdk';
import {
  AnimatedToggleGroup,
  Button,
  Icons,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@wealthfolio/ui';
import { Suspense, useMemo, useState } from 'react';
import {
  AccountSelector,
  AllocationOverview,
  ApplicationHeader,
  HoldingCard,
  HoldingPlanner,
} from '../components';
import { HoldingCardSkeleton } from '../components/transfer-card';
import { useSuspenseHoldings } from '../hooks/use-holdings';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion';
import {
  TOLERANCE_MAX,
  TOLERANCE_MIN,
  TOLERANCE_STEP,
  useConfigure,
  useRebalance,
  useTolerance,
} from '../hooks/use-rebalance';
import { addonName, sumEnabledValue, useSelectedAccount } from '../lib';

const FADE_IN_UP = 'rebalancer-fade-in-up';
const FADE_IN_UP_KEYFRAMES = `@keyframes ${FADE_IN_UP} {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}`;

interface EditPlanSheetProps {
  ctx: AddonContext;
  label?: string;
  compact?: boolean;
}

export function EditPlanSheet({ ctx, label = 'Edit Plan', compact = false }: EditPlanSheetProps) {
  const [open, setOpen] = useState(false);

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
            Define your target allocations — the addon will calculate the optimal transfers to reach
            them.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0">
          <HoldingPlanner ctx={ctx} onSave={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
          <li key={i}>
            <HoldingCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface RebalancerContentProps {
  ctx: AddonContext;
  accountId: string;
}

function RebalancerContent({ ctx, accountId }: RebalancerContentProps) {
  const { data: holdings } = useSuspenseHoldings({ accountId, ctx });
  const [tolerancePp, setTolerancePp] = useTolerance(ctx);
  const rebalancePlan = useRebalance(holdings, tolerancePp / 100);
  const configurationRequired = useConfigure(holdings);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [view, setView] = useState<'transfers' | 'status' | 'projected'>('transfers');

  const hasHoldings = holdings.length > 0;
  const hasPlan = hasHoldings && !configurationRequired;

  const totalEnabledValue = useMemo(() => sumEnabledValue(holdings), [holdings]);

  if (!hasHoldings) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 gap-6">
        <p className="text-lg font-light text-muted-foreground">
          No holdings found in this account.
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
            Set your target allocations to discover which transfers will bring your portfolio on
            target.
          </p>
        </div>
        <EditPlanSheet ctx={ctx} label="Create Plan" />
      </div>
    );
  }

  // A saved plan must have its enabled targets sum to 100%. Legacy or
  // hand-edited storage can violate that; treat it as needing adjustment.
  const enabledTargetsSum = holdings.reduce(
    (sum, h) => (h.plan?.enabled ? sum + (h.plan?.target ?? 0) : sum),
    0
  );
  const planIsCorrupted = hasPlan && Math.round(enabledTargetsSum * 100) / 100 !== 100;

  if (planIsCorrupted) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 gap-6">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <Icons.AlertCircle className="h-6 w-6 text-muted-foreground" />
          <p className="text-lg font-light text-muted-foreground">
            Your plan needs adjustment. Make sure enabled allocations add up to 100%.
          </p>
        </div>
        <EditPlanSheet ctx={ctx} label="Edit Plan" />
      </div>
    );
  }

  return (
    <>
      {hasPlan && (
        <div className="flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Threshold</span>
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
              <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums">
                {tolerancePp === 0 ? 'Any' : `${tolerancePp.toFixed(1)}pp`}
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
          <EditPlanSheet ctx={ctx} compact />
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <AnimatedToggleGroup
          className="self-start"
          value={view}
          onValueChange={(v) => setView(v as 'transfers' | 'status' | 'projected')}
          items={[
            { value: 'transfers', label: 'Transfers' },
            { value: 'status', label: 'Status' },
            { value: 'projected', label: 'Projected' },
          ]}
        />

        {view === 'transfers' ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {(rebalancePlan?.transfers.length ?? 0) === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Icons.CheckCircle className="h-6 w-6 text-success" />
                <p className="text-lg font-light text-muted-foreground max-w-md">
                  Your portfolio is on target — no transfers needed.
                </p>
              </div>
            ) : (
              <>
                <style>{FADE_IN_UP_KEYFRAMES}</style>
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                  {rebalancePlan?.transfers.map(({ from, to, amount, currency }, index) => (
                    <li
                      key={`${from.id}-${to.id}`}
                      style={
                        prefersReducedMotion
                          ? undefined
                          : {
                              animation: `${FADE_IN_UP} 0.3s ease-out both`,
                              animationDelay: `${index * 0.04}s`,
                            }
                      }
                    >
                      <HoldingCard
                        status="transfer"
                        from={from}
                        to={to}
                        amount={amount}
                        currency={currency}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <AllocationOverview
              holdings={holdings}
              previewHoldings={rebalancePlan?.previewHoldings ?? holdings}
              totalEnabledValue={totalEnabledValue}
              totalPreviewValue={rebalancePlan?.totalPreviewValue ?? 0}
              tolerancePp={tolerancePp}
              currency={holdings[0]?.baseCurrency ?? 'USD'}
              mode={view === 'projected' ? 'projected' : 'current'}
            />
          </div>
        )}
      </div>
    </>
  );
}

export function Rebalancer({ ctx }: { ctx: AddonContext }) {
  const { selectedAccount } = useSelectedAccount();

  return (
    <div className="p-6 flex flex-col h-full gap-6">
      <ApplicationHeader
        className="shrink-0"
        heading={`${addonName.charAt(0).toUpperCase()}${addonName.slice(1)}`}
        text="Identify tax-free transfers to keep your portfolio on target"
      >
        <AccountSelector ctx={ctx} />
      </ApplicationHeader>

      {!selectedAccount ? (
        <div className="flex items-center justify-center flex-1 min-h-0">
          <p className="text-lg font-light text-muted-foreground text-center max-w-md">
            Please select an account to identify transfer opportunities.
          </p>
        </div>
      ) : (
        <Suspense fallback={<LoadingSkeleton />}>
          <RebalancerContent ctx={ctx} accountId={selectedAccount.id} />
        </Suspense>
      )}
    </div>
  );
}
