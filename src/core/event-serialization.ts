/**
 * Serialize arbitrary event data into a JSON-safe shape with depth and width caps.
 * Pure function — no DOM dependencies beyond the `Event` global (jsdom-compatible).
 */
const MAX_DEPTH = 5;
const MAX_ITEMS = 50;

export function serializeEventData(data: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[MaxDepth]';
  if (data === null || data === undefined) return data;

  const t = typeof data;
  if (t === 'string' || t === 'number' || t === 'boolean') return data;
  if (t === 'function') return '[Function]';

  if (typeof Event !== 'undefined' && data instanceof Event) {
    const detail = (data as CustomEvent).detail;
    return {
      _type: 'Event',
      type: data.type,
      bubbles: data.bubbles,
      cancelable: data.cancelable,
      detail: detail !== undefined && detail !== null
        ? serializeEventData(detail, depth + 1)
        : null,
    };
  }

  if (Array.isArray(data)) {
    return data.slice(0, MAX_ITEMS).map(item => serializeEventData(item, depth + 1));
  }

  if (data instanceof Map) {
    const obj: Record<string, unknown> = {};
    let i = 0;
    for (const [k, v] of data) {
      if (i++ >= MAX_ITEMS) break;
      obj[String(k)] = serializeEventData(v, depth + 1);
    }
    return obj;
  }

  if (data instanceof Set) {
    return {
      _type: 'Set',
      values: [...data].slice(0, MAX_ITEMS).map(v => serializeEventData(v, depth + 1)),
    };
  }

  if (t === 'object') {
    const result: Record<string, unknown> = {};
    const keys = Object.keys(data as object).slice(0, MAX_ITEMS);
    for (const key of keys) {
      result[key] = serializeEventData((data as Record<string, unknown>)[key], depth + 1);
    }
    return result;
  }

  return String(data);
}
