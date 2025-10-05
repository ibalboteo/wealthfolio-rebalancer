import { AddonContext } from "@wealthfolio/addon-sdk/types";
import { useHoldings } from "../hooks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatPercent,
  Progress,
  Card,
  CardContent,
  CardTitle,
  CardHeader,
  CardFooter,
  TableFooter,
  Input,
} from "@wealthfolio/ui";
import { Account } from "@wealthfolio/addon-sdk";
import { useState } from "react";
import { TickerAvatar } from "./TickerAvatar";

export interface AccountAssetAllocationProps {
  account: Account;
  ctx: AddonContext;
}
export function AccountAssetAllocation({
  account,
  ctx,
}: AccountAssetAllocationProps) {
  const {
    data: holdings = [],
    isLoading,
    error,
  } = useHoldings({ accountId: account.id, ctx });

  // State to track target percentages for each holding
  const [targetPercentages, setTargetPercentages] = useState<{
    [key: string]: number;
  }>({});

  const handleTargetChange = (id: string, value: string) => {
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      setTargetPercentages((prev) => ({ ...prev, [id]: percentage }));
    }
  };

  const calculateDeviation = (current: number, target: number): number => {
    return target / 100 - current;
  };

  return (
    <div>
      {isLoading ? (
        <p>Loading holdings...</p>
      ) : error ? (
        <p>Error loading holdings: {error.message}</p>
      ) : (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-[60px]"></TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Target %</TableHead>
                    <TableHead className="text-center">Deviation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((holding) => {
                    const currentWeight = holding.weight || 0;
                    const targetWeight = targetPercentages[holding.id] || 0;
                    const deviation = calculateDeviation(
                      currentWeight,
                      targetWeight
                    );
                    const isOverLimit = Math.abs(deviation) > 0.01;

                    return (
                      <TableRow key={holding.id}>
                        <TableCell>
                          <TickerAvatar
                            symbol={
                              holding.instrument?.symbol ||
                              `$${holding.holdingType}`
                            }
                            className="w-8 h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium capitalize">
                              {holding.instrument?.symbol ||
                                holding.holdingType}
                            </div>
                            {holding.instrument?.name && (
                              <div
                                className="text-xs text-muted-foreground truncate"
                                title={holding.instrument?.name}
                              >
                                {holding.instrument?.name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(holding.weight)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={targetPercentages[holding.id] || ""}
                            min={0}
                            max={100}
                            step={0.01}
                            onChange={(e) =>
                              handleTargetChange(holding.id, e.target.value)
                            }
                            placeholder="Enter %"
                          />
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={Math.abs((deviation / currentWeight) * 100)}
                            indicatorClassName={`w-full ${
                              isOverLimit ? "bg-destructive" : "bg-success"
                            }`}
                            showPercentage
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
