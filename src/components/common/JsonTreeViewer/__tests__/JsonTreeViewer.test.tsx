import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { JsonTreeViewer, JsonTreeViewerWrapper } from '@/components/common/JsonTreeViewer';

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

const rowText = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.jt-line')).map((l) => l.textContent);

describe('JsonTreeViewer', () => {
  it('renders keys, typed values, commas and closing brackets', () => {
    const { container } = render(
      <JsonTreeViewer data={{ name: 'Ada', age: 36, admin: true, tag: null }} />
    );
    expect(rowText(container)).toEqual([
      '{',
      '"name": "Ada",',
      '"age": 36,',
      '"admin": true,',
      '"tag": null',
      '}',
    ]);
    expect(container.querySelector('.jt-number')).toHaveTextContent('36');
    expect(container.querySelector('.jt-boolean')).toHaveTextContent('true');
    expect(container.querySelector('.jt-null')).toHaveTextContent('null');
  });

  it('shows size and item count in the toolbar', () => {
    render(<JsonTreeViewer data={[1, 2, 3]} />);
    expect(screen.getByText('7 B')).toBeInTheDocument();
    expect(screen.getByText('3 items')).toBeInTheDocument();
  });

  it('collapses containers beyond the initial depth and toggles them', () => {
    const { container } = render(
      <JsonTreeViewer data={{ a: { b: { c: 1 } } }} initialExpandDepth={2} />
    );
    // depth-2 object "b" is collapsed with a count summary
    expect(rowText(container)).toContain('"b": {}1 key');
    const toggles = container.querySelectorAll('.jt-toggle');
    fireEvent.click(toggles[toggles.length - 1]);
    expect(rowText(container)).toContain('"c": 1');
    // collapsing the root hides everything but the summary line
    fireEvent.click(container.querySelectorAll('.jt-toggle')[0]);
    expect(rowText(container)).toEqual(['{}1 key']);
  });

  it('auto-collapses large nested arrays', () => {
    const big = Array.from({ length: 60 }, (_, i) => i);
    const { container } = render(<JsonTreeViewer data={{ big }} initialExpandDepth={5} />);
    expect(rowText(container)).toContain('"big": []60 items');
  });

  it('parses embedded JSON strings and flags it', () => {
    const { container } = render(<JsonTreeViewer data={{ inner: '{"x":1}' }} />);
    expect(screen.getByText('Parsed')).toBeInTheDocument();
    expect(rowText(container)).toContain('"x": 1');
  });

  it('leaves embedded JSON alone when disabled', () => {
    const { container } = render(
      <JsonTreeViewer data={{ inner: '{"x":1}' }} parseEmbeddedJson={false} />
    );
    expect(screen.queryByText('Parsed')).toBeNull();
    expect(container.querySelector('.jt-string')).toHaveTextContent('"{"x":1}"');
  });

  it('renders special characters literally instead of as HTML entities', () => {
    const { container } = render(<JsonTreeViewer data={{ 'a<b': 'x & "y"' }} />);
    expect(container.querySelector('.jt-key')).toHaveTextContent('"a<b"');
    expect(container.querySelector('.jt-string')).toHaveTextContent('"x & "y""');
  });

  it('renders URLs with an external link', () => {
    const { container } = render(<JsonTreeViewer data={{ u: 'https://example.com/a' }} />);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', 'https://example.com/a');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('searches keys and values, expanding collapsed ancestors', () => {
    const { container } = render(
      <JsonTreeViewer data={{ a: { b: { needle: 1 } }, other: 'needle too' }} initialExpandDepth={1} />
    );
    expect(rowText(container)).not.toContain('"needle": 1');
    fireEvent.change(screen.getByPlaceholderText('Search... (Ctrl+F)'), {
      target: { value: 'NEEDLE' },
    });
    expect(rowText(container)).toContain('"needle": 1');
    expect(container.querySelectorAll('.jt-row--matched')).toHaveLength(2);
    expect(screen.getByText('1/2')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByPlaceholderText('Search... (Ctrl+F)'), { key: 'Enter' });
    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('reports zero matches and clears with Escape', () => {
    const { container } = render(<JsonTreeViewer data={{ a: 1 }} />);
    const input = screen.getByPlaceholderText('Search... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText('0')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(input).toHaveValue('');
    expect(container.querySelectorAll('.jt-row--matched')).toHaveLength(0);
  });

  it('copies a formatted path when a key is clicked', async () => {
    const onCopyPath = vi.fn();
    render(
      <JsonTreeViewer data={{ list: [{ 'odd key': 1 }] }} initialExpandDepth={3} onCopyPath={onCopyPath} />
    );
    const key = screen.getByTitle('Copy path: list[0]["odd key"]');
    fireEvent.mouseEnter(key);
    expect(screen.getByText('Path:')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(key);
    });
    expect(writeText).toHaveBeenCalledWith('list[0]["odd key"]');
    expect(onCopyPath).toHaveBeenCalledWith('list[0]["odd key"]');
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('copies a subtree value and the whole document', async () => {
    const data = { a: { b: [1, 2] } };
    render(<JsonTreeViewer data={data} />);
    const copyButtons = screen.getAllByTitle('Copy value');
    await act(async () => {
      fireEvent.click(copyButtons[1]); // "a"
    });
    expect(writeText).toHaveBeenLastCalledWith(JSON.stringify({ b: [1, 2] }, null, 2));
    await act(async () => {
      fireEvent.click(screen.getByTitle('Copy JSON'));
    });
    expect(writeText).toHaveBeenLastCalledWith(JSON.stringify(data, null, 2));
  });

  it('renders line numbers and hides the toolbar on request', () => {
    const { container } = render(
      <JsonTreeViewer data={{ a: 1 }} showLineNumbers showToolbar={false} />
    );
    expect(Array.from(container.querySelectorAll('.jt-line-number')).map((n) => n.textContent)).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(container.querySelector('.jt-toolbar')).toBeNull();
  });

  it('shows the legend only for long, non-compact trees', () => {
    const data = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`k${i}`, i]));
    const { rerender } = render(<JsonTreeViewer data={data} />);
    expect(screen.getByText('Object')).toBeInTheDocument();
    rerender(<JsonTreeViewer data={data} compact />);
    expect(screen.queryByText('Object')).toBeNull();
  });
});

describe('JsonTreeViewerWrapper', () => {
  it('parses string content', () => {
    const { container } = render(<JsonTreeViewerWrapper content='{"a":1}' />);
    expect(container.querySelector('.jt-number')).toHaveTextContent('1');
  });

  it('shows the default or custom fallback for invalid JSON', () => {
    const { rerender } = render(<JsonTreeViewerWrapper content="{nope" />);
    expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
    rerender(<JsonTreeViewerWrapper content="{nope" fallback={<p>raw</p>} />);
    expect(screen.getByText('raw')).toBeInTheDocument();
  });
});
