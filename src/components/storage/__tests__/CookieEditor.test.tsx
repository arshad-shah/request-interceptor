import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CookieEditor from '../CookieEditor';

vi.mock('@/components/common/code-editor', () => ({
  CodeEditor: ({ value, onChange, placeholder }: { value: string; onChange?: (v: string) => void; placeholder?: string }) => (
    <textarea aria-label={placeholder} value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

const NOW_MS = 1_750_000_000_000;
const NOW_S = NOW_MS / 1000;
const DAY = 86400;

type Props = React.ComponentProps<typeof CookieEditor>;
type SavedCookie = Record<string, unknown>;

const existing = {
  name: 'sid', value: 'abc', domain: '.example.test', path: '/', secure: true,
  httpOnly: true, sameSite: 'strict', expirationDate: NOW_S + 10 * DAY,
};

beforeAll(() => {
  // Radix Select relies on pointer-capture / scrolling APIs jsdom lacks.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW_MS);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const setup = (props: Partial<Props> = {}) => {
  const onSave = vi.fn<(cookie: SavedCookie) => void>();
  const onCancel = vi.fn();
  render(<CookieEditor url="https://app.example.test/page" isNew onSave={onSave} onCancel={onCancel} {...props} />);
  const saved = () => onSave.mock.calls.at(-1)?.[0];
  return { onSave, onCancel, saved };
};
const days = () => screen.getByRole('spinbutton', { name: 'Expires in days (0 for a session cookie)' });
const setDays = (n: number) => {
  fireEvent.change(days(), { target: { value: String(n) } });
  fireEvent.keyDown(days(), { key: 'Enter' });
};
const typeName = (name: string) => fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });

describe('CookieEditor', () => {
  it('starts a new cookie with sensible defaults', () => {
    setup();
    expect(screen.getByText('Add Cookie')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Name')).toBeEnabled();
    expect(screen.getByLabelText('Domain')).toHaveValue('app.example.test');
    expect(screen.getByLabelText('Path')).toHaveValue('/');
    expect(screen.getByRole('combobox', { name: 'SameSite' })).toHaveTextContent('Lax');
    expect(days()).toHaveValue('30');
    expect(screen.getByRole('switch', { name: /^Secure/ })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /^HttpOnly/ })).not.toBeChecked();
  });

  it('requires a non-blank name before saving', () => {
    const { onSave } = setup();
    const add = screen.getByRole('button', { name: 'Add' });
    expect(add).toBeDisabled();
    typeName('   ');
    expect(add).toBeDisabled();
    fireEvent.click(add);
    expect(onSave).not.toHaveBeenCalled();
    typeName('ok');
    expect(add).toBeEnabled();
  });

  it('saves a new cookie with every field and a 30-day expiry by default', () => {
    const { saved } = setup();
    typeName('  theme  ');
    fireEvent.change(screen.getByLabelText('Cookie value...'), { target: { value: 'dark' } });
    fireEvent.change(screen.getByLabelText('Path'), { target: { value: '/app' } });
    fireEvent.click(screen.getByRole('switch', { name: /^HttpOnly/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(saved()).toEqual({
      url: 'http://app.example.test/app',
      name: 'theme',
      value: 'dark',
      domain: 'app.example.test',
      path: '/app',
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      expirationDate: Math.floor(NOW_S) + 30 * DAY,
    });
  });

  it('uses https for secure cookies and strips the leading dot of a domain cookie', () => {
    const { saved } = setup();
    typeName('a');
    fireEvent.change(screen.getByLabelText('Domain'), { target: { value: '.example.test' } });
    fireEvent.change(screen.getByLabelText('Path'), { target: { value: 'nested' } });
    fireEvent.click(screen.getByRole('switch', { name: /^Secure/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(saved()).toMatchObject({
      url: 'https://example.test/nested',
      domain: '.example.test',
      secure: true,
    });
  });

  it('creates a session cookie (no expirationDate) when expiry is 0', () => {
    const { saved } = setup();
    typeName('tmp');
    setDays(0);
    expect(screen.getByText('session')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(saved()).not.toHaveProperty('expirationDate');
  });

  it('keeps an edited session cookie a session cookie', () => {
    const { expirationDate: _drop, ...sessionCookie } = existing;
    const { saved } = setup({ isNew: false, initialCookie: sessionCookie });
    expect(days()).toHaveValue('0');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saved()).not.toHaveProperty('expirationDate');
    expect(saved()).toMatchObject({ name: 'sid', sameSite: 'strict', secure: true, httpOnly: true });
  });

  it('pre-fills an existing cookie and preserves its remaining lifetime', () => {
    const { saved } = setup({ isNew: false, initialCookie: existing });
    expect(screen.getByText('Edit Cookie')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.getByLabelText('Domain')).toHaveValue('.example.test');
    expect(screen.getByRole('combobox', { name: 'SameSite' })).toHaveTextContent('Strict');
    expect(screen.getByRole('switch', { name: /^Secure/ })).toBeChecked();
    expect(days()).toHaveValue('10');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saved()).toMatchObject({ url: 'https://example.test/', expirationDate: Math.floor(NOW_S) + 10 * DAY });
  });

  it('rounds a nearly-expired cookie up to at least one day', () => {
    setup({ isNew: false, initialCookie: { ...existing, expirationDate: NOW_S + 60 } });
    expect(days()).toHaveValue('1');
  });

  it('turns a persistent cookie into a session cookie when expiry is set to 0', () => {
    const { saved } = setup({ isNew: false, initialCookie: existing });
    setDays(0);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saved()).not.toHaveProperty('expirationDate');
  });

  it('changes SameSite via the select', () => {
    const { saved } = setup();
    typeName('x');
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'SameSite' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('option', { name: 'None' }));
    expect(screen.getByRole('combobox', { name: 'SameSite' })).toHaveTextContent('None');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(saved()).toMatchObject({ sameSite: 'no_restriction' });
  });

  it('cancels from the button and the backdrop without saving', () => {
    const { onSave, onCancel } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByText('Add Cookie').closest('.ds-modal-backdrop') as HTMLElement);
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not close when clicking inside the dialog', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByLabelText('Path'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
