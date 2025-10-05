import React from "react";
import { Account, AddonContext, HoldingType } from "@wealthfolio/addon-sdk";
import {
  AmountDisplay,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@wealthfolio/ui";

const dummyHoldings = [
  {
    id: "1",
    holdingType: "security" as HoldingType,
    instrument: {
      symbol: "AAPL",
      name: "Apple Inc.",
    },
    marketValue: { base: 15000 },
    baseCurrency: "USD",
  },
  {
    id: "2",
    holdingType: "security" as HoldingType,
    instrument: {
      symbol: "MSFT",
      name: "Microsoft Corp.",
    },
    marketValue: { base: 12000 },
    baseCurrency: "USD",
  },
  {
    id: "3",
    holdingType: "cash" as HoldingType,
    localCurrency: "USD",
    marketValue: { base: 5000 },
    baseCurrency: "USD",
  },
];

const sheetTitle = "Holdings Breakdown";

interface RebalanceProps {
  account: Account;
  ctx: AddonContext;
  isSheetOpen: boolean;
  setIsSheetOpen: (open: boolean) => void;
}

export function Rebalance({
  account,
  ctx,
  isSheetOpen,
  setIsSheetOpen,
}: RebalanceProps) {
  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>
            View a breakdown of your holdings filtered by this category.
          </SheetDescription>
        </SheetHeader>
        <div className="py-8">
          {dummyHoldings.length > 0 ? (
            <ul className="space-y-2">
              {dummyHoldings.map((holding) => {
                let displayName = "N/A";
                let symbol = "-";
                if (holding.holdingType === "cash") {
                  displayName = holding.localCurrency
                    ? `Cash (${holding.localCurrency})`
                    : "Cash";
                  symbol = `$CASH-${holding.localCurrency}`;
                } else if (holding.instrument) {
                  displayName =
                    holding.instrument.name ||
                    holding.instrument.symbol ||
                    "Unnamed Security";
                  symbol = holding.instrument.symbol || "-";
                }

                return (
                  <Card
                    key={holding.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <CardHeader className="flex w-full flex-row items-center justify-between space-x-2 p-4">
                      <div className="flex items-center space-x-2">
                        <Badge className="flex min-w-[50px] cursor-pointer items-center justify-center rounded-sm">
                          {symbol}
                        </Badge>
                        <CardTitle className="line-clamp-1 text-sm font-normal">
                          {displayName}
                        </CardTitle>
                      </div>
                      <div className="text-right font-semibold">
                        <AmountDisplay
                          value={Number(holding.marketValue?.base) || 0}
                          currency={holding.baseCurrency}
                        />
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </ul>
          ) : (
            <p>No holdings found for this selection.</p>
          )}
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
