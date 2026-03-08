import type { AddonContext } from '@wealthfolio/addon-sdk';
import { Button, cn, Icons, Input, Switch } from '@wealthfolio/ui';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { type HoldingPlanData, useHoldings, useUpdateHolding } from '../hooks';
import { useSelectedAccount } from '../lib/account-provider';
import { TickerAvatar } from './ticker-avatar';

export interface HoldingPlannerProps {
  ctx: AddonContext;
  onSave?: () => void;
}

export function HoldingPlanner({ ctx, onSave }: HoldingPlannerProps) {
  const { selectedAccount } = useSelectedAccount();
  const accountId = selectedAccount?.id ?? '';
  const { data: holdings } = useHoldings({
    accountId,
    ctx,
    enabled: !!accountId,
  });

  const { mutation } = useUpdateHolding({
    accountId,
  });

  const [formState, setFormState] = useState<HoldingPlanData[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Actualiza el estado local cuando cambian los holdings
  useEffect(() => {
    setFormState(
      (holdings ?? []).map((h) => ({
        id: h.id,
        target: h.plan.target,
        enabled: h.plan.enabled,
      }))
    );
    setValidationError(null);
  }, [holdings]);

  // Submit handler
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const enabledTotal = formState
      .filter((item) => item.enabled)
      .reduce((sum, item) => sum + item.target, 0);
    const rounded = Math.round(enabledTotal * 100) / 100;
    if (rounded !== 100) {
      setValidationError(`Enabled targets sum to ${rounded.toFixed(2)}%, must equal 100%`);
      return;
    }
    setValidationError(null);
    mutation.mutate(formState, {
      onSuccess: () => onSave?.(),
      onError: () => setValidationError('Failed to save the plan. Please try again.'),
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
    setValidationError(null);
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
      <div className="flex items-center justify-between gap-4 pt-4 border-t">
        {validationError ? (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <Icons.XCircle className="h-4 w-4 shrink-0" />
            {validationError}
          </p>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Icons.Loader className="h-4 w-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </div>
    </form>
  );
}
