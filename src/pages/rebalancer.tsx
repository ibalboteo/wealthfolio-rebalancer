import type { AddonContext } from '@wealthfolio/addon-sdk';
import {
  Button,
  Icons,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@wealthfolio/ui';
import { pascalCase } from 'change-case';
import { domAnimation, LazyMotion, m, useReducedMotion } from 'framer-motion';
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
import {
  TOLERANCE_MAX,
  TOLERANCE_MIN,
  TOLERANCE_STEP,
  useConfigure,
  useRebalance,
  useTolerance,
} from '../hooks/use-rebalance';
import { addonName, sumEnabledValue, useSelectedAccount } from '../lib';

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
  const prefersReducedMotion = useReducedMotion();
  const [view, setView] = useState<'transfers' | 'overview'>('transfers');

  const hasHoldings = holdings.length > 0;
  const hasPlan = hasHoldings && !configurationRequired;

  // Holdings involved in a transfer (by id)
  const transferIds = useMemo(
    () => new Set(rebalancePlan?.transfers.flatMap(({ from, to }) => [from.id, to.id]) ?? []),
    [rebalancePlan?.transfers]
  );
  const totalEnabledValue = rebalancePlan?.totalPreviewValue ?? 0;

  // A holding is "on target" only when it is enabled, not part of a transfer,
  // AND its actual deviation from target is within the configured tolerance.
  const onTargetHoldings = useMemo(
    () =>
      hasPlan
        ? holdings.filter((h) => {
            if (!h.plan?.enabled || transferIds.has(h.id)) return false;
            const currentPct =
              totalEnabledValue > 0 ? (h.marketValue.base / totalEnabledValue) * 100 : 0;
            return Math.abs(currentPct - (h.plan?.target ?? 0)) <= tolerancePp;
          })
        : [],
    [hasPlan, holdings, transferIds, totalEnabledValue, tolerancePp]
  );

  // Holdings that are enabled, not in a transfer, but outside tolerance (drifted).
  const driftedHoldings = useMemo(
    () =>
      hasPlan
        ? holdings.filter((h) => {
            if (!h.plan?.enabled || transferIds.has(h.id)) return false;
            const currentPct =
              totalEnabledValue > 0 ? (h.marketValue.base / totalEnabledValue) * 100 : 0;
            return Math.abs(currentPct - (h.plan?.target ?? 0)) > tolerancePp;
          })
        : [],
    [hasPlan, holdings, transferIds, totalEnabledValue, tolerancePp]
  );

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

  // Plan exists but produces no visible cards. The stored allocations are
  // invalid (e.g. all targets = 0, or enabled weights don't sum to 100).
  const planIsCorrupted =
    hasPlan &&
    (rebalancePlan?.transfers.length ?? 0) === 0 &&
    onTargetHoldings.length === 0 &&
    driftedHoldings.length === 0;

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

      <Tabs
        value={view}
        onValueChange={(v) => setView(v as 'transfers' | 'overview')}
        className="flex flex-1 min-h-0 flex-col gap-4"
      >
        <TabsList className="self-start">
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="transfers" className="flex-1 min-h-0 overflow-y-auto">
          <LazyMotion features={domAnimation}>
            <m.ul
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.04 } },
              }}
            >
              {rebalancePlan?.transfers.map(({ from, to, amount, currency }) => (
                <m.li
                  key={`${from.id}-${to.id}`}
                  variants={{
                    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <HoldingCard
                    status="transfer"
                    from={from}
                    to={to}
                    amount={amount}
                    currency={currency}
                  />
                </m.li>
              ))}
              {driftedHoldings.map((h) => (
                <m.li
                  key={h.id}
                  variants={{
                    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <HoldingCard
                    status="drifted"
                    holding={h}
                    totalPortfolioValue={rebalancePlan?.totalPreviewValue ?? 0}
                  />
                </m.li>
              ))}
              {onTargetHoldings.map((h) => (
                <m.li
                  key={h.id}
                  variants={{
                    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <HoldingCard
                    status="on-target"
                    holding={h}
                    totalPortfolioValue={rebalancePlan?.totalPreviewValue ?? 0}
                  />
                </m.li>
              ))}
            </m.ul>
          </LazyMotion>
        </TabsContent>

        <TabsContent value="overview" className="flex-1 min-h-0">
          <AllocationOverview
            holdings={holdings}
            previewHoldings={rebalancePlan?.previewHoldings ?? holdings}
            totalEnabledValue={sumEnabledValue(holdings)}
            totalPreviewValue={rebalancePlan?.totalPreviewValue ?? 0}
            tolerancePp={tolerancePp}
            currency={holdings[0]?.baseCurrency ?? 'USD'}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

export function Rebalancer({ ctx }: { ctx: AddonContext }) {
  const { selectedAccount } = useSelectedAccount();

  return (
    <div className="p-6 flex flex-col h-full gap-6">
      <ApplicationHeader
        className="shrink-0"
        heading={pascalCase(addonName)}
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
