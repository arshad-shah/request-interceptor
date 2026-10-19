import { useCallback, useEffect, useState } from 'react';
import { request, onEvent } from '@/lib/messaging';
import type { DeepPartial, Settings } from '@/core/settings';

/** Live settings from the background, with update/reset helpers that surface errors. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    request('GET_SETTINGS')
      .then((s) => active && setSettings(s))
      .catch((e: Error) => active && setError(e.message));
    const off = onEvent('SETTINGS_CHANGED', (s) => setSettings(s));
    return () => {
      active = false;
      off();
    };
  }, []);

  const run = useCallback(async (operation: () => Promise<Settings>) => {
    try {
      setError(null);
      setSettings(await operation());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  return {
    settings,
    error,
    clearError: () => setError(null),
    update: (patch: DeepPartial<Settings>) => run(() => request('UPDATE_SETTINGS', { patch })),
    reset: () => run(() => request('RESET_SETTINGS')),
    importFrom: (data: unknown) => run(() => request('IMPORT_SETTINGS', { settings: data })),
  };
}
