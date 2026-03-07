import { useCallback, useEffect, useRef, useState } from 'react';
import { readStorage, type Validator, writeStorage } from '../lib/storage';

/**
 * Hook genérico para sincronizar estado con localStorage
 */
export function useLocalStorage<T>(key: string, defaultValue: T, validator?: Validator<T>) {
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  const validatorRef = useRef(validator);
  validatorRef.current = validator;

  const [value, setValue] = useState<T>(() =>
    readStorage(key, defaultValueRef.current, validatorRef.current)
  );

  // Efecto para actualizar el valor cuando cambie la clave
  useEffect(() => {
    setValue(readStorage(key, defaultValueRef.current, validatorRef.current));
  }, [key]);

  /**
   * Actualiza el estado y localStorage de forma segura
   */
  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const valueToStore = newValue instanceof Function ? newValue(prev) : newValue;
        writeStorage(key, valueToStore);
        return valueToStore;
      });
    },
    [key]
  );

  /**
   * Sincroniza el valor si cambia en otra pestaña (storage) o en el mismo tab (local-storage-write)
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleStorageChange(event: StorageEvent | CustomEvent<{ key: string }>) {
      const changedKey =
        event instanceof StorageEvent
          ? event.key
          : (event as CustomEvent<{ key: string }>).detail.key;
      // changedKey === null means all storage was cleared (e.g. DevTools "Clear storage")
      if (changedKey === null || changedKey === key) {
        setValue(readStorage(key, defaultValueRef.current, validatorRef.current));
      }
    }

    window.addEventListener('storage', handleStorageChange as EventListener);
    window.addEventListener('local-storage-write', handleStorageChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener);
      window.removeEventListener('local-storage-write', handleStorageChange as EventListener);
    };
  }, [key]);

  return [value, setStoredValue] as const;
}
