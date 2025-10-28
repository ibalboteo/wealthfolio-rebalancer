import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Safe wrapper para leer localStorage con manejo de errores y fallback
 */
function safeGetItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Hook genérico para sincronizar estado con localStorage
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  const [value, setValue] = useState<T>(() => safeGetItem(key, defaultValue));

  // Efecto para actualizar el valor cuando cambie la clave
  useEffect(() => {
    setValue(safeGetItem(key, defaultValueRef.current));
  }, [key]);

  /**
   * Actualiza el estado y localStorage de forma segura
   */
  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const valueToStore = newValue instanceof Function ? newValue(prev) : newValue;

        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(valueToStore));

            // Dispara manualmente un evento "storage" para sincronizar
            window.dispatchEvent(
              new StorageEvent('storage', {
                key,
                newValue: JSON.stringify(valueToStore),
                oldValue: JSON.stringify(prev),
              })
            );
          }
        } catch {
          // Ignora errores (ej. localStorage lleno o no disponible)
        }

        return valueToStore;
      });
    },
    [key]
  );

  /**
   * Sincroniza el valor si cambia en otra pestaña
   */
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === key && event.newValue !== null) {
        try {
          const parsed = JSON.parse(event.newValue);
          setValue(parsed);
        } catch {
          // Ignorar si no se puede parsear
        }
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, setStoredValue] as const;
}
