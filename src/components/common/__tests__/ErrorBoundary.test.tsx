import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

let shouldThrow = true;
const Bomb = () => {
  if (shouldThrow) throw new Error('Kaboom');
  return <p>Recovered content</p>;
};

let consoleError: ReturnType<typeof vi.spyOn>;
const writeText = vi.fn<(text: string) => Promise<void>>();
const reload = vi.fn();
// React rethrows render errors through jsdom's window "error" event; swallow it to keep output clean.
const swallow = (e: ErrorEvent) => e.preventDefault();

beforeEach(() => {
  shouldThrow = true;
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  window.addEventListener('error', swallow);
  writeText.mockReset().mockResolvedValue(undefined);
  reload.mockReset();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  Object.assign(chrome.runtime, { reload, getManifest: () => ({ version: '9.9.9' }) });
});

afterEach(() => {
  consoleError.mockRestore();
  window.removeEventListener('error', swallow);
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary scope="Side Panel">
        <p>Healthy child</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('Healthy child')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the full-page fallback by default with error details', () => {
    render(
      <ErrorBoundary scope="Side Panel">
        <Bomb />
      </ErrorBoundary>
    );
    const alert = screen.getByRole('alert');
    expect(screen.getByRole('heading', { name: 'Side Panel crashed' })).toBeInTheDocument();
    expect(alert).toHaveTextContent('Error: Kaboom');
    expect(screen.getByText('Error details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload extension' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy details' })).toBeNull();
  });

  it('shows a compact inline fallback that leaves siblings rendered', () => {
    render(
      <>
        <nav>Tabs</nav>
        <ErrorBoundary scope="Network tab" variant="inline">
          <Bomb />
        </ErrorBoundary>
      </>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Network tab hit an error');
    expect(alert).toHaveTextContent('Kaboom');
    expect(alert).toHaveTextContent('The rest of the extension keeps working.');
    expect(screen.getByText('Tabs')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /crashed/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reload extension' })).toBeNull();
  });

  it('reports the error with its scope', () => {
    render(
      <ErrorBoundary scope="Popup">
        <Bomb />
      </ErrorBoundary>
    );
    expect(consoleError).toHaveBeenCalledWith(
      '[Popup] React error:',
      expect.objectContaining({ message: 'Kaboom' }),
      expect.stringContaining('Bomb')
    );
  });

  it.each(['page', 'inline'] as const)('"Try again" re-renders children (%s)', (variant) => {
    render(
      <ErrorBoundary scope="Events" variant={variant}>
        <Bomb />
      </ErrorBoundary>
    );
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Recovered content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('falls back again when the child still throws after retry', () => {
    render(
      <ErrorBoundary scope="Events" variant="inline">
        <Bomb />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Events hit an error');
  });

  it('copies scope, version, message and stacks from the inline fallback', async () => {
    render(
      <ErrorBoundary scope="Storage tab" variant="inline">
        <Bomb />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy details' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0];
    expect(text).toContain('Request Interceptor 9.9.9 — Storage tab');
    expect(text).toContain('Error: Kaboom');
    expect(text).toContain('Bomb');
  });

  it('reloads the extension from the page fallback', () => {
    render(
      <ErrorBoundary scope="Side Panel">
        <Bomb />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reload extension' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
