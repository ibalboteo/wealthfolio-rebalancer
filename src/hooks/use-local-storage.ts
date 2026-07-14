import type { AddonContext } from '@wealthfolio/addon-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { readAddonStorage, type Validator, writeAddonStorage } from '../lib/storage';

export function useAddonStorageState<T>(
  ctx: AddonContext,
  key: string,
  defaultValue: T,
  validator?: Validator<T>
) {
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  const validatorRef = useRef(validator);
  validatorRef.current = validator;

  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    setHydrated(false);
    setValue(defaultValue);

    const hydrate = async () => {
      const nextValue = await readAddonStorage(
        ctx,
        key,
        defaultValueRef.current,
        validatorRef.current
      );

      if (!active) return;
      setValue(nextValue);
      setHydrated(true);
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [ctx, defaultValue, key, validator]);

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const valueToStore = newValue instanceof Function ? newValue(prev) : newValue;
        void writeAddonStorage(ctx, key, valueToStore);
        return valueToStore;
      });
    },
    [ctx, key]
  );

  return [value, setStoredValue, hydrated] as const;
}
