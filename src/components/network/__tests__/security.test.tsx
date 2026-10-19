import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeadersList } from '../components';
import { highlightSearchTerm, generateCurlCommand, generateFetchSnippet } from '../utils';
import { makeRequest } from './fixtures';

const PAYLOAD = '<img src=x onerror="window.__pwned=1">';

describe('HeadersList rendering of untrusted headers', () => {
  it('renders HTML in header names and values as text', () => {
    const { container } = render(
      <HeadersList headers={[{ name: '<b>X-Evil</b>', value: PAYLOAD }]} />
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText(PAYLOAD)).toBeInTheDocument();
    expect(screen.getByText('<b>X-Evil</b>')).toBeInTheDocument();
  });

  it('still highlights matches without interpreting HTML', () => {
    const { container } = render(
      <HeadersList headers={[{ name: 'X-Evil', value: PAYLOAD }]} searchTerm="onerror" />
    );

    expect(container.querySelector('img')).toBeNull();
    const marks = container.querySelectorAll('mark.ds-search-highlight');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('onerror');
    expect(container.querySelector('.ds-header-value')?.textContent).toBe(PAYLOAD);
  });
});

describe('highlightSearchTerm', () => {
  it('returns React nodes with case-insensitive marks', () => {
    const { container } = render(<span>{highlightSearchTerm('Type type TYPE', 'type')}</span>);
    expect(Array.from(container.querySelectorAll('mark')).map(m => m.textContent)).toEqual([
      'Type',
      'type',
      'TYPE',
    ]);
    expect(container.textContent).toBe('Type type TYPE');
  });

  it('treats regex metacharacters in the term literally', () => {
    const { container } = render(<span>{highlightSearchTerm('a.b axb (c)', '.')}</span>);
    expect(Array.from(container.querySelectorAll('mark')).map(m => m.textContent)).toEqual(['.']);
    const parens = render(<span>{highlightSearchTerm('fn(c)', '(c)')}</span>);
    expect(parens.container.querySelector('mark')?.textContent).toBe('(c)');
  });

  it('returns the text unchanged without a search term', () => {
    expect(highlightSearchTerm('plain', '')).toBe('plain');
  });
});

/** Minimal POSIX tokenizer for the subset curl output uses: single quotes, \' and line continuations. */
function shellWords(command: string): string[] {
  const words: string[] = [];
  let current = '';
  let inWord = false;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (ch === "'") {
      const end = command.indexOf("'", i + 1);
      if (end === -1) throw new Error('unterminated quote');
      current += command.slice(i + 1, end);
      inWord = true;
      i = end;
    } else if (ch === '\\') {
      const next = command[i + 1];
      if (next === '\n') {
        i++;
      } else {
        current += next;
        inWord = true;
        i++;
      }
    } else if (ch === ' ' || ch === '\n') {
      if (inWord) words.push(current);
      current = '';
      inWord = false;
    } else {
      current += ch;
      inWord = true;
    }
  }
  if (inWord) words.push(current);
  return words;
}

const HOSTILE = `it's "quoted" \`whoami\` $(id) \${HOME}\nnext-line`;

describe('generateCurlCommand', () => {
  it('quotes URL, headers and body so they survive the shell intact', () => {
    const request = makeRequest({
      method: 'POST',
      url: `https://api.example.test/a?q=${HOSTILE}`,
      requestHeaders: [
        { name: 'X-Note', value: HOSTILE },
        { name: "X-'Name'", value: 'v' },
        { name: 'Host', value: 'skipped.example.test' },
      ],
      postData: HOSTILE,
    });

    expect(shellWords(generateCurlCommand(request))).toEqual([
      'curl',
      `https://api.example.test/a?q=${HOSTILE}`,
      '-X',
      'POST',
      '-H',
      `X-Note: ${HOSTILE}`,
      '-H',
      "X-'Name': v",
      '--data-raw',
      HOSTILE,
    ]);
  });

  it('quotes an unusual method', () => {
    const request = makeRequest({ method: "GET; rm -rf '/'" as never, requestHeaders: [] });
    expect(shellWords(generateCurlCommand(request))).toEqual([
      'curl',
      request.url,
      '-X',
      "GET; rm -rf '/'",
    ]);
  });

  it('keeps the familiar format for ordinary requests', () => {
    expect(
      generateCurlCommand(
        makeRequest({
          method: 'POST',
          url: 'https://api.example.test/items',
          requestHeaders: [{ name: 'Content-Type', value: 'application/json' }],
          postData: '{"a":1}',
        })
      )
    ).toBe(
      [
        "curl 'https://api.example.test/items'",
        '  -X POST',
        "  -H 'Content-Type: application/json'",
        `  --data-raw '{"a":1}'`,
      ].join(' \\\n')
    );
  });
});

describe('generateFetchSnippet', () => {
  it('produces JavaScript that passes hostile values through as data', () => {
    const request = makeRequest({
      method: 'POST',
      url: `https://api.example.test/'); globalThis.__pwned = 1; ('${HOSTILE}`,
      requestHeaders: [{ name: 'X-Note', value: HOSTILE }],
      postData: HOSTILE,
    });

    const fakeFetch = vi.fn();
    new Function('fetch', `return ${generateFetchSnippet(request)};`)(fakeFetch);

    expect((globalThis as { __pwned?: number }).__pwned).toBeUndefined();
    expect(fakeFetch).toHaveBeenCalledWith(request.url, {
      method: 'POST',
      headers: { 'X-Note': HOSTILE },
      body: HOSTILE,
    });
  });
});
