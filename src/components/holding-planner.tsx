import type { AddonContext } from '@wealthfolio/addon-sdk/types';
import { Button, cn, Input, Switch } from '@wealthfolio/ui';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { type HoldingPlanData, useHoldings, useToast, useUpdateHolding } from '../hooks';
import { useSelectedAccount } from '../lib/account-provider';
import { TickerAvatar } from './ticker-avatar';

export interface HoldingPlannerProps {
  ctx: AddonContext;
  onSave?: () => void;
}

export function HoldingPlanner({ ctx, onSave }: HoldingPlannerProps) {
  const { toast } = useToast();
  const { selectedAccount } = useSelectedAccount();
  const { data: holdings } = useHoldings({
    accountId: selectedAccount?.id || '',
    ctx,
  });

  const { mutation } = useUpdateHolding({
    accountId: selectedAccount?.id || '',
  });

  // Estado local para los valores del formulario
  const [formState, setFormState] = useState<HoldingPlanData[]>([]);

  // Actualiza el estado local cuando cambian los holdings
  useEffect(() => {
    if (holdings && holdings.length > 0) {
      setFormState(
        holdings.map((h) => ({
          id: h.id,
          target: h.plan.target,
          enabled: h.plan.enabled,
        }))
      );
    }
  }, [holdings]);

  // Submit handler
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Check total percentage
    const total = formState.reduce((sum, item) => sum + item.target, 0);
    if (total !== 100) {
      toast({
        title: 'Error',
        description: 'Total target percentage must equal 100%',
        variant: 'destructive',
      });
      return;
    }
    mutation.mutate(formState, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Holding plan updated successfully',
          variant: 'success',
        });
        onSave?.();
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to update holding plan',
          variant: 'destructive',
        });
      },
    });
  };

  // Handler para cambiar valores
  const handleChange = (index: number, field: 'target' | 'enabled', value: number | boolean) => {
    // Ensure the target value is a valid number before updating the state
    if (field === 'target' && (typeof value !== 'number' || Number.isNaN(value))) {
      value = 0;
    }

    setFormState((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="space-y-4 py-4 flex-1 overflow-y-auto">
        {holdings?.map((holding, idx) => (
          <div key={holding.id} className="flex items-center gap-4 rounded border p-4 min-w-0">
            <fieldset
              className={cn(
                'grow basis-0 flex items-center gap-4 min-w-0',
                !formState[idx]?.enabled && 'opacity-60 grayscale select-none'
              )}
              disabled={!formState[idx]?.enabled}
            >
              <TickerAvatar
                symbol={holding.instrument?.symbol || `$${holding.holdingType}`}
                className="w-8 h-8 flex-none"
              />
              <div className="grow min-w-0">
                <div className="font-medium capitalize truncate">
                  {holding.instrument?.symbol || holding.holdingType}
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
              <Input
                type="number"
                value={formState[idx]?.target ?? 0}
                min={0}
                max={100}
                step={0.01}
                onChange={(e) => handleChange(idx, 'target', parseFloat(e.target.value))}
                className={cn('w-24 text-right', {
                  'bg-muted/40 text-muted-foreground': !formState[idx]?.enabled,
                })}
                placeholder="0.00"
              />
            </fieldset>
            <Switch
              checked={formState[idx]?.enabled ?? false}
              onCheckedChange={(checked) => handleChange(idx, 'enabled', checked)}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4 border-t">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
