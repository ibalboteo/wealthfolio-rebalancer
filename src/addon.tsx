import React, { useState } from "react";
import { Account, type AddonContext } from "@wealthfolio/addon-sdk";
import { Button, Icons, Input } from "@wealthfolio/ui";
import { QueryClientProvider } from "@tanstack/react-query";

import { AccountSelector } from "./components/AccountSelector";
import { ApplicationHeader } from "./components/Header";
import { AccountAssetAllocation } from "./components/AssetLocation";
import { Rebalance } from "./components/Rebalance";

function AddonExample({ ctx }: { ctx: AddonContext }) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col h-full w-full">
        <ApplicationHeader heading="Rebalancer">
          <AccountSelector
            ctx={ctx}
            setSelectedAccount={setSelectedAccount}
            selectedAccount={selectedAccount}
            variant="dropdown"
          />
        </ApplicationHeader>
        {selectedAccount ? (
          <>
            <div className="flex flex-col gap-4">
              <AccountAssetAllocation account={selectedAccount} ctx={ctx} />

              <div className="flex justify-end gap-4">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="max-deviation"
                    className="text-sm font-medium text-gray-700"
                  >
                    Maximum deviation allowed:
                  </label>
                  <Input
                    id="max-deviation"
                    type="number"
                    defaultValue={5}
                    min={0}
                    max={100}
                    className="w-20"
                  />
                  <span>%</span>
                </div>
                <Button
                  onClick={() => setIsSheetOpen(true)}
                  variant="outline"
                  role="combobox"
                  aria-expanded={isSheetOpen}
                  className="flex items-center gap-1.5 rounded-md border-[1.5px] border-none bg-secondary/30 px-3 py-1 text-sm font-medium hover:bg-muted/80"
                >
                  <Icons.PlusCircle className="mr-2 h-4 w-4" />
                  View Holdings
                </Button>
              </div>
            </div>
            <Rebalance
              account={selectedAccount}
              ctx={ctx}
              isSheetOpen={isSheetOpen}
              setIsSheetOpen={setIsSheetOpen}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Please select an account to view its asset allocation.
          </div>
        )}
      </div>
    </div>
  );
}

export default function enable(ctx: AddonContext) {
  // Add a sidebar item
  const sidebarItem = ctx.sidebar.addItem({
    id: "rebalancer",
    label: "Rebalancer",
    icon: <Icons.Blocks className="h-5 w-5" />,
    route: "/addon/rebalancer",
    order: 100,
  });

  // Create wrapper component with QueryClientProvider using shared client
  const RebalancerWrapper = () => {
    const sharedQueryClient = ctx.api.query.getClient();
    return (
      <QueryClientProvider client={sharedQueryClient}>
        <AddonExample ctx={ctx} />
      </QueryClientProvider>
    );
  };
  // Add a route
  ctx.router.add({
    path: "/addon/rebalancer",
    component: React.lazy(() =>
      Promise.resolve({ default: RebalancerWrapper })
    ),
  });

  // Cleanup on disable
  ctx.onDisable(() => {
    try {
      sidebarItem.remove();
    } catch (err) {
      ctx.api.logger.error("Failed to remove sidebar item:" + err);
    }
  });
}
