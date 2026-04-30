import { describe, it, expect } from 'vitest';
import { serializeEventData } from '../event-serialization';

describe('serializeEventData', () => {
  it('returns primitives unchanged', () => {
    expect(serializeEventData(42)).toBe(42);
    expect(serializeEventData('hi')).toBe('hi');
    expect(serializeEventData(true)).toBe(true);
    expect(serializeEventData(null)).toBe(null);
    expect(serializeEventData(undefined)).toBe(undefined);
  });

  it('serializes a CustomEvent with detail', () => {
    const evt = new CustomEvent('demo', { detail: { msg: 'hello' }, bubbles: true });
    const out = serializeEventData(evt) as Record<string, unknown>;
    expect(out._type).toBe('Event');
    expect(out.type).toBe('demo');
    expect(out.bubbles).toBe(true);
    expect(out.detail).toEqual({ msg: 'hello' });
  });

  it('serializes a plain Event without detail', () => {
    const evt = new Event('plain');
    const out = serializeEventData(evt) as Record<string, unknown>;
    expect(out._type).toBe('Event');
    expect(out.type).toBe('plain');
    expect(out.detail).toBe(null);
  });

  it('caps arrays at 50 items', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i);
    const out = serializeEventData(arr) as number[];
    expect(out).toHaveLength(50);
    expect(out[0]).toBe(0);
    expect(out[49]).toBe(49);
  });

  it('serializes Map as { _type, entries }', () => {
    const m = new Map<string, number>([['a', 1], ['b', 2]]);
    const out = serializeEventData(m) as Record<string, unknown>;
    expect(out).toEqual({ a: 1, b: 2 });
  });

  it('serializes Set as { _type: "Set", values: [...] }', () => {
    const s = new Set([1, 2, 3]);
    const out = serializeEventData(s) as Record<string, unknown>;
    expect(out._type).toBe('Set');
    expect(out.values).toEqual([1, 2, 3]);
  });

  it('caps object keys at 50', () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 100; i++) obj[`k${i}`] = i;
    const out = serializeEventData(obj) as Record<string, number>;
    expect(Object.keys(out)).toHaveLength(50);
  });

  it('truncates at max depth without throwing on cycles', () => {
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b', a };
    a.b = b;
    expect(() => serializeEventData(a)).not.toThrow();
  });

  it('serializes functions as a string marker', () => {
    const out = serializeEventData(() => 1) as string;
    expect(out).toBe('[Function]');
  });
});
