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
import { Check } from 'lucide-react';
import { copyToClipboard } from '@/lib/network-api';
import type { CopiedTarget, JsonTreeViewerProps, TreeNode } from './types';
import { JsonTreeCloseRow, JsonTreeRow } from './JsonTreeRow';
import { JsonTreeLegend, JsonTreeToolbar } from './JsonTreeToolbar';
import {
  INDENT_WIDTH,
  ROW_HEIGHT,
  buildTree,
  computeInitialCollapsed,
  countItems,
  deepParseEmbeddedJson,
  flattenVisible,
  formatSize,
  getSubtree,
  isLastChild,
  searchTree,
} from './utils';

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
  const [copiedPath, setCopiedPath] = useState<CopiedTarget>(null);
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
    const { nodeMap, rootId } = buildTree(processedData);
    return { nodeMap, rootId, rawSize: JSON.stringify(processedData).length };
  }, [processedData]);

  // Initialize collapsed state
  useEffect(() => {
    setCollapsedSet(computeInitialCollapsed(nodeMap, initialExpandDepth));
  }, [nodeMap, initialExpandDepth]);

  // ─── Rebuild Flat List ─────────────────────────────────────────────────────
  const visibleNodes = useMemo(
    () => flattenVisible(nodeMap, rootId, collapsedSet),
    [nodeMap, rootId, collapsedSet]
  );

  // ─── Search ────────────────────────────────────────────────────────────────
  const scrollToMatch = useCallback((targetId: number) => {
    const idx = visibleNodes.findIndex(n => n.id === targetId);
    if (idx >= 0 && viewportRef.current) {
      const targetOffset = idx * ROW_HEIGHT;
      const viewportHeight = viewportRef.current.clientHeight;
      viewportRef.current.scrollTop = targetOffset - viewportHeight / 2 + ROW_HEIGHT / 2;
    }
  }, [visibleNodes]);

  const resetMatches = useCallback(() => {
    setMatchedIds(new Set());
    setMatchedList([]);
    setCurrentMatchIdx(-1);
  }, []);

  const performSearch = useCallback((query: string) => {
    setSearchTerm(query);

    if (!query.trim()) {
      resetMatches();
      return;
    }

    const { matches, collapsed } = searchTree(nodeMap, query, collapsedSet);

    setMatchedIds(new Set(matches));
    setMatchedList(matches);
    setCurrentMatchIdx(matches.length > 0 ? 0 : -1);
    setCollapsedSet(collapsed);

    // Scroll to first match
    if (matches.length > 0) {
      setTimeout(() => scrollToMatch(matches[0]), 50);
    }
  }, [nodeMap, collapsedSet, resetMatches, scrollToMatch]);

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

  const handleCopyValue = useCallback(async (node: TreeNode) => {
    const value = node.isContainer ? getSubtree(nodeMap, node) : node.value;
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    await copyToClipboard(text);
    setCopiedPath('value');
    setTimeout(() => setCopiedPath(null), 2000);
  }, [nodeMap]);

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
        resetMatches();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [matchedList, goToNextMatch, resetMatches]);

  // Build final render list with closing brackets
  const renderList = useMemo(() => {
    const result: React.ReactNode[] = [];
    let lineNum = 1;

    // Track which containers need closing brackets
    const openContainers: TreeNode[] = [];

    for (let i = 0; i < visibleNodes.length; i++) {
      const node = visibleNodes[i];
      const nextNode = visibleNodes[i + 1];

      // Add this node's row
      result.push(
        <div key={`row-${node.id}`} className="jt-line">
          {showLineNumbers && <span className="jt-line-number">{lineNum++}</span>}
          <JsonTreeRow
            node={node}
            isCollapsed={collapsedSet.has(node.id)}
            isMatched={matchedIds.has(node.id)}
            isCurrentMatch={matchedList[currentMatchIdx] === node.id}
            isLastChild={isLastChild(nodeMap, node)}
            copied={copiedPath}
            onToggle={toggleNode}
            onCopyPath={handleCopyPath}
            onCopyValue={handleCopyValue}
            onHoverPath={setHoveredPath}
          />
        </div>
      );

      // Track open containers
      if (node.isContainer && !collapsedSet.has(node.id) && node.length > 0) {
        openContainers.push(node);
      }

      // Close every container the next row is not nested inside
      const nextDepth = nextNode ? nextNode.depth : 0;
      while (openContainers.length > 0 && nextDepth <= openContainers[openContainers.length - 1].depth) {
        const open = openContainers.pop()!;
        result.push(
          <div
            key={`close-${open.id}`}
            className="jt-line"
            style={{ paddingLeft: open.depth * INDENT_WIDTH }}
          >
            {showLineNumbers && <span className="jt-line-number">{lineNum++}</span>}
            <JsonTreeCloseRow node={open} isLastChild={isLastChild(nodeMap, open)} />
          </div>
        );
      }
    }

    return result;
  }, [
    visibleNodes,
    collapsedSet,
    matchedIds,
    matchedList,
    currentMatchIdx,
    nodeMap,
    showLineNumbers,
    copiedPath,
    toggleNode,
    handleCopyPath,
    handleCopyValue,
  ]);

  // Check if data has any embedded JSON that was parsed
  const hasEmbeddedJson = useMemo(() => {
    const originalStr = JSON.stringify(data);
    const processedStr = JSON.stringify(processedData);
    return originalStr !== processedStr;
  }, [data, processedData]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={clsx('jt-container', compact && 'jt-compact', className)}>
      {showToolbar && (
        <JsonTreeToolbar
          sizeLabel={formatSize(rawSize)}
          countLabel={countItems(processedData)}
          showParsedIndicator={hasEmbeddedJson && parseEmbeddedJson}
          searchable={searchable}
          searchInputRef={searchInputRef}
          searchTerm={searchTerm}
          matchCount={matchedList.length}
          currentMatchIdx={currentMatchIdx}
          copied={copiedPath}
          onSearch={performSearch}
          onNextMatch={goToNextMatch}
          onCopyAll={handleCopyAll}
        />
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
      {!compact && visibleNodes.length > 20 && <JsonTreeLegend />}
    </div>
  );
}
