import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SiteSwitch from '../SiteSwitch';
import { DEFAULT_SETTINGS, mergeSettings, type DeepPartial, type Settings } from '@/core/settings';

const request = vi.fn<(type: string, payload?: unknown) => Promise<unknown>>();
vi.mock('@/lib/messaging', () => ({
  request: (type: string, payload?: unknown) => request(type, payload),
  onEvent: vi.fn(() => () => {}),
}));

let stored: Settings;
const tabsQuery = chrome.tabs.query as unknown as Mock<(q: chrome.tabs.QueryInfo) => Promise<chrome.tabs.Tab[]>>;

const setup = (tab: { url?: string } | undefined, patch: DeepPartial<Settings> = {}) => {
  stored = mergeSettings(DEFAULT_SETTINGS, patch);
  tabsQuery.mockResolvedValue(tab ? [tab as chrome.tabs.Tab] : []);
  return render(<SiteSwitch />);
};

const updates = () => request.mock.calls.filter(([t]) => t === 'UPDATE_SETTINGS').map(([, p]) => p);

beforeEach(() => {
  tabsQuery.mockReset();
  request.mockReset().mockImplementation(async (type, payload) => {
    if (type === 'GET_SETTINGS') return stored;
    if (type === 'UPDATE_SETTINGS') {
      stored = mergeSettings(stored, (payload as { patch: DeepPartial<Settings> }).patch);
      return stored;
    }
    throw new Error(`unexpected ${type}`);
  });
});

describe('SiteSwitch', () => {
  it('queries the active tab and shows its host as enabled by default', async () => {
    setup({ url: 'https://app.example.com/dashboard?x=1' });
    const toggle = await screen.findByRole('switch', { name: 'Run on app.example.com' });
    expect(toggle).toBeChecked();
    expect(screen.getByText('Run on this site')).toBeInTheDocument();
    expect(tabsQuery).toHaveBeenCalledWith({ active: true, currentWindow: true });
  });

  it('shows the site as disabled when a deny pattern matches it', async () => {
    setup({ url: 'https://app.example.com/' }, { sites: { denylist: ['app.example.com'] } });
    expect(await screen.findByRole('switch', { name: 'Run on app.example.com' })).not.toBeChecked();
  });

  it('shows the site as disabled in allowlist mode when it is not listed', async () => {
    setup({ url: 'http://localhost:3000/' }, { sites: { mode: 'allowlist', allowlist: ['staging.test'] } });
    expect(await screen.findByRole('switch', { name: 'Run on localhost' })).not.toBeChecked();
  });

  it('turning off appends the host to the deny list', async () => {
    setup({ url: 'https://app.example.com/' }, { sites: { denylist: ['other.test'] } });
    fireEvent.click(await screen.findByRole('switch', { name: 'Run on app.example.com' }));
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Run on app.example.com' })).not.toBeChecked()
    );
    expect(updates()).toEqual([{ patch: { sites: { denylist: ['other.test', 'app.example.com'] } } }]);
  });

  it('turning on removes the host from the deny list', async () => {
    setup({ url: 'https://app.example.com/' }, { sites: { denylist: ['other.test', 'app.example.com'] } });
    fireEvent.click(await screen.findByRole('switch', { name: 'Run on app.example.com' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Run on app.example.com' })).toBeChecked());
    expect(updates()).toEqual([{ patch: { sites: { denylist: ['other.test'] } } }]);
  });

  it('turning on in allowlist mode also adds the host to the allow list', async () => {
    setup({ url: 'http://localhost:3000/' }, { sites: { mode: 'allowlist', allowlist: ['staging.test'] } });
    fireEvent.click(await screen.findByRole('switch', { name: 'Run on localhost' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Run on localhost' })).toBeChecked());
    expect(updates()).toEqual([
      { patch: { sites: { denylist: [], allowlist: ['staging.test', 'localhost'] } } },
    ]);
  });

  // BUG: turning the switch on only removes the exact hostname from the deny list.
  // When the site is blocked by a broader pattern (e.g. the parent domain
  // `example.com`, `*.example.com` or a regex), the update is a no-op and the
  // switch stays off, so the user cannot re-enable the site from the popup.
  it.fails('turning on re-enables a site blocked by a parent-domain pattern', async () => {
    setup({ url: 'https://app.example.com/' }, { sites: { denylist: ['example.com'] } });
    fireEvent.click(await screen.findByRole('switch', { name: 'Run on app.example.com' }));
    await waitFor(() => expect(updates()).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Run on app.example.com' })).toBeChecked());
  });

  it('shows an update error', async () => {
    setup({ url: 'https://app.example.com/' });
    const toggle = await screen.findByRole('switch', { name: 'Run on app.example.com' });
    request.mockRejectedValueOnce(new Error('Could not save'));
    fireEvent.click(toggle);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
    expect(toggle).toBeChecked();
  });

  it.each([
    ['a chrome:// page', { url: 'chrome://extensions/' }],
    ['a file:// page', { url: 'file:///Users/me/index.html' }],
    ['a tab without a URL', {}],
    ['no active tab', undefined],
  ])('renders nothing on %s', async (_label, tab) => {
    const { container } = setup(tab);
    await waitFor(() => expect(request).toHaveBeenCalledWith('GET_SETTINGS', undefined));
    await waitFor(() => expect(tabsQuery).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the tab query fails', async () => {
    stored = DEFAULT_SETTINGS;
    tabsQuery.mockRejectedValue(new Error('no tabs permission'));
    const { container } = render(<SiteSwitch />);
    await waitFor(() => expect(tabsQuery).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing until settings load', async () => {
    tabsQuery.mockResolvedValue([{ url: 'https://app.example.com/' } as chrome.tabs.Tab]);
    request.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<SiteSwitch />);
    await waitFor(() => expect(tabsQuery).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
