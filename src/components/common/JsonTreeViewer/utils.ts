/**
 * Pure helpers for JsonTreeViewer: tree construction, visibility, search,
 * path formatting and value reconstruction. No React or browser APIs.
 */

import type { NodeMap, PathSegment, TreeNode } from './types';

// ============================================================================
// Constants
// ============================================================================

export const ROW_HEIGHT = 24;
export const INDENT_WIDTH = 16;
export const COLLAPSE_THRESHOLD = 50; // Auto-collapse arrays/objects with more than this many items

// ============================================================================
// Formatting
// ============================================================================

export function getType(value: unknown): TreeNode['type'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as TreeNode['type'];
}

export function formatPath(path: PathSegment[]): string {
  let result = '';
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (typeof key === 'number') {
      result += `[${key}]`;
    } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      result += (i === 0 ? '' : '.') + key;
    } else {
      result += `["${key}"]`;
    }
  }
  return result || '$';
}

export function isUrl(str: string): boolean {
  return typeof str === 'string' && /^https?:\/\/\S+$/.test(str);
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function countItems(data: unknown): string {
  if (Array.isArray(data)) return `${data.length} items`;
  if (typeof data === 'object' && data !== null) return `${Object.keys(data).length} keys`;
  return '1 value';
}

/** "1 key" / "3 items" summary shown next to a collapsed container */
export function formatCount(type: TreeNode['type'], length: number): string {
  const noun = length === 1
    ? (type === 'object' ? 'key' : 'item')
    : (type === 'object' ? 'keys' : 'items');
  return `${length} ${noun}`;
}

// ============================================================================
// Embedded JSON
// ============================================================================

/**
 * Detect if a string contains valid JSON (object or array)
 * Returns the parsed value if valid, null otherwise
 */
export function tryParseEmbeddedJson(str: string): unknown | null {
  if (typeof str !== 'string') return null;

  const trimmed = str.trim();
  // Must start with { or [ to be an object/array
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  try {
    const parsed = JSON.parse(trimmed);
    // Only return if it's an object or array (not primitive)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Recursively parse all embedded JSON strings in a data structure
 * Returns a new data structure with embedded JSON parsed
 */
export function deepParseEmbeddedJson(data: unknown, maxDepth: number = 5): unknown {
  if (maxDepth <= 0) return data;

  if (typeof data === 'string') {
    const parsed = tryParseEmbeddedJson(data);
    if (parsed !== null) {
      // Recursively parse the parsed data
      return deepParseEmbeddedJson(parsed, maxDepth - 1);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => deepParseEmbeddedJson(item, maxDepth));
  }

  if (typeof data === 'object' && data !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = deepParseEmbeddedJson(value, maxDepth);
    }
    return result;
  }

  return data;
}

// ============================================================================
// Tree
// ============================================================================

/** Flatten a JSON value into an id-indexed node map. The root always has id 0. */
export function buildTree(data: unknown): { nodeMap: NodeMap; rootId: number } {
  const nodeMap: NodeMap = new Map();
  let idCounter = 0;

  function visit(
    value: unknown,
    path: PathSegment[],
    key: PathSegment | null,
    depth: number,
    parentId: number | null
  ): number {
    const id = idCounter++;
    const type = getType(value);
    const isContainer = type === 'object' || type === 'array';

    const node: TreeNode = {
      id,
      key,
      path: path.slice(),
      depth,
      type,
      parentId,
      childIds: [],
      isContainer,
      length: 0,
      value: isContainer ? null : value,
    };

    nodeMap.set(id, node);

    if (type === 'object') {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);
      node.length = keys.length;
      for (const k of keys) {
        node.childIds.push(visit(obj[k], [...path, k], k, depth + 1, id));
      }
    } else if (type === 'array') {
      const arr = value as unknown[];
      node.length = arr.length;
      for (let i = 0; i < arr.length; i++) {
        node.childIds.push(visit(arr[i], [...path, i], i, depth + 1, id));
      }
    }

    return id;
  }

  const rootId = visit(data, [], null, 0, null);
  return { nodeMap, rootId };
}

/** Containers at or beyond the expand depth, plus large nested containers, start collapsed. */
export function computeInitialCollapsed(nodeMap: NodeMap, initialExpandDepth: number): Set<number> {
  const collapsed = new Set<number>();
  nodeMap.forEach((node) => {
    if (node.isContainer && node.depth >= initialExpandDepth && node.length > 0) {
      collapsed.add(node.id);
    }
    if (node.isContainer && node.length > COLLAPSE_THRESHOLD && node.depth > 0) {
      collapsed.add(node.id);
    }
  });
  return collapsed;
}

/** Depth-first list of nodes not hidden inside a collapsed container. */
export function flattenVisible(nodeMap: NodeMap, rootId: number, collapsed: Set<number>): TreeNode[] {
  const result: TreeNode[] = [];

  function traverse(id: number) {
    const node = nodeMap.get(id);
    if (!node) return;
    result.push(node);
    if (node.isContainer && !collapsed.has(id)) {
      for (const childId of node.childIds) {
        traverse(childId);
      }
    }
  }

  traverse(rootId);
  return result;
}

export function isLastChild(nodeMap: NodeMap, node: TreeNode): boolean {
  const parent = node.parentId !== null ? nodeMap.get(node.parentId) : null;
  return parent ? parent.childIds[parent.childIds.length - 1] === node.id : true;
}

/** Reconstruct the JSON value a node represents from its descendants. */
export function getSubtree(nodeMap: NodeMap, node: TreeNode): unknown {
  if (!node.isContainer) return node.value;

  if (node.type === 'object') {
    const result: Record<string, unknown> = {};
    for (const childId of node.childIds) {
      const child = nodeMap.get(childId);
      if (child && child.key !== null) {
        result[String(child.key)] = getSubtree(nodeMap, child);
      }
    }
    return result;
  }

  const result: unknown[] = [];
  for (const childId of node.childIds) {
    const child = nodeMap.get(childId);
    if (child) {
      result.push(getSubtree(nodeMap, child));
    }
  }
  return result;
}

// ============================================================================
// Search
// ============================================================================

export interface SearchResult {
  /** Matching node ids in document order */
  matches: number[];
  /** The collapsed set with every ancestor of a match expanded */
  collapsed: Set<number>;
}

/** Case-insensitive match on keys and primitive values. */
export function searchTree(nodeMap: NodeMap, query: string, collapsed: Set<number>): SearchResult {
  const q = query.toLowerCase();
  const matches: number[] = [];
  const nextCollapsed = new Set(collapsed);

  nodeMap.forEach((node, id) => {
    let text = '';
    if (node.key !== null) text += String(node.key).toLowerCase();
    if (node.value !== null) text += String(node.value).toLowerCase();

    if (text.includes(q)) {
      matches.push(id);

      // Expand path to this node
      let current: TreeNode | undefined = node;
      while (current && current.parentId !== null) {
        nextCollapsed.delete(current.parentId);
        current = nodeMap.get(current.parentId);
      }
    }
  });

  return { matches, collapsed: nextCollapsed };
}
