import { clsx } from 'clsx';
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import type { CopiedTarget, TreeNode } from './types';
import { JsonValue } from './JsonValue';
import { INDENT_WIDTH, escapeHtml, formatCount, formatPath } from './utils';

interface JsonTreeRowProps {
  node: TreeNode;
  isCollapsed: boolean;
  isMatched: boolean;
  isCurrentMatch: boolean;
  isLastChild: boolean;
  copied: CopiedTarget;
  onToggle: (id: number) => void;
  onCopyPath: (path: string) => void;
  onCopyValue: (node: TreeNode) => void;
  onHoverPath: (path: string | null) => void;
}

/** One opening line of the tree: toggle, key, value or bracket summary, and actions. */
export function JsonTreeRow({
  node,
  isCollapsed,
  isMatched,
  isCurrentMatch,
  isLastChild,
  copied,
  onToggle,
  onCopyPath,
  onCopyValue,
  onHoverPath,
}: JsonTreeRowProps) {
  const { id, key, path, depth, type, isContainer, length, value } = node;
  const pathStr = formatPath(path);

  return (
    <div
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
            onClick={() => onToggle(id)}
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
            onClick={() => onCopyPath(pathStr)}
            onMouseEnter={() => onHoverPath(pathStr)}
            onMouseLeave={() => onHoverPath(null)}
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
              {length > 0 && <span className="jt-count">{formatCount(type, length)}</span>}
            </>
          )}
          {!isLastChild && (isCollapsed || length === 0) && <span className="jt-comma">,</span>}
        </>
      ) : (
        <>
          <JsonValue type={type} value={value} />
          {!isLastChild && <span className="jt-comma">,</span>}
        </>
      )}

      {/* Actions */}
      <div className="jt-actions opacity-0 group-hover:opacity-100">
        <button
          onClick={() => onCopyValue(node)}
          className="jt-action-btn"
          title="Copy value"
        >
          {copied === 'value' ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>
    </div>
  );
}

interface JsonTreeCloseRowProps {
  node: TreeNode;
  isLastChild: boolean;
}

/** Closing bracket line for an expanded container. */
export function JsonTreeCloseRow({ node, isLastChild }: JsonTreeCloseRowProps) {
  return (
    <span className="jt-row">
      <span className="jt-toggle-area"><span className="jt-toggle-space" /></span>
      <span className="jt-bracket">{node.type === 'object' ? '}' : ']'}</span>
      {!isLastChild && <span className="jt-comma">,</span>}
    </span>
  );
}
