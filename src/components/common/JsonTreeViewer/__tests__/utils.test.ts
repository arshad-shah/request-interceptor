import { describe, it, expect } from 'vitest';
import {
  buildTree,
  computeInitialCollapsed,
  countItems,
  deepParseEmbeddedJson,
  flattenVisible,
  formatCount,
  formatPath,
  formatSize,
  getSubtree,
  isLastChild,
  searchTree,
} from '../utils';

describe('JsonTreeViewer utils', () => {
  it('formats paths with dot, index and bracket notation', () => {
    expect(formatPath([])).toBe('$');
    expect(formatPath(['a', 0, 'b_c'])).toBe('a[0].b_c');
    expect(formatPath(['a', 'with space', '1x'])).toBe('a["with space"]["1x"]');
  });

  it('formats sizes and counts', () => {
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(2048)).toBe('2.0 KB');
    expect(formatSize(3 * 1048576)).toBe('3.0 MB');
    expect(countItems([1, 2])).toBe('2 items');
    expect(countItems({ a: 1 })).toBe('1 keys');
    expect(countItems('x')).toBe('1 value');
    expect(formatCount('object', 1)).toBe('1 key');
    expect(formatCount('array', 2)).toBe('2 items');
  });

  it('parses embedded JSON objects recursively but leaves primitives alone', () => {
    expect(deepParseEmbeddedJson({ a: '{"b":"[1]"}', n: '42', s: 'text' })).toEqual({
      a: { b: [1] },
      n: '42',
      s: 'text',
    });
    expect(deepParseEmbeddedJson('{"a":1}', 0)).toBe('{"a":1}');
  });

  it('builds a node map, collapses by depth and flattens visible nodes', () => {
    const { nodeMap, rootId } = buildTree({ a: { b: 1 }, c: [true] });
    expect(nodeMap.size).toBe(5);
    expect(nodeMap.get(rootId)?.length).toBe(2);

    const collapsed = computeInitialCollapsed(nodeMap, 1);
    const visible = flattenVisible(nodeMap, rootId, collapsed);
    expect(visible.map((n) => n.key)).toEqual([null, 'a', 'c']);
    expect(flattenVisible(nodeMap, rootId, new Set()).map((n) => n.key)).toEqual([
      null, 'a', 'b', 'c', 0,
    ]);
  });

  it('reconstructs subtrees and detects last children', () => {
    const data = { a: { b: [1, { c: null }] }, d: 'x' };
    const { nodeMap, rootId } = buildTree(data);
    expect(getSubtree(nodeMap, nodeMap.get(rootId)!)).toEqual(data);
    const nodes = [...nodeMap.values()];
    expect(isLastChild(nodeMap, nodes.find((n) => n.key === 'a')!)).toBe(false);
    expect(isLastChild(nodeMap, nodes.find((n) => n.key === 'd')!)).toBe(true);
    expect(isLastChild(nodeMap, nodeMap.get(rootId)!)).toBe(true);
  });

  it('searches keys and values and expands every ancestor of a match', () => {
    const { nodeMap, rootId } = buildTree({ outer: { inner: { target: 'Hit' } }, other: 1 });
    const allCollapsed = computeInitialCollapsed(nodeMap, 0);
    const { matches, collapsed } = searchTree(nodeMap, 'hit', allCollapsed);
    expect(matches.map((id) => nodeMap.get(id)?.key)).toEqual(['target']);
    expect(flattenVisible(nodeMap, rootId, collapsed).map((n) => n.key)).toEqual([
      null, 'outer', 'inner', 'target', 'other',
    ]);
    // the input set is not mutated
    expect(allCollapsed.has(rootId)).toBe(true);
  });
});
