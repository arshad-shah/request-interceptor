import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CodeEditor, CodeView, normalizeLanguage } from '..';

describe('normalizeLanguage', () => {
  it('maps mime types and aliases', () => {
    expect(normalizeLanguage('application/json')).toBe('json');
    expect(normalizeLanguage('application/vnd.api+json')).toBe('json');
    expect(normalizeLanguage('text/javascript')).toBe('javascript');
    expect(normalizeLanguage('js')).toBe('javascript');
    expect(normalizeLanguage('text/html')).toBe('html');
    expect(normalizeLanguage('image/svg+xml')).toBe('xml');
    expect(normalizeLanguage('text/css')).toBe('css');
    expect(normalizeLanguage(undefined)).toBe('text');
  });
});

describe('CodeEditor', () => {
  it('renders the document and follows external value changes', () => {
    const { rerender, container } = render(<CodeEditor value='{"a":1}' onChange={() => {}} />);
    expect(container.querySelector('.cm-content')?.textContent).toContain('{"a":1}');
    rerender(<CodeEditor value='{"b":2}' onChange={() => {}} />);
    expect(container.querySelector('.cm-content')?.textContent).toContain('{"b":2}');
  });

  it('formats valid JSON', () => {
    const onChange = vi.fn();
    render(<CodeEditor value='{"a":1}' onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    expect(onChange).toHaveBeenCalledWith(JSON.stringify({ a: 1 }, null, 2));
  });

  it('reports invalid JSON', async () => {
    vi.useFakeTimers();
    render(<CodeEditor value='{"a":' onChange={() => {}} />);
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('JSON Error');
    vi.useRealTimers();
  });

  it('hides editing actions when read-only', () => {
    render(<CodeEditor value="x" language="text" readOnly />);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Format' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('clears content', () => {
    const onChange = vi.fn();
    render(<CodeEditor value="abc" language="text" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('CodeView', () => {
  it('renders read-only content', () => {
    const { container } = render(<CodeView content="<b>hi</b>" language="text/html" />);
    const content = container.querySelector('.cm-content');
    expect(content?.textContent).toContain('<b>hi</b>');
    expect(content?.getAttribute('contenteditable')).toBe('false');
  });
});
