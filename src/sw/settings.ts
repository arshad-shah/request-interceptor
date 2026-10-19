/** User settings, persisted locally and broadcast on change. */
import { DEFAULT_SETTINGS, mergeSettings, normalizeSettings, type DeepPartial, type Settings } from '@/core/settings';
import type { MessageRouter } from '@/core/messaging/router';
import { emit, emitToTabs } from '@/lib/messaging';
import { logger } from '@/lib/logger';

const log = logger.child('settings');
const KEY = 'settings';

export class SettingsStore {
  private settings: Settings = DEFAULT_SETTINGS;
  private listeners = new Set<(settings: Settings) => void>();
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.load();
  }

  get(): Settings {
    return this.settings;
  }

  /** Background modules that depend on settings (e.g. capture limits). */
  subscribe(listener: (settings: Settings) => void): void {
    this.listeners.add(listener);
    listener(this.settings);
  }

  private async load(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(KEY);
      this.settings = normalizeSettings(stored[KEY]);
    } catch (error) {
      log.error('Could not load settings; using defaults', { error: String(error) });
    }
    this.notify();
  }

  private async replace(next: Settings): Promise<Settings> {
    try {
      await chrome.storage.local.set({ [KEY]: next });
    } catch (error) {
      throw new Error(`Could not save settings: ${error instanceof Error ? error.message : String(error)}`);
    }
    this.settings = next;
    this.notify();
    emit('SETTINGS_CHANGED', next);
    emitToTabs('SETTINGS_CHANGED', next);
    return next;
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.settings);
  }

  register(router: MessageRouter): void {
    router
      .on('GET_SETTINGS', () => this.settings)
      .on('UPDATE_SETTINGS', ({ patch }) => this.replace(mergeSettings(this.settings, patch)))
      .on('IMPORT_SETTINGS', ({ settings }) => this.replace(normalizeSettings(settings)))
      .on('RESET_SETTINGS', () => this.replace(DEFAULT_SETTINGS));
  }
}

export type { DeepPartial, Settings };
