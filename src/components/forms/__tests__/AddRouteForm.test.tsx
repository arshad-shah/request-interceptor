import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddRouteForm from '../AddRouteForm';
import { useAppStore } from '@/stores/app-store';
import type { RouteConfig } from '@/types';

const request = vi.fn();
vi.mock('@/lib/messaging', () => ({
  request: (...args: unknown[]) => request(...args),
  onEvent: vi.fn(() => () => {}),
}));

// CodeMirror is exercised in its own tests; a textarea labelled by its placeholder keeps
// these focused on the form.
vi.mock('@/components/common/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <textarea aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const initial = useAppStore.getState();

beforeEach(() => {
  request.mockReset().mockResolvedValue(undefined);
  useAppStore.setState({
    ...initial,
    routes: {},
    notifications: [],
    editingRoute: null,
    isFormOpen: true,
  });
});

const state = () => useAppStore.getState();
const lastNotification = () => state().notifications.at(-1);

const typeUrl = (value: string) =>
  fireEvent.change(screen.getByLabelText(/URL to Intercept/), { target: { value } });
const typeName = (value: string) =>
  fireEvent.change(screen.getByLabelText('Route Name (optional)'), { target: { value } });
const chooseRadio = (value: string) =>
  fireEvent.click(document.querySelector(`input[type="radio"][value="${value}"]`) as HTMLElement);
const submit = () => fireEvent.click(screen.getByRole('button', { name: /add interception|save changes/i }));

describe('AddRouteForm validation', () => {
  it('shows the URL error on submit and does not call the background', () => {
    render(<AddRouteForm />);
    submit();
    expect(screen.getByText('URL is required')).toBeInTheDocument();
    expect(lastNotification()).toMatchObject({ title: 'Validation Error', type: 'error' });
    expect(request).not.toHaveBeenCalled();
  });

  it('clears a field error once the field is edited', () => {
    render(<AddRouteForm />);
    submit();
    typeUrl('/api');
    expect(screen.queryByText('URL is required')).toBeNull();
  });

  it('reports invalid JSON in the mock response', () => {
    render(<AddRouteForm />);
    typeUrl('/api/users');
    fireEvent.change(screen.getByLabelText('Enter your response content here'), {
      target: { value: '{ broken' },
    });
    expect(screen.queryByText(/JSON at position/)).toBeNull();
    submit();
    expect(screen.getByText(/JSON at position/)).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('requires a redirect URL in redirect mode', () => {
    render(<AddRouteForm />);
    typeUrl('/api/users');
    chooseRadio('redirect');
    submit();
    expect(screen.getByText('Redirect URL is required')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('requires a WebSocket message rule', () => {
    render(<AddRouteForm />);
    chooseRadio('websocket');
    fireEvent.change(screen.getByLabelText('WebSocket URL to Intercept'), {
      target: { value: 'wss://x' },
    });
    submit();
    expect(
      screen.getByText('At least one message rule is required for WebSocket interception')
    ).toBeInTheDocument();
  });
});

describe('AddRouteForm submit', () => {
  it('adds an HTTP mock route and closes the form', async () => {
    render(<AddRouteForm />);
    typeName('Users');
    typeUrl('/api/users');
    fireEvent.change(screen.getByLabelText('Enter your response content here'), {
      target: { value: '{"users":[]}' },
    });
    submit();

    await waitFor(() => expect(state().isFormOpen).toBe(false));
    expect(request).toHaveBeenCalledWith('ADD_ROUTE', {
      route: 'GET:/api/users|Users',
      config: expect.objectContaining({ response: { users: [] }, interceptionMode: 'mock' }),
      name: 'Users',
    });
    expect(state().routes['GET:/api/users|Users']).toMatchObject({ status: 200, enabled: true });
    expect(lastNotification()).toMatchObject({
      type: 'success',
      message: 'Route added successfully (mock)',
    });
  });

  it('adds a redirect route', async () => {
    render(<AddRouteForm />);
    typeUrl('/old');
    chooseRadio('redirect');
    fireEvent.change(screen.getByLabelText('Redirect URL'), {
      target: { value: 'https://new.test/api' },
    });
    submit();

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith('ADD_ROUTE', {
      route: 'GET:/old',
      config: expect.objectContaining({
        interceptionMode: 'redirect',
        redirectUrl: 'https://new.test/api',
      }),
      name: '',
    });
    await waitFor(() =>
      expect(lastNotification()?.message).toBe('Route added successfully (redirect)')
    );
    expect(state().routes['GET:/old']).toBeDefined();
  });

  it('adds a block route without body sections', async () => {
    render(<AddRouteForm />);
    typeUrl('/ads/*');
    chooseRadio('block');
    expect(screen.queryByRole('button', { name: 'Response & Request Body section' })).toBeNull();
    submit();

    await waitFor(() =>
      expect(lastNotification()?.message).toBe('Route added successfully (block)')
    );
    const [type, payload] = request.mock.calls[0] as [string, { route: string; config: RouteConfig }];
    expect(type).toBe('ADD_ROUTE');
    expect(payload.route).toBe('GET:/ads/*');
    expect(payload.config.interceptionMode).toBe('block');
    expect(state().routes).toHaveProperty(['GET:/ads/*']);
  });

  it('adds a WebSocket route with a message rule', async () => {
    render(<AddRouteForm />);
    chooseRadio('websocket');
    fireEvent.change(screen.getByLabelText('WebSocket URL to Intercept'), {
      target: { value: 'wss://chat' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Match Pattern'), { target: { value: 'ping' } });
    fireEvent.change(screen.getByLabelText('Replacement Text'), { target: { value: 'pong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    submit();

    await waitFor(() => expect(state().routes['WS:wss://chat']).toBeDefined());
    expect(request).toHaveBeenCalledWith('ADD_ROUTE', {
      route: 'WS:wss://chat',
      config: expect.objectContaining({
        incomingRules: [expect.objectContaining({ match: 'ping', replacement: 'pong', type: 'replace' })],
        outgoingRules: [],
      }),
      name: '',
    });
    expect(lastNotification()?.message).toBe('Route added successfully WebSocket');
  });

  it('adds an injection route', async () => {
    render(<AddRouteForm />);
    chooseRadio('injection');
    typeUrl('*://example.com/*');
    submit();
    expect(screen.getByText('At least one script or stylesheet is required')).toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText('// Enter JavaScript code to inject into matching pages'),
      { target: { value: 'console.log(1)' } }
    );
    chooseRadio('document_start');
    submit();

    await waitFor(() => expect(state().routes['INJ:*://example.com/*']).toBeDefined());
    expect(request).toHaveBeenCalledWith('ADD_ROUTE', {
      route: 'INJ:*://example.com/*',
      config: expect.objectContaining({
        scripts: ['console.log(1)'],
        stylesheets: [],
        injectAt: 'document_start',
        urlPattern: '*://example.com/*',
      }),
      name: '',
    });
    expect(lastNotification()?.message).toBe('Route added successfully Injection');
  });

  it('shows an error notification and keeps the form open when saving fails', async () => {
    request.mockRejectedValue(new Error('boom'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<AddRouteForm />);
    typeUrl('/api/users');
    submit();

    await waitFor(() => expect(lastNotification()).toMatchObject({ title: 'Error', type: 'error' }));
    expect(lastNotification()?.message).toBe('Failed to save route');
    expect(state().routes).toEqual({});
    expect(state().isFormOpen).toBe(true);
    expect(screen.getByRole('button', { name: 'Add interception' })).toBeEnabled();
    consoleError.mockRestore();
  });

  it('cancel resets the form state in the store', () => {
    render(<AddRouteForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(state().isFormOpen).toBe(false);
    expect(state().editingRoute).toBeNull();
  });
});

describe('AddRouteForm editing', () => {
  const existing: RouteConfig = {
    status: 404,
    delay: 0,
    response: { error: 'nope' },
    contentType: 'application/json',
    enabled: true,
    timestamp: 1,
    interceptionMode: 'mock',
  };

  beforeEach(() => {
    useAppStore.setState({ routes: { 'GET:/api/old': existing }, editingRoute: 'GET:/api/old' });
  });

  it('loads the existing route into the form', () => {
    render(<AddRouteForm />);
    expect(screen.getByLabelText(/URL to Intercept/)).toHaveValue('/api/old');
    expect(
      JSON.parse((screen.getByLabelText('Enter your response content here') as HTMLTextAreaElement).value)
    ).toEqual({ error: 'nope' });
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('updates in place when the key is unchanged', async () => {
    render(<AddRouteForm />);
    fireEvent.change(screen.getByLabelText('Enter your response content here'), {
      target: { value: '{"error":"gone"}' },
    });
    submit();

    await waitFor(() => expect(state().isFormOpen).toBe(false));
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('ADD_ROUTE', expect.objectContaining({ route: 'GET:/api/old' }));
    expect((state().routes['GET:/api/old'] as RouteConfig).response).toEqual({ error: 'gone' });
    expect(lastNotification()?.message).toBe('Route updated successfully (mock)');
  });

  it('removes the old key then adds the new one when the URL changes', async () => {
    render(<AddRouteForm />);
    typeUrl('/api/new');
    typeName('Renamed');
    submit();

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[0]).toEqual(['REMOVE_ROUTE', { route: 'GET:/api/old' }]);
    expect(request.mock.calls[1][0]).toBe('ADD_ROUTE');
    expect(request.mock.calls[1][1]).toMatchObject({ route: 'GET:/api/new|Renamed', name: 'Renamed' });
    await waitFor(() => expect(state().routes['GET:/api/new|Renamed']).toBeDefined());
    expect(lastNotification()?.message).toBe('Route updated successfully (mock)');
  });

  // Regression: a key change used to leave the old key in the local store as a duplicate.
  it('drops the old key from the local store when the key changes', async () => {
    render(<AddRouteForm />);
    typeUrl('/api/new');
    submit();

    await waitFor(() => expect(state().routes['GET:/api/new']).toBeDefined());
    expect(Object.keys(state().routes)).toEqual(['GET:/api/new']);
  });
});
