import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NetworkRequestList } from '../NetworkRequestList';
import { NetworkFilters } from '../NetworkFilters';
import { useNetworkStore, useFilteredNetworkRequests } from '../../../stores/network-store';
import type { NetworkRequest } from '../../../types/network';
import { makeRequest } from './fixtures';

const users = makeRequest({ requestId: 'r-users', statusCode: 200, duration: 300 });
const script = makeRequest({
  requestId: 'r-script',
  url: 'https://cdn.example.test/app.js',
  hostname: 'cdn.example.test',
  pathname: '/app.js',
  filename: 'app.js',
  query: '',
  type: 'script',
  mimeType: 'text/javascript',
  statusCode: 404,
  duration: 120,
});
const login = makeRequest({
  requestId: 'r-login',
  url: 'https://auth.example.test/login',
  hostname: 'auth.example.test',
  pathname: '/login',
  filename: 'login',
  query: '',
  method: 'POST',
  statusCode: 201,
  duration: 900,
});

const rowNames = () =>
  screen.getAllByRole('row').map(row => within(row).getByTitle(/^https:/).textContent);

function renderList(
  requests: NetworkRequest[],
  props: Partial<React.ComponentProps<typeof NetworkRequestList>> = {}
) {
  const onSelectRequest = vi.fn();
  const onInterceptRequest = vi.fn();
  const utils = render(
    <NetworkRequestList
      requests={requests}
      selectedRequest={null}
      onSelectRequest={onSelectRequest}
      onInterceptRequest={onInterceptRequest}
      {...props}
    />
  );
  return { ...utils, onSelectRequest, onInterceptRequest };
}

/** List wired to the store the same way NetworkTab does, including the filter bar. */
function FilteredList() {
  const requests = useFilteredNetworkRequests();
  return (
    <>
      <NetworkFilters />
      <NetworkRequestList
        requests={requests}
        selectedRequest={null}
        onSelectRequest={() => {}}
        onInterceptRequest={() => {}}
      />
    </>
  );
}

beforeEach(() => {
  useNetworkStore.getState().clearRequests();
  useNetworkStore.getState().clearFilters();
  useNetworkStore.getState().updateSettings({ showWaterfall: true });
});

describe('NetworkRequestList', () => {
  it('renders a row per request with method, status and size', () => {
    renderList([users, script, login]);

    expect(rowNames()).toEqual(['users', 'app.js', 'login']);
    const loginRow = screen.getAllByRole('row')[2];
    expect(within(loginRow).getByText('POST')).toBeInTheDocument();
    expect(within(loginRow).getByText('201')).toBeInTheDocument();
    expect(within(loginRow).getByText('512 B')).toBeInTheDocument();
    expect(screen.getByText('Waterfall')).toBeInTheDocument();
  });

  it('hides the waterfall column when disabled in settings', () => {
    useNetworkStore.getState().updateSettings({ showWaterfall: false });
    renderList([users]);
    expect(screen.queryByText('Waterfall')).toBeNull();
  });

  it('selects a request on click and keyboard activation', () => {
    const { onSelectRequest } = renderList([users, script]);

    fireEvent.click(screen.getAllByRole('row')[1]);
    expect(onSelectRequest).toHaveBeenLastCalledWith(script);

    fireEvent.keyDown(screen.getAllByRole('row')[0], { key: 'Enter' });
    expect(onSelectRequest).toHaveBeenLastCalledWith(users);
  });

  it('marks the selected row', () => {
    renderList([users, script], { selectedRequest: script });
    const [first, second] = screen.getAllByRole('row');
    expect(second.className).toContain('border-l-2');
    expect(first.className).not.toContain('border-l-2');
  });

  it('creates an intercept rule without selecting the row', () => {
    const { onSelectRequest, onInterceptRequest } = renderList([users]);

    fireEvent.click(screen.getByTitle('Create intercept rule'));
    expect(onInterceptRequest).toHaveBeenCalledWith(users);
    expect(onSelectRequest).not.toHaveBeenCalled();
  });

  it('cycles column sorting ascending, descending, then off', () => {
    renderList([users, script, login]);
    const statusHeader = screen.getByTitle('Sort by Status');

    fireEvent.click(statusHeader);
    expect(rowNames()).toEqual(['users', 'login', 'app.js']);
    expect(screen.getByText(/ascending/)).toBeInTheDocument();

    fireEvent.click(statusHeader);
    expect(rowNames()).toEqual(['app.js', 'login', 'users']);

    fireEvent.click(statusHeader);
    expect(rowNames()).toEqual(['users', 'app.js', 'login']);
    expect(screen.queryByText('Clear sort')).toBeNull();
  });

  it('clears sorting from the footer', () => {
    renderList([users, script, login]);
    fireEvent.click(screen.getByTitle('Sort by Time'));
    expect(rowNames()).toEqual(['app.js', 'users', 'login']);

    fireEvent.click(screen.getByText('Clear sort'));
    expect(rowNames()).toEqual(['users', 'app.js', 'login']);
  });

  it('shows the capture empty state when there are no requests', () => {
    renderList([]);
    expect(screen.getByText('No requests captured')).toBeInTheDocument();
  });
});

describe('NetworkRequestList filtering', () => {
  beforeEach(() => {
    useNetworkStore.getState().setRequests([users, script, login]);
  });

  it('filters by resource type', () => {
    render(<FilteredList />);
    expect(rowNames()).toEqual(['users', 'app.js', 'login']);

    fireEvent.click(screen.getByRole('button', { name: 'JS' }));
    expect(rowNames()).toEqual(['app.js']);
    expect(screen.getByText('Showing 1 filtered request')).toBeInTheDocument();

    // fetch requests are grouped under XHR
    fireEvent.click(screen.getByRole('button', { name: 'XHR' }));
    expect(rowNames()).toEqual(['users', 'login']);
  });

  it('filters by search text across URL, method and status', () => {
    render(<FilteredList />);
    const search = screen.getByPlaceholderText('Filter by URL, method, or status...');

    fireEvent.change(search, { target: { value: 'post' } });
    expect(rowNames()).toEqual(['login']);

    fireEvent.change(search, { target: { value: '404' } });
    expect(rowNames()).toEqual(['app.js']);
  });

  it('shows the filtered empty state and clears filters', () => {
    render(<FilteredList />);
    fireEvent.change(screen.getByPlaceholderText('Filter by URL, method, or status...'), {
      target: { value: 'nothing-matches' },
    });

    expect(screen.getByText('No matching requests')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear Filters/i }));
    expect(rowNames()).toEqual(['users', 'app.js', 'login']);
  });

  it('clears filters from the indicator bar', () => {
    render(<FilteredList />);
    fireEvent.click(screen.getByRole('button', { name: 'Doc' }));
    fireEvent.click(screen.getByRole('button', { name: 'Img' }));
    expect(screen.getByText('No matching requests')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'JS' }));
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/ }));
    expect(rowNames()).toEqual(['users', 'app.js', 'login']);
  });
});
