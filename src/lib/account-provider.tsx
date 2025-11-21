import type { Account } from '@wealthfolio/addon-sdk';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { useLocalStorage } from '../hooks/use-local-storage';

interface SelectedAccountContextProps {
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => void;
}

const SelectedAccountContext = createContext<SelectedAccountContextProps | undefined>(undefined);

export function SelectedAccountProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccount] = useLocalStorage<Account | null>(
    'addons:rebalancer:selectedAccount',
    null
  );

  return (
    <SelectedAccountContext.Provider value={{ selectedAccount, setSelectedAccount }}>
      {children}
    </SelectedAccountContext.Provider>
  );
}

export const useSelectedAccount = () => {
  const context = useContext(SelectedAccountContext);
  if (!context) {
    throw new Error('useSelectedAccount must be used within a SelectedAccountProvider');
  }
  return context;
};
