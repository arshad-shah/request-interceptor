import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from '../SettingsPanel';
import { DEFAULT_SETTINGS, mergeSettings, normalizeSettings, type DeepPartial, type Settings } from '@/core/settings';

type Listener = (payload: unknown) => void;
const listeners = new Map<string, Listener>();
const request = vi.fn<(type: string, payload?: unknown) => Promise<unknown>>();

vi.mock('@/lib/messaging', () => ({
  request: (type: string, payload?: unknown) => request(type, payload),
  onEvent: (type: string, cb: Listener) => {
    listeners.set(type, cb);
    return () => listeners.delete(type);
  },
}));

const downloadFile = vi.fn();
vi.mock('@/lib/chrome-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/chrome-api')>()),
  downloadFile: (...args: unknown[]) => downloadFile(...args),
}));

/** Minimal in-memory background: GET/UPDATE/RESET/IMPORT behave like the real handlers. */
let stored: Settings;
const background = async (type: string, payload?: unknown): Promise<unknown> => {
  switch (type) {
    case 'GET_SETTINGS':
      return stored;
    case 'UPDATE_SETTINGS':
      stored = mergeSettings(stored, (payload as { patch: DeepPartial<Settings> }).patch);
      return stored;
    case 'RESET_SETTINGS':
      stored = structuredClone(DEFAULT_SETTINGS);
      return stored;
    case 'IMPORT_SETTINGS': {
      const data = (payload as { settings: unknown }).settings;
      if (!data || typeof data !== 'object') throw new Error('Invalid settings file');
      stored = normalizeSettings(data);
      return stored;
    }
    default:
      throw new Error(`unexpected ${type}`);
  }
};

const settingsWith = (patch: DeepPartial<Settings>) => mergeSettings(DEFAULT_SETTINGS, patch);

beforeEach(() => {
  listeners.clear();
  downloadFile.mockReset();
  stored = structuredClone(DEFAULT_SETTINGS);
  request.mockReset().mockImplementation(background);
});

const renderLoaded = async () => {
  const utils = render(<SettingsPanel />);
  await screen.findByRole('heading', { name: 'Notifications' });
  return utils;
};

const sw = (name: string) => screen.getByRole('switch', { name });
const updates = () => request.mock.calls.filter(([t]) => t === 'UPDATE_SETTINGS').map(([, p]) => p);

describe('SettingsPanel', () => {
  it('shows a loading state until settings arrive', async () => {
    let resolve: (s: Settings) => void = () => {};
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    render(<SettingsPanel />);
    expect(screen.getByText('Loading settings…')).toBeInTheDocument();
    await act(async () => resolve(stored));
    expect(screen.queryByText('Loading settings…')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Sites' })).toBeInTheDocument();
  });

  it('shows the load error instead of the form', async () => {
    request.mockRejectedValueOnce(new Error('Background unavailable'));
    render(<SettingsPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Background unavailable');
    expect(screen.queryByRole('heading', { name: 'Notifications' })).toBeNull();
  });

  it('renders current values', async () => {
    stored = settingsWith({ notifications: { durationMs: 5000, maxVisible: 3 }, diagnostics: { pageConsoleLogs: true } });
    await renderLoaded();
    expect(sw('Show on-page notifications')).toBeChecked();
    expect(sw('Log to the page console')).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: 'Notification duration' })).toHaveValue('5');
    expect(screen.getByRole('spinbutton', { name: 'Maximum visible notifications' })).toHaveValue('3');
    expect(screen.getByRole('spinbutton', { name: 'Requests kept per tab' })).toHaveValue('500');
  });

  it('sends toggle patches and reflects the saved result', async () => {
    await renderLoaded();
    fireEvent.click(sw('Notify: Blocked requests'));
    await waitFor(() => expect(sw('Notify: Blocked requests')).not.toBeChecked());
    fireEvent.click(sw('Log to the page console'));
    await waitFor(() => expect(sw('Log to the page console')).toBeChecked());
    expect(updates()).toEqual([
      { patch: { notifications: { events: { block: false } } } },
      { patch: { diagnostics: { pageConsoleLogs: true } } },
    ]);
  });

  it('disables per-event and display controls when page toasts are off', async () => {
    await renderLoaded();
    fireEvent.click(sw('Show on-page notifications'));
    await waitFor(() => expect(sw('Show on-page notifications')).not.toBeChecked());
    expect(updates()).toEqual([{ patch: { notifications: { pageToasts: false } } }]);
    expect(sw('Notify: Mocked responses')).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Notification duration' })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Maximum visible notifications' })).toBeDisabled();
    // Network limits stay editable.
    expect(screen.getByRole('spinbutton', { name: 'Requests kept per tab' })).toBeEnabled();
  });

  it('commits number fields on Enter and blur, converting seconds and clamping', async () => {
    await renderLoaded();
    const duration = screen.getByRole('spinbutton', { name: 'Notification duration' });
    fireEvent.change(duration, { target: { value: '7' } });
    fireEvent.keyDown(duration, { key: 'Enter' });
    await waitFor(() => expect(stored.notifications.durationMs).toBe(7000));

    const requests = screen.getByRole('spinbutton', { name: 'Requests kept per tab' });
    fireEvent.change(requests, { target: { value: '99999' } });
    fireEvent.blur(requests);
    await waitFor(() => expect(stored.network.maxRequests).toBe(5000));

    fireEvent.click(screen.getByRole('button', { name: 'Increase Response body cache size' }));
    await waitFor(() => expect(stored.network.bodyCacheMB).toBe(36));

    expect(updates()).toEqual([
      { patch: { notifications: { durationMs: 7000 } } },
      { patch: { network: { maxRequests: 5000 } } },
      { patch: { network: { bodyCacheMB: 36 } } },
    ]);
  });

  it('saves the deny list on blur as trimmed, non-empty lines', async () => {
    await renderLoaded();
    const deny = screen.getByRole('textbox', { name: 'Never run on' });
    fireEvent.change(deny, { target: { value: '  bank.example.com \n\n/mail\\.google/  \n' } });
    expect(updates()).toHaveLength(0);
    fireEvent.blur(deny);
    await waitFor(() =>
      expect(updates()).toEqual([{ patch: { sites: { denylist: ['bank.example.com', '/mail\\.google/'] } } }])
    );
    await waitFor(() => expect(deny).toHaveValue('bank.example.com\n/mail\\.google/'));
  });

  it('only shows the allow list in allowlist mode and saves it', async () => {
    await renderLoaded();
    expect(screen.queryByRole('textbox', { name: 'Allowed sites' })).toBeNull();

    act(() => listeners.get('SETTINGS_CHANGED')?.(settingsWith({ sites: { mode: 'allowlist', allowlist: ['localhost'] } })));
    const allow = screen.getByRole('textbox', { name: 'Allowed sites' });
    expect(allow).toHaveValue('localhost');

    stored = settingsWith({ sites: { mode: 'allowlist', allowlist: ['localhost'] } });
    fireEvent.change(allow, { target: { value: 'localhost\nstaging.example.com' } });
    fireEvent.blur(allow);
    await waitFor(() =>
      expect(updates()).toEqual([{ patch: { sites: { allowlist: ['localhost', 'staging.example.com'] } } }])
    );
  });

  it('changes the site mode through the select', async () => {
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.scrollIntoView ??= () => {};
    await renderLoaded();
    const user = userEvent.setup();
    const [, runOn] = screen.getAllByRole('combobox');
    expect(runOn).toHaveTextContent('All sites');
    await user.click(runOn);
    await user.click(await screen.findByRole('option', { name: 'Only listed sites' }));
    await waitFor(() => expect(updates()).toEqual([{ patch: { sites: { mode: 'allowlist' } } }]));
    expect(await screen.findByRole('textbox', { name: 'Allowed sites' })).toBeInTheDocument();
  });

  it('updates when another surface broadcasts SETTINGS_CHANGED', async () => {
    await renderLoaded();
    act(() =>
      listeners.get('SETTINGS_CHANGED')?.(
        settingsWith({ notifications: { maxVisible: 9 }, sites: { denylist: ['x.test'] } })
      )
    );
    expect(screen.getByRole('spinbutton', { name: 'Maximum visible notifications' })).toHaveValue('9');
    expect(screen.getByRole('textbox', { name: 'Never run on' })).toHaveValue('x.test');
  });

  it('surfaces update failures in a dismissible alert', async () => {
    await renderLoaded();
    request.mockRejectedValueOnce(new Error('Storage quota exceeded'));
    fireEvent.click(sw('Log to the page console'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage quota exceeded');
    expect(sw('Log to the page console')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('resets to defaults', async () => {
    stored = settingsWith({ diagnostics: { pageConsoleLogs: true }, network: { maxRequests: 2000 } });
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));
    await waitFor(() => expect(sw('Log to the page console')).not.toBeChecked());
    expect(request).toHaveBeenCalledWith('RESET_SETTINGS', undefined);
    expect(screen.getByRole('spinbutton', { name: 'Requests kept per tab' })).toHaveValue('500');
  });

  it('exports the current settings as JSON', async () => {
    stored = settingsWith({ notifications: { position: 'bottom-left' } });
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(downloadFile).toHaveBeenCalledTimes(1);
    const [content, filename] = downloadFile.mock.calls[0] as [string, string];
    expect(filename).toBe('request-interceptor-settings.json');
    expect(JSON.parse(content)).toEqual(stored);
  });

  it('imports a settings file', async () => {
    const { container } = await renderLoaded();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('file input missing');
    const file = new File([JSON.stringify({ diagnostics: { pageConsoleLogs: true } })], 's.json', {
      type: 'application/json',
    });
    await userEvent.upload(input, file);
    await waitFor(() => expect(sw('Log to the page console')).toBeChecked());
    expect(request).toHaveBeenCalledWith('IMPORT_SETTINGS', { settings: { diagnostics: { pageConsoleLogs: true } } });
    expect(input.value).toBe('');
  });

  it('reports an invalid import file through the background error', async () => {
    const { container } = await renderLoaded();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('file input missing');
    await userEvent.upload(input, new File(['{ not json'], 'bad.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid settings file');
    expect(request).toHaveBeenCalledWith('IMPORT_SETTINGS', { settings: null });
  });
});
