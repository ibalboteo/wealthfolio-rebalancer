import type { Account, AddonContext } from '@wealthfolio/addon-sdk';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  cn,
  Icons,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from '@wealthfolio/ui';
import { type FC, forwardRef, type SVGProps, useState } from 'react';
import { useAccounts } from '../hooks';
import { useSelectedAccount } from '../lib/account-provider';

// Map account types to icons for visual distinction
const accountTypeIcons: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  SECURITIES: Icons.Briefcase,
  CASH: Icons.DollarSign,
  CRYPTOCURRENCY: Icons.Bitcoin,
};

interface AccountSelectorProps {
  className?: string;
  ctx: AddonContext;
}

export const AccountSelector = forwardRef<HTMLButtonElement, AccountSelectorProps>(
  ({ className, ctx }) => {
    const { selectedAccount, setSelectedAccount } = useSelectedAccount();
    const [open, setOpen] = useState(false);
    const { data: accounts = [], isLoading } = useAccounts({
      ctx,
    });

    // Group accounts by type
    const accountsByType: Record<string, Account[]> = {};
    accounts.forEach((account) => {
      if (!accountsByType[account.accountType]) {
        accountsByType[account.accountType] = [];
      }
      accountsByType[account.accountType].push(account);
    });

    const sortedGroups = Object.entries(accountsByType).sort();

    // Render skeleton for loading state
    const renderSkeleton = () => {
      return (
        <Button variant="outline" className="w-[240px] justify-between" disabled>
          <div className="flex w-full items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
        </Button>
      );
    };

    // Render the appropriate trigger based on the variant
    const renderTrigger = () => {
      if (isLoading) {
        return renderSkeleton();
      }

      return (
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          size="sm"
          className={cn(
            'flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-none bg-secondary/30 px-3 py-1 text-sm font-medium hover:bg-muted/80',
            className
          )}
        >
          <div className="flex items-center gap-2">
            {selectedAccount ? (
              <>
                {(() => {
                  const IconComponent =
                    accountTypeIcons[selectedAccount.accountType] || Icons.CreditCard;
                  return <IconComponent className="h-4 w-4 shrink-0 opacity-70" />;
                })()}
                <span>{selectedAccount.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Select an account</span>
            )}
          </div>
          <Icons.ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      );
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{renderTrigger()}</PopoverTrigger>
        <PopoverContent
          className="p-0"
          align="start"
          sideOffset={8}
          style={{
            minWidth: '240px',
          }}
        >
          <Command className="w-full">
            <CommandInput placeholder="Search accounts..." />
            <CommandList>
              {isLoading ? (
                <div className="px-2 py-6 text-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ) : (
                <>
                  <CommandEmpty>No accounts found.</CommandEmpty>
                  {sortedGroups.map(([type, typeAccounts]) => (
                    <CommandGroup key={type} heading={type}>
                      {typeAccounts.map((account) => {
                        const IconComponent =
                          accountTypeIcons[account.accountType] || Icons.CreditCard;
                        return (
                          <CommandItem
                            key={account.id}
                            value={`${account.name} ${account.currency} ${account.accountType}`}
                            onSelect={() => {
                              setSelectedAccount(account);
                              setOpen(false);
                            }}
                            className="flex items-center py-1.5"
                          >
                            <div className="flex flex-1 items-center">
                              <IconComponent className="mr-2 h-4 w-4" />
                              <span>
                                {account.name} ({account.currency})
                              </span>
                            </div>
                            <Icons.Check
                              className={cn(
                                'ml-auto h-4 w-4',
                                selectedAccount?.id === account.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

AccountSelector.displayName = 'AccountSelector';
