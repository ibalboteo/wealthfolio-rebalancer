import type { AddonContext, QuoteSummary } from '@wealthfolio/addon-sdk';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Icons,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@wealthfolio/ui';
import { useState } from 'react';
import { useSearchInstruments } from '../hooks';
import { TickerAvatar } from './ticker-avatar';

interface InstrumentSelectorProps {
  ctx: AddonContext;
  onSelect: (instrument: QuoteSummary) => void;
  disabled?: boolean;
}

export function InstrumentSelector({ ctx, onSelect, disabled }: InstrumentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: instrumentsData = [], isLoading } = useSearchInstruments({
    query: searchQuery,
    ctx,
    enabled: searchQuery.length >= 2,
  });

  const instruments = Array.isArray(instrumentsData) ? instrumentsData : [];

  const handleSelect = (instrument: QuoteSummary) => {
    onSelect(instrument);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
          <Icons.Plus className="h-4 w-4" />
          Add Stock
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search stocks (e.g., AAPL, MSFT)..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {searchQuery.length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
            ) : instruments.length === 0 ? (
              <CommandEmpty>No instruments found</CommandEmpty>
            ) : (
              <CommandGroup>
                {instruments.slice(0, 10).map((instrument: QuoteSummary) => (
                  <CommandItem
                    key={instrument.symbol}
                    value={instrument.symbol}
                    onSelect={() => handleSelect(instrument)}
                    className="gap-3"
                  >
                    <TickerAvatar symbol={instrument.symbol} className="h-8 w-8 flex-none" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{instrument.symbol}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {instrument.longName || instrument.shortName}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{instrument.quoteType}</div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
