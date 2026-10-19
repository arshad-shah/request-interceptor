import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import type { ResponseBody } from '../../../types/network';
import { makeRequest, makeFrame } from './fixtures';

vi.mock('../../../lib/network-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/network-api')>();
  return {
    ...actual,
    getCurrentTabId: vi.fn(async () => 7),
    getResponseBody: vi.fn(async () => null),
    replayRequest: vi.fn(async () => ({ status: 200, statusText: 'OK' })),
    copyToClipboard: vi.fn(async () => true),
  };
});

import { NetworkRequestDetails } from '../details/NetworkRequestDetails';
import * as api from '../../../lib/network-api';

const tabButton = (name: string) =>
  screen.getAllByRole('button').find(b => b.classList.contains('ds-tab') && b.textContent?.startsWith(name));

const tabLabels = () =>
  screen
    .getAllByRole('button')
    .filter(b => b.classList.contains('ds-tab'))
    .map(b => b.textContent?.replace(/\d+$/, ''));

function renderDetails(
  request = makeRequest(),
  responseBody: ResponseBody | null = null
) {
  const onClose = vi.fn();
  const onLoadResponseBody = vi.fn();
  const utils = render(
    <NetworkRequestDetails
      request={request}
      responseBody={responseBody}
      onClose={onClose}
      onLoadResponseBody={onLoadResponseBody}
    />
  );
  return { ...utils, onClose, onLoadResponseBody };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NetworkRequestDetails (HTTP)', () => {
  it('shows HTTP tabs and the general info and headers by default', () => {
    renderDetails();

    expect(tabLabels()).toEqual([
      'Headers',
      'Payload',
      'Response',
      'Timing',
      'Cookies',
      'Initiator',
      'Insights',
    ]);
    expect(screen.getByText('Request URL')).toBeInTheDocument();
    expect(screen.getByText('200 OK', { selector: '.ds-header-value' })).toBeInTheDocument();
    expect(screen.getByText('X-Trace-Id')).toBeInTheDocument();
    expect(screen.getByText('trace-123')).toBeInTheDocument();
    expect(screen.getByText('Cache-Control')).toBeInTheDocument();
  });

  it('collapses sections and keeps the state across tab switches', () => {
    const { container } = renderDetails();
    fireEvent.click(screen.getByText('Request Headers'));
    expect(container.querySelectorAll('.ds-section.collapsed')).toHaveLength(1);

    fireEvent.click(tabButton('Timing')!);
    fireEvent.click(tabButton('Headers')!);
    expect(container.querySelectorAll('.ds-section.collapsed')).toHaveLength(1);
  });

  it('renders query params and a parsed URL-encoded body on the Payload tab', () => {
    renderDetails(
      makeRequest({
        method: 'POST',
        requestHeaders: [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
        postData: 'username=jane&remember=yes',
      })
    );
    fireEvent.click(tabButton('Payload')!);

    expect(screen.getByText('page')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('URL Encoded')).toBeInTheDocument();
    expect(screen.getByText('2 parameters')).toBeInTheDocument();
    expect(screen.getByText('username')).toBeInTheDocument();
    expect(screen.getByText('jane')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Raw' }));
    expect(screen.queryByText('URL Encoded')).toBeNull();
    expect(document.querySelector('.cm-content')?.textContent).toContain('username=jane&remember=yes');
  });

  it('shows empty payload states', () => {
    renderDetails(makeRequest({ query: '' }));
    fireEvent.click(tabButton('Payload')!);
    expect(screen.getByText('No query parameters')).toBeInTheDocument();
    expect(screen.getByText('No request body')).toBeInTheDocument();
  });

  it('renders the response body in preview and raw modes', () => {
    renderDetails(makeRequest({ mimeType: 'text/plain' }), {
      body: 'hello from the server',
      base64Encoded: false,
      mimeType: 'text/plain',
    });
    fireEvent.click(tabButton('Response')!);

    expect(document.querySelector('.cm-content')?.textContent).toContain('hello from the server');
    fireEvent.click(screen.getByRole('button', { name: /Raw/ }));
    expect(document.querySelector('.cm-content')?.textContent).toContain('hello from the server');
    expect(screen.getByTitle('Copy response')).toBeInTheDocument();
  });

  it('uses an embedded response body when opening the Response tab', () => {
    const embedded: ResponseBody = { body: '{"ok":true}', base64Encoded: false };
    const { onLoadResponseBody } = renderDetails(makeRequest({ responseBody: embedded }));

    fireEvent.click(tabButton('Response')!);
    expect(onLoadResponseBody).toHaveBeenCalledWith(embedded);
    expect(api.getResponseBody).not.toHaveBeenCalled();
  });

  it('fetches the response body from the background otherwise', async () => {
    const fetched: ResponseBody = { body: 'fetched', base64Encoded: false };
    vi.mocked(api.getResponseBody).mockResolvedValueOnce(fetched);
    const { onLoadResponseBody } = renderDetails();

    fireEvent.click(tabButton('Response')!);
    await waitFor(() => expect(onLoadResponseBody).toHaveBeenCalledWith(fetched));
    expect(api.getResponseBody).toHaveBeenCalledWith(7, 'req-1');
    expect(api.getResponseBody).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('No response body')).toBeInTheDocument();
  });

  it('lists request and response cookies', () => {
    renderDetails(
      makeRequest({
        requestHeaders: [{ name: 'Cookie', value: 'session=abc' }],
        responseHeaders: [{ name: 'Set-Cookie', value: 'token=xyz; HttpOnly; Secure' }],
      })
    );
    expect(within(tabButton('Cookies')!).getByText('2')).toBeInTheDocument();
    fireEvent.click(tabButton('Cookies')!);

    expect(screen.getByText('Request Cookies')).toBeInTheDocument();
    expect(screen.getByText('session')).toBeInTheDocument();
    expect(screen.getByText('token')).toBeInTheDocument();
    expect(screen.getByText('HttpOnly')).toBeInTheDocument();
  });

  it('summarizes insights with a severity badge on the tab', () => {
    renderDetails(makeRequest({ url: 'http://api.example.test/x', duration: 4000 }));
    const insightsTab = tabButton('Insights')!;
    expect(within(insightsTab).getByText('2').className).toContain('rose');

    fireEvent.click(insightsTab);
    expect(screen.getByText('Very Slow Response')).toBeInTheDocument();
    expect(screen.getByText('Insecure Connection')).toBeInTheDocument();
    expect(screen.getByText('2 errors')).toBeInTheDocument();
  });

  it('shows timing and initiator details', () => {
    renderDetails();
    fireEvent.click(tabButton('Timing')!);
    expect(screen.getByText('Total Duration')).toBeInTheDocument();
    expect(screen.getAllByText('250 ms').length).toBeGreaterThan(0);

    fireEvent.click(tabButton('Initiator')!);
    expect(screen.getByText('Unknown initiator')).toBeInTheDocument();
    expect(screen.getByText('Secure Connection')).toBeInTheDocument();
  });

  it('copies cURL from the footer and confirms with a toast', async () => {
    renderDetails();
    fireEvent.click(screen.getByRole('button', { name: /cURL/ }));

    await screen.findByText('cURL copied');
    expect(vi.mocked(api.copyToClipboard).mock.calls[0][0]).toMatch(
      /^curl 'https:\/\/api\.example\.test\/v1\/users\?page=2&sort=name'/
    );
  });

  it('replays the request', async () => {
    renderDetails();
    fireEvent.click(screen.getByRole('button', { name: /Replay/ }));
    expect(await screen.findByText('Replay: 200 OK')).toBeInTheDocument();
  });

  it('opens search with Ctrl+F and closes search, then the panel, with Escape', () => {
    const { container, onClose } = renderDetails();
    const panel = container.firstElementChild!;

    fireEvent.keyDown(panel, { key: 'f', ctrlKey: true });
    const search = screen.getByPlaceholderText('Search headers, body, cookies...');
    fireEvent.change(search, { target: { value: 'trace' } });
    expect(screen.getByText('trace', { selector: 'mark' })).toBeInTheDocument();
    expect(screen.queryByText('Cache-Control')).toBeNull();

    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Search headers, body, cookies...')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('NetworkRequestDetails (WebSocket)', () => {
  const socket = makeRequest({
    requestId: 'ws-1',
    url: 'wss://socket.example.test/live',
    method: 'WS',
    type: 'websocket',
    wsFramesSent: 2,
    wsFramesReceived: 1,
    wsSentSize: 30,
    wsReceivedSize: 20,
    wsFrames: [
      makeFrame({ type: 'sent', data: '{"op":"subscribe","topic":"prices"}', timestamp: 1 }),
      makeFrame({ type: 'received', data: 'tick 101.5', timestamp: 2 }),
      makeFrame({ type: 'sent', data: 'ping', timestamp: 3 }),
    ],
  });

  it('replaces Payload/Response with a Messages tab', () => {
    renderDetails(socket);
    expect(tabLabels()).toEqual(['Headers', 'Messages', 'Timing', 'Cookies', 'Initiator', 'Insights']);
    expect(within(tabButton('Messages')!).getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Frames Sent')).toBeInTheDocument();
    expect(screen.getByText('2 (30 B)')).toBeInTheDocument();
  });

  it('lists frames and filters by direction and text', () => {
    renderDetails(socket);
    fireEvent.click(tabButton('Messages')!);

    expect(screen.getByText('tick 101.5')).toBeInTheDocument();
    expect(screen.getByText('ping')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Received/ }));
    expect(screen.getByText('tick 101.5')).toBeInTheDocument();
    expect(screen.queryByText('ping')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^All/ }));
    fireEvent.change(screen.getByPlaceholderText('Filter messages...'), { target: { value: 'PING' } });
    expect(screen.getByText('ping')).toBeInTheDocument();
    expect(screen.queryByText('tick 101.5')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Filter messages...'), { target: { value: 'nope' } });
    expect(screen.getByText('No messages match your filter')).toBeInTheDocument();
  });

  it('opens a frame in the detail pane and closes it', () => {
    renderDetails(socket);
    fireEvent.click(tabButton('Messages')!);

    fireEvent.click(screen.getByText('tick 101.5'));
    const closeButton = screen.getByTitle('Close');
    expect(screen.getAllByText('tick 101.5').length).toBeGreaterThan(1);

    fireEvent.click(closeButton);
    expect(screen.queryByTitle('Close')).toBeNull();
  });

  it('copies a single frame', async () => {
    renderDetails(socket);
    fireEvent.click(tabButton('Messages')!);
    fireEvent.click(screen.getAllByTitle('Copy message')[2]);

    await screen.findByText('Message copied');
    expect(api.copyToClipboard).toHaveBeenCalledWith('ping');
  });

  it('shows an empty state before any frames arrive', () => {
    renderDetails({ ...socket, wsFrames: [] });
    fireEvent.click(tabButton('Messages')!);
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });
});
