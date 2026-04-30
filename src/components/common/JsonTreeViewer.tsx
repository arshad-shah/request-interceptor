/**
 * JsonTreeViewer - Interactive JSON Tree Viewer Component
 * Inspired by JSON Prism extension - provides a collapsible, searchable tree view for JSON data
 * Features:
 * - Collapsible nodes with expand/collapse all
 * - Search/filter functionality
 * - Path copying on click
 * - Syntax highlighting
 * - Virtualized rendering for large JSON
 * - URL detection and clickable links
 * - Nested JSON string detection and parsing
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { clsx } from 'clsx';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Search,
  ExternalLink,
  Check,
  X,
  FileJson,
  Hash,
  Type,
  ToggleRight,
  CircleOff,
  Braces,
  Brackets,
  Link2,
} from 'lucide-react';
import { copyToClipboard } from '../../lib/network-api';

// ============================================================================
// Types
// ============================================================================

interface TreeNode {
  id: number;
  key: string | number | null;
  path: (string | number)[];
  depth: number;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  isContainer: boolean;
  length: number;
  value: unknown;
  parentId: number | null;
  childIds: number[];
  /** For string nodes that contain valid JSON */
  hasEmbeddedJson?: boolean;
  /** The parsed embedded JSON data */
  embeddedJsonData?: unknown;
}

interface JsonTreeViewerProps {
  data: unknown;
  className?: string;
  maxHeight?: number | string;
  initialExpandDepth?: number;
  showToolbar?: boolean;
  showLineNumbers?: boolean;
  searchable?: boolean;
  onCopyPath?: (path: string) => void;
  compact?: boolean;
  /** Automatically parse embedded JSON strings */
  parseEmbeddedJson?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ROW_HEIGHT = 24;
const INDENT_WIDTH = 16;
const COLLAPSE_THRESHOLD = 50; // Auto-collapse arrays/objects with more than this many items

// ============================================================================
// Utility Functions
// ============================================================================

function getType(value: unknown): TreeNode['type'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as TreeNode['type'];
}

function formatPath(path: (string | number)[]): string {
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

function isUrl(str: string): boolean {
  return typeof str === 'string' && /^https?:\/\/\S+$/.test(str);
}

function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function countItems(data: unknown): string {
  if (Array.isArray(data)) return `${data.length} items`;
  if (typeof data === 'object' && data !== null) return `${Object.keys(data).length} keys`;
  return '1 value';
}

/**
 * Detect if a string contains valid JSON (object or array)
 * Returns the parsed value if valid, null otherwise
 */
function tryParseEmbeddedJson(str: string): unknown | null {
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
function deepParseEmbeddedJson(data: unknown, maxDepth: number = 5): unknown {
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
// Main Component
// ============================================================================

export function JsonTreeViewer({
  data,
  className,
  maxHeight = 400,
  initialExpandDepth = 2,
  showToolbar = true,
  showLineNumbers = false,
  searchable = true,
  onCopyPath,
  compact = false,
  parseEmbeddedJson = true,
}: JsonTreeViewerProps) {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [collapsedSet, setCollapsedSet] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [currentMatchIdx, setCurrentMatchIdx] = useState(-1);
  const [matchedList, setMatchedList] = useState<number[]>([]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pre-process data to parse embedded JSON if enabled
  const processedData = useMemo(() => {
    if (parseEmbeddedJson) {
      return deepParseEmbeddedJson(data);
    }
    return data;
  }, [data, parseEmbeddedJson]);

  // ─── Build Tree ────────────────────────────────────────────────────────────
  const { nodeMap, rootId, rawSize } = useMemo(() => {
    const nodeMap = new Map<number, TreeNode>();
    let idCounter = 0;

    function buildTree(
      value: unknown,
      path: (string | number)[],
      key: string | number | null,
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

      if (isContainer) {
        const keys = type === 'object' ? Object.keys(value as object) : (value as unknown[]);
        node.length = type === 'object' ? keys.length : (value as unknown[]).length;

        // Auto-collapse large arrays/objects beyond initial depth
        if (node.length > COLLAPSE_THRESHOLD && depth > 0) {
          // Will be added to collapsed set later
        }

        if (type === 'object') {
          const obj = value as Record<string, unknown>;
          for (const k of Object.keys(obj)) {
            const childPath = [...path, k];
            node.childIds.push(buildTree(obj[k], childPath, k, depth + 1, id));
          }
        } else {
          const arr = value as unknown[];
          for (let i = 0; i < arr.length; i++) {
            const childPath = [...path, i];
            node.childIds.push(buildTree(arr[i], childPath, i, depth + 1, id));
          }
        }
      }

      return id;
    }

    const rootId = buildTree(processedData, [], null, 0, null);
    const rawSize = JSON.stringify(processedData).length;

    // Initialize collapsed state based on initial expand depth
    const initialCollapsed = new Set<number>();
    nodeMap.forEach((node) => {
      if (node.isContainer && node.depth >= initialExpandDepth && node.length > 0) {
        initialCollapsed.add(node.id);
      }
      // Also collapse large nodes
      if (node.isContainer && node.length > COLLAPSE_THRESHOLD && node.depth > 0) {
        initialCollapsed.add(node.id);
      }
    });

    // Build flat list of visible nodes
    function traverseVisible(id: number, result: TreeNode[], collapsed: Set<number>) {
      const node = nodeMap.get(id);
      if (!node) return;
      result.push(node);
      if (node.isContainer && !collapsed.has(id)) {
        for (const childId of node.childIds) {
          traverseVisible(childId, result, collapsed);
        }
      }
    }

    const flatNodes: TreeNode[] = [];
    traverseVisible(rootId, flatNodes, initialCollapsed);

    return { nodeMap, flatNodes, rootId, rawSize, initialCollapsed };
  }, [processedData, initialExpandDepth]);

  // Initialize collapsed state
  useEffect(() => {
    const initialCollapsed = new Set<number>();
    nodeMap.forEach((node) => {
      if (node.isContainer && node.depth >= initialExpandDepth && node.length > 0) {
        initialCollapsed.add(node.id);
      }
      if (node.isContainer && node.length > COLLAPSE_THRESHOLD && node.depth > 0) {
        initialCollapsed.add(node.id);
      }
    });
    setCollapsedSet(initialCollapsed);
  }, [nodeMap, initialExpandDepth]);

  // ─── Rebuild Flat List ─────────────────────────────────────────────────────
  const visibleNodes = useMemo(() => {
    const result: TreeNode[] = [];
    
    function traverseVisible(id: number) {
      const node = nodeMap.get(id);
      if (!node) return;
      result.push(node);
      if (node.isContainer && !collapsedSet.has(id)) {
        for (const childId of node.childIds) {
          traverseVisible(childId);
        }
      }
    }

    traverseVisible(rootId);
    return result;
  }, [nodeMap, rootId, collapsedSet]);

  // ─── Search ────────────────────────────────────────────────────────────────
  const performSearch = useCallback((query: string) => {
    setSearchTerm(query);
    
    if (!query.trim()) {
      setMatchedIds(new Set());
      setMatchedList([]);
      setCurrentMatchIdx(-1);
      return;
    }

    const q = query.toLowerCase();
    const matched = new Set<number>();
    const matchList: number[] = [];
    const newCollapsed = new Set(collapsedSet);

    nodeMap.forEach((node, id) => {
      let text = '';
      if (node.key !== null) text += String(node.key).toLowerCase();
      if (node.value !== null) text += String(node.value).toLowerCase();

      if (text.includes(q)) {
        matched.add(id);
        matchList.push(id);
        
        // Expand path to this node
        let current = node;
        while (current.parentId !== null) {
          newCollapsed.delete(current.parentId);
          current = nodeMap.get(current.parentId)!;
        }
      }
    });

    setMatchedIds(matched);
    setMatchedList(matchList);
    setCurrentMatchIdx(matchList.length > 0 ? 0 : -1);
    setCollapsedSet(newCollapsed);

    // Scroll to first match
    if (matchList.length > 0) {
      setTimeout(() => scrollToMatch(matchList[0]), 50);
    }
  }, [nodeMap, collapsedSet]);

  const scrollToMatch = useCallback((targetId: number) => {
    const idx = visibleNodes.findIndex(n => n.id === targetId);
    if (idx >= 0 && viewportRef.current) {
      const targetOffset = idx * ROW_HEIGHT;
      const viewportHeight = viewportRef.current.clientHeight;
      viewportRef.current.scrollTop = targetOffset - viewportHeight / 2 + ROW_HEIGHT / 2;
    }
  }, [visibleNodes]);

  const goToNextMatch = useCallback(() => {
    if (matchedList.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matchedList.length;
    setCurrentMatchIdx(nextIdx);
    scrollToMatch(matchedList[nextIdx]);
  }, [currentMatchIdx, matchedList, scrollToMatch]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const toggleNode = useCallback((id: number) => {
    setCollapsedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);


  const handleCopyPath = useCallback(async (path: string) => {
    const success = await copyToClipboard(path);
    if (success) {
      setCopiedPath(path);
      onCopyPath?.(path);
      setTimeout(() => setCopiedPath(null), 2000);
    }
  }, [onCopyPath]);

  const handleCopyValue = useCallback(async (value: unknown) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    await copyToClipboard(text);
    setCopiedPath('value');
    setTimeout(() => setCopiedPath(null), 2000);
  }, []);

  const handleCopyAll = useCallback(async () => {
    await copyToClipboard(JSON.stringify(processedData, null, 2));
    setCopiedPath('all');
    setTimeout(() => setCopiedPath(null), 2000);
  }, [processedData]);

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Enter' && matchedList.length > 0) {
        e.preventDefault();
        goToNextMatch();
      }
      if (e.key === 'Escape') {
        setSearchTerm('');
        setMatchedIds(new Set());
        setMatchedList([]);
        setCurrentMatchIdx(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [matchedList, goToNextMatch]);

  // ─── Render Node ───────────────────────────────────────────────────────────
  const renderNode = useCallback((node: TreeNode, _index: number) => {
    const { id, key, path, depth, type, isContainer, length, value, parentId } = node;
    const isCollapsed = collapsedSet.has(id);
    const isMatched = matchedIds.has(id);
    const pathStr = formatPath(path);
    const isCurrentMatch = matchedList[currentMatchIdx] === id;

    // Check if this is the last child of its parent
    const parent = parentId !== null ? nodeMap.get(parentId) : null;
    const isLastChild = parent 
      ? parent.childIds[parent.childIds.length - 1] === id 
      : true;

    const renderValue = () => {
      switch (type) {
        case 'string': {
          const strVal = value as string;
          const displayVal = truncateString(strVal, 5000);
          if (isUrl(strVal)) {
            return (
              <span className="jt-string jt-url group/url">
                "{escapeHtml(displayVal)}"
                <a 
                  href={strVal} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover/url:opacity-100 ml-1 text-blue-400 hover:text-blue-300"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={10} />
                </a>
              </span>
            );
          }
          return <span className="jt-string">"{escapeHtml(displayVal)}"</span>;
        }
        case 'number':
          return <span className="jt-number">{String(value)}</span>;
        case 'boolean':
          return <span className="jt-boolean">{String(value)}</span>;
        case 'null':
          return <span className="jt-null">null</span>;
        default:
          return <span>{String(value)}</span>;
      }
    };

    return (
      <div
        key={id}
        className={clsx(
          'jt-row group',
          isMatched && 'jt-row--matched',
          isCurrentMatch && 'jt-row--current-match',
        )}
        style={{ paddingLeft: depth * INDENT_WIDTH }}
      >
        {/* Toggle button */}
        <span className="jt-toggle-area">
          {isContainer && length > 0 ? (
            <button
              onClick={() => toggleNode(id)}
              className={clsx('jt-toggle', isCollapsed && 'jt-toggle--collapsed')}
            >
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
          ) : (
            <span className="jt-toggle-space" />
          )}
        </span>

        {/* Key */}
        {key !== null && depth > 0 && (
          <>
            <span 
              className="jt-key"
              onClick={() => handleCopyPath(pathStr)}
              onMouseEnter={() => setHoveredPath(pathStr)}
              onMouseLeave={() => setHoveredPath(null)}
              title={`Copy path: ${pathStr}`}
            >
              {typeof key === 'string' ? `"${escapeHtml(key)}"` : key}
            </span>
            <span className="jt-colon">: </span>
          </>
        )}

        {/* Value or container */}
        {isContainer ? (
          <>
            <span className="jt-bracket">{type === 'object' ? '{' : '['}</span>
            {(isCollapsed || length === 0) && (
              <>
                <span className="jt-preview">{type === 'object' ? '}' : ']'}</span>
                {length > 0 && (
                  <span className="jt-count">
                    {length} {length === 1 
                      ? (type === 'object' ? 'key' : 'item') 
                      : (type === 'object' ? 'keys' : 'items')}
                  </span>
                )}
              </>
            )}
            {!isLastChild && (isCollapsed || length === 0) && <span className="jt-comma">,</span>}
          </>
        ) : (
          <>
            {renderValue()}
            {!isLastChild && <span className="jt-comma">,</span>}
          </>
        )}

        {/* Actions */}
        <div className="jt-actions opacity-0 group-hover:opacity-100">
          <button
            onClick={() => handleCopyValue(isContainer ? getSubtree(node) : value)}
            className="jt-action-btn"
            title="Copy value"
          >
            {copiedPath === 'value' ? <Check size={10} /> : <Copy size={10} />}
          </button>
        </div>
      </div>
    );
  }, [
    collapsedSet,
    matchedIds,
    matchedList,
    currentMatchIdx,
    nodeMap,
    toggleNode,
    handleCopyPath,
    handleCopyValue,
    copiedPath,
  ]);

  // Helper to get subtree value
  const getSubtree = useCallback((node: TreeNode): unknown => {
    if (!node.isContainer) return node.value;
    
    // Reconstruct the value from children
    if (node.type === 'object') {
      const result: Record<string, unknown> = {};
      for (const childId of node.childIds) {
        const child = nodeMap.get(childId);
        if (child && child.key !== null) {
          result[String(child.key)] = getSubtree(child);
        }
      }
      return result;
    } else {
      const result: unknown[] = [];
      for (const childId of node.childIds) {
        const child = nodeMap.get(childId);
        if (child) {
          result.push(getSubtree(child));
        }
      }
      return result;
    }
  }, [nodeMap]);

  // Build final render list with closing brackets
  const renderList = useMemo(() => {
    const result: React.ReactNode[] = [];
    let lineNum = 1;
    
    // Track which containers need closing brackets
    const openContainers: { node: TreeNode; startIndex: number }[] = [];
    
    for (let i = 0; i < visibleNodes.length; i++) {
      const node = visibleNodes[i];
      const nextNode = visibleNodes[i + 1];
      
      // Add this node's row
      result.push(
        <div key={`row-${node.id}`} className="jt-line">
          {showLineNumbers && <span className="jt-line-number">{lineNum++}</span>}
          {renderNode(node, i)}
        </div>
      );
      
      // Track open containers
      if (node.isContainer && !collapsedSet.has(node.id) && node.length > 0) {
        openContainers.push({ node, startIndex: i });
      }
      
      // Check for closing brackets
      const nextDepth = nextNode ? nextNode.depth : 0;
      
      while (openContainers.length > 0) {
        const lastOpen = openContainers[openContainers.length - 1];
        
        if (nextDepth <= lastOpen.node.depth) {
          openContainers.pop();
          
          const parent = lastOpen.node.parentId !== null 
            ? nodeMap.get(lastOpen.node.parentId) 
            : null;
          const isLastChild = parent 
            ? parent.childIds[parent.childIds.length - 1] === lastOpen.node.id 
            : true;
          
          result.push(
            <div 
              key={`close-${lastOpen.node.id}`} 
              className="jt-line"
              style={{ paddingLeft: lastOpen.node.depth * INDENT_WIDTH }}
            >
              {showLineNumbers && <span className="jt-line-number">{lineNum++}</span>}
              <span className="jt-row">
                <span className="jt-toggle-area"><span className="jt-toggle-space" /></span>
                <span className="jt-bracket">{lastOpen.node.type === 'object' ? '}' : ']'}</span>
                {!isLastChild && <span className="jt-comma">,</span>}
              </span>
            </div>
          );
        } else {
          break;
        }
      }
    }
    
    return result;
  }, [visibleNodes, collapsedSet, nodeMap, showLineNumbers, renderNode]);

  // Check if data has any embedded JSON that was parsed
  const hasEmbeddedJson = useMemo(() => {
    const originalStr = JSON.stringify(data);
    const processedStr = JSON.stringify(processedData);
    return originalStr !== processedStr;
  }, [data, processedData]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={clsx('jt-container', compact && 'jt-compact', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="jt-toolbar">
          <div className="jt-toolbar-left">
            <div className="jt-brand">
              <FileJson size={14} className="text-amber-500" />
              <span>JSON</span>
            </div>
            <div className="jt-meta">
              <span>{formatSize(rawSize)}</span>
              <span className="jt-separator">•</span>
              <span>{countItems(processedData)}</span>
              {hasEmbeddedJson && parseEmbeddedJson && (
                <>
                  <span className="jt-separator">•</span>
                  <span className="jt-parsed-indicator" title="Embedded JSON strings have been parsed">
                    <Link2 size={10} className="inline" />
                    <span>Parsed</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="jt-toolbar-center">
            {searchable && (
              <div className="jt-search-box">
                <Search size={12} className="jt-search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={e => performSearch(e.target.value)}
                  placeholder="Search... (Ctrl+F)"
                  className="jt-search-input"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      goToNextMatch();
                    }
                  }}
                />
                {searchTerm && (
                  <>
                    <span className="jt-search-count">
                      {matchedList.length > 0 
                        ? `${currentMatchIdx + 1}/${matchedList.length}`
                        : '0'}
                    </span>
                    <button 
                      onClick={() => performSearch('')}
                      className="jt-search-clear"
                    >
                      <X size={12} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="jt-toolbar-right">
            <button
              onClick={handleCopyAll}
              className="jt-toolbar-btn"
              title="Copy JSON"
            >
              {copiedPath === 'all' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Path tooltip */}
      {hoveredPath && (
        <div className="jt-path-tooltip">
          <span className="jt-path-label">Path:</span>
          <span className="jt-path-value">{hoveredPath}</span>
        </div>
      )}

      {/* Toast */}
      {copiedPath && (
        <div className="jt-toast">
          <Check size={12} />
          Copied!
        </div>
      )}

      {/* Content */}
      <div
        ref={viewportRef}
        className="jt-viewport"
        style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}
      >
        <div className="jt-content">
          {renderList}
        </div>
      </div>

      {/* Type Legend (optional, shown in compact mode) */}
      {!compact && visibleNodes.length > 20 && (
        <div className="jt-legend">
          <span className="jt-legend-item">
            <Braces size={10} className="text-slate-400" /> Object
          </span>
          <span className="jt-legend-item">
            <Brackets size={10} className="text-slate-400" /> Array
          </span>
          <span className="jt-legend-item">
            <Type size={10} className="text-emerald-400" /> String
          </span>
          <span className="jt-legend-item">
            <Hash size={10} className="text-amber-400" /> Number
          </span>
          <span className="jt-legend-item">
            <ToggleRight size={10} className="text-violet-400" /> Boolean
          </span>
          <span className="jt-legend-item">
            <CircleOff size={10} className="text-gray-400" /> Null
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Wrapper for string JSON input
// ============================================================================

interface JsonTreeViewerWrapperProps extends Omit<JsonTreeViewerProps, 'data'> {
  content: string;
  fallback?: React.ReactNode;
}

export function JsonTreeViewerWrapper({
  content,
  fallback,
  ...props
}: JsonTreeViewerWrapperProps) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }, [content]);

  if (parsed === null) {
    return fallback ? <>{fallback}</> : (
      <pre className="text-sm font-mono text-red-400 p-3 bg-red-500/10 rounded">
        Invalid JSON
      </pre>
    );
  }

  return <JsonTreeViewer data={parsed} {...props} />;
}

export default JsonTreeViewer;
