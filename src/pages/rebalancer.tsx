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
import { useState } from 'react';
import {
  AccountSelector,
  ApplicationHeader,
  HoldingPlanner,
  TickerAvatar,
  TransferCard,
} from '../components';
import { type PlannedHolding, useHoldings } from '../hooks/use-holdings';
import { type RebalancePlan, useConfigure, useRebalance } from '../hooks/use-rebalance';
import { addonName, useSelectedAccount } from '../lib';

interface EditPlanSheetProps {
  ctx: AddonContext;
  label?: string;
}

export function EditPlanSheet({ ctx, label = 'Edit Plan' }: EditPlanSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          name="plan-button"
          role="combobox"
          aria-expanded={open}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
        >
          <Icons.Settings className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Edit Plan</SheetTitle>
          <SheetDescription>
            Adjust your target allocations to create a personalized investment plan.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0">
          <HoldingPlanner ctx={ctx} onSave={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PreviewSheet({ rebalancePlan }: { rebalancePlan: RebalancePlan | undefined }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          name="preview-button"
          variant="outline"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
        >
          <Icons.Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Portfolio Preview</SheetTitle>
          <SheetDescription>
            This is how your portfolio would look after applying the suggested changes.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {rebalancePlan?.previewHoldings.map((h: PlannedHolding) => {
            let percent = 0;
            if (h.plan?.enabled && rebalancePlan.totalPreviewValue > 0) {
              percent = (h.marketValue.base / rebalancePlan.totalPreviewValue) * 100;
            }
            return (
              <div key={h.id} className="flex items-center gap-4 rounded border p-4 min-w-0">
                <div className="flex items-center gap-4 grow min-w-0">
                  <TickerAvatar
                    symbol={h.instrument?.symbol || `$${h.holdingType}`}
                    className="w-8 h-8 flex-none"
                  />
                  <div className="grow min-w-0">
                    <div className="font-medium capitalize truncate">
                      {h.instrument?.symbol || h.holdingType}
                    </div>
                    {h.instrument?.name && (
                      <div
                        className="text-xs text-muted-foreground truncate"
                        title={h.instrument?.name}
                      >
                        {h.instrument?.name}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <AmountDisplay
                      value={h.marketValue.base}
                      currency={h.baseCurrency}
                      className="font-semibold"
                    />
                    {h.plan?.enabled && (
                      <div className="text-xs text-muted-foreground">{percent.toFixed(2)}%</div>
                    )}
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
export function Rebalancer({ ctx }: { ctx: AddonContext }) {
  const { selectedAccount } = useSelectedAccount();
  const rebalancePlan = useRebalance({ ctx });
  const configurationRequired = useConfigure();

  // Get holdings to check if account has any transactions
  const { data: holdings } = useHoldings({
    accountId: selectedAccount?.id || '',
    ctx,
    enabled: !!selectedAccount?.id,
  });

  const hasHoldings = holdings && holdings.length > 0;

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex flex-col h-full w-full space-y-6">
        <ApplicationHeader
          heading={pascalCase(addonName)}
          text="Keep your portfolio aligned with your investment goals"
        >
          <AccountSelector ctx={ctx} />
        </ApplicationHeader>

        {!selectedAccount && (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg font-light text-muted-foreground text-center max-w-md">
              Please select an account to identify rebalance opportunities.
            </p>
          </div>
        )}

        {selectedAccount && !hasHoldings && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <p className="text-lg font-light">No transactions found in this account.</p>
            </div>
            <Button
              onClick={() => {
                // Navigate to activities page in Wealthfolio
                ctx.api.navigation.navigate('/activities');
              }}
              className="flex items-center gap-2"
            >
              <Icons.Plus className="h-4 w-4" />
              Add Transactions
            </Button>
          </div>
        )}

        {selectedAccount &&
          hasHoldings &&
          (configurationRequired ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="flex flex-col items-center gap-3 text-center max-w-md">
                <Icons.AlertCircle className="h-6 w-6 text-muted-foreground" />
                <p className="text-lg font-light text-muted-foreground">
                  Please configure your plan to establish target allocations.
                </p>
              </div>
              <EditPlanSheet ctx={ctx} label="Create Plan" />
            </div>
          ) : (
            <>
              <div className="flex justify-end gap-4">
                {(rebalancePlan?.transfers?.length ?? 0) > 0 && (
                  <PreviewSheet rebalancePlan={rebalancePlan} />
                )}
                <EditPlanSheet ctx={ctx} />
              </div>
              <div className="flex-1 overflow-y-auto">
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                  {rebalancePlan?.transfers.map(({ from, to, amount, currency }, _index) => (
                    <TransferCard
                      key={`${from}-${to}-${amount}-${currency}`}
                      from={from}
                      to={to}
                      amount={amount}
                      currency={currency}
                    />
                  ))}
                </ul>
              </div>
            </>
          ))}
      </div>
    </div>
  );
}
