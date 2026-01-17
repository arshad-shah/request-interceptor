/**
 * NetworkRequestDetails - Sub-Components
 * Reusable UI components for the detail panel
 */

import { useState, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { clsx } from 'clsx';
import {
  Copy,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Shield,
  Clock,
  Database,
  AlertCircle,
  Sparkles,
  Key,
  Layers,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { NetworkHeader } from '../../types/network';
import type { PerformanceInsight, DecodedJwt, ParsedCookie } from './utils';
import { highlightSearchTerm } from './utils';
import { copyToClipboard } from '../../lib/network-api';
import { JsonTreeViewer } from '../common/JsonTreeViewer';

// ============================================================================
// Custom Syntax Highlighter Theme (matches design system)
// ============================================================================

const codeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'var(--bg-surface)',
    margin: 0,
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '11px',
    lineHeight: '1.5',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontSize: '11px',
  },
};

// ============================================================================
// Section Component
// ============================================================================

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeType?: 'default' | 'success' | 'warning' | 'error';
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Section({
  title,
  icon,
  badge,
  badgeType = 'default',
  collapsed,
  onToggle,
  children,
  actions,
  className,
}: SectionProps) {
  return (
    <div className={clsx('ds-section', collapsed && 'collapsed', className)}>
      <div className="ds-section-header" onClick={onToggle}>
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {icon}
          <span>{title}</span>
          {badge !== undefined && (
            <span
              className={clsx(
                'ds-badge text-[10px]',
                badgeType === 'success' && 'emerald',
                badgeType === 'warning' && 'amber',
                badgeType === 'error' && 'rose',
                badgeType === 'default' && 'gray'
              )}
            >
              {badge}
            </span>
          )}
        </div>
        {actions && (
          <div
            className="flex items-center gap-1"
            onClick={e => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
      <div className="ds-section-content">{children}</div>
    </div>
  );
}

// ============================================================================
// Copy Button Component
// ============================================================================

interface CopyButtonProps {
  text: string;
  size?: number;
  className?: string;
  title?: string;
}

export function CopyButton({ text, size = 12, className, title = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      className={clsx('ds-icon-btn', className)}
      onClick={handleCopy}
      title={title}
    >
      {copied ? (
        <Check size={size} className="text-emerald-500" />
      ) : (
        <Copy size={size} />
      )}
    </button>
  );
}

// ============================================================================
// Headers List Component
// ============================================================================

interface HeadersListProps {
  headers: NetworkHeader[] | undefined;
  searchTerm?: string;
  emptyText?: string;
  showCopy?: boolean;
}

export function HeadersList({
  headers,
  searchTerm = '',
  emptyText = 'No headers',
  showCopy = true,
}: HeadersListProps) {
  if (!headers || headers.length === 0) {
    return (
      <div className="text-[var(--text-tertiary)] italic text-sm py-2">
        {emptyText}
      </div>
    );
  }

  const filteredHeaders = searchTerm
    ? headers.filter(
        h =>
          h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : headers;

  if (filteredHeaders.length === 0) {
    return (
      <div className="text-[var(--text-tertiary)] italic text-sm py-2">
        No headers match "{searchTerm}"
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {filteredHeaders.map((h, i) => (
        <div
          key={`${h.name}-${i}`}
          className="ds-header-row group hover:bg-[var(--bg-surface)] rounded px-1.5 py-0.5 -mx-1.5"
        >
          <span
            className="ds-header-name"
            dangerouslySetInnerHTML={{
              __html: highlightSearchTerm(h.name, searchTerm),
            }}
          />
          <span
            className="ds-header-value flex-1 break-all"
            dangerouslySetInnerHTML={{
              __html: highlightSearchTerm(h.value, searchTerm),
            }}
          />
          {showCopy && (
            <CopyButton
              text={h.value}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              title="Copy value"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Code Block Component (with syntax highlighting)
// ============================================================================

interface CodeBlockProps {
  content: string;
  language?: string;
  maxHeight?: number;
  searchTerm?: string;
  showCopy?: boolean;
  wrapLines?: boolean;
  /** Enable tree view for JSON (default: true for json language) */
  enableTreeView?: boolean;
  /** Default view mode for JSON */
  defaultView?: 'tree' | 'raw';
}

export function CodeBlock({
  content,
  language = 'text',
  maxHeight = 400,
  searchTerm,
  showCopy = true,
  wrapLines = true,
  enableTreeView = true,
  defaultView = 'tree',
}: CodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>(defaultView);

  // Check if content is valid JSON
  const parsedJson = useMemo(() => {
    if (language === 'json' && enableTreeView) {
      try {
        return JSON.parse(content);
      } catch {
        return null;
      }
    }
    return null;
  }, [content, language, enableTreeView]);

  const isJsonTreeAvailable = parsedJson !== null;

  // Format JSON if applicable
  const formattedContent = useMemo(() => {
    if (language === 'json') {
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return content;
      }
    }
    return content;
  }, [content, language]);

  const isLong = formattedContent.split('\n').length > 50;
  const displayContent = isLong && !isExpanded
    ? formattedContent.split('\n').slice(0, 50).join('\n') + '\n...'
    : formattedContent;

  // If JSON tree view is available and selected, use it
  if (isJsonTreeAvailable && viewMode === 'tree') {
    return (
      <div className="relative">
        {/* View toggle */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
          <button
            onClick={() => setViewMode('tree')}
            className="px-2 py-1 text-[10px] font-medium rounded transition-colors bg-[var(--accent-indigo)] text-white"
          >
            Tree
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className="px-2 py-1 text-[10px] font-medium rounded transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Raw
          </button>
        </div>
        <JsonTreeViewer
          data={parsedJson}
          maxHeight={maxHeight}
          showToolbar={true}
          initialExpandDepth={3}
          compact={false}
        />
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* View toggle for JSON */}
      {isJsonTreeAvailable && (
        <div className="absolute top-2 right-12 z-10 flex items-center gap-1 bg-[var(--bg-elevated)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--border-subtle)]">
          <button
            onClick={() => setViewMode('tree')}
            className={clsx(
              'px-2 py-1 text-[10px] font-medium rounded transition-colors',
              viewMode === 'tree'
                ? 'bg-[var(--accent-indigo)] text-white'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            )}
          >
            Tree
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={clsx(
              'px-2 py-1 text-[10px] font-medium rounded transition-colors',
              viewMode === 'raw'
                ? 'bg-[var(--accent-indigo)] text-white'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            )}
          >
            Raw
          </button>
        </div>
      )}
      {showCopy && (
        <CopyButton
          text={formattedContent}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Copy code"
        />
      )}
      <div
        className="overflow-auto rounded-[var(--radius-md)]"
        style={{ maxHeight: isExpanded ? 'none' : maxHeight }}
      >
        <SyntaxHighlighter
          language={language}
          style={codeTheme}
          wrapLines={wrapLines}
          wrapLongLines={wrapLines}
          customStyle={{
            margin: 0,
            background: 'var(--bg-surface)',
          }}
        >
          {displayContent}
        </SyntaxHighlighter>
      </div>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-1.5 text-[11px] text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 
            bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] rounded-b-[var(--radius-md)]"
        >
          {isExpanded ? 'Show less' : `Show all (${formattedContent.split('\n').length} lines)`}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Insight Card Component
// ============================================================================

interface InsightCardProps {
  insight: PerformanceInsight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const icons = {
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
  };

  const categoryIcons = {
    performance: <Zap size={12} />,
    security: <Shield size={12} />,
    caching: <Database size={12} />,
    compression: <Layers size={12} />,
    'best-practice': <Sparkles size={12} />,
  };

  const colors = {
    error: {
      bg: 'bg-rose-500/5',
      border: 'border-rose-500/20',
      icon: 'bg-rose-500/10 text-rose-500',
    },
    warning: {
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/20',
      icon: 'bg-amber-500/10 text-amber-500',
    },
    success: {
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/20',
      icon: 'bg-emerald-500/10 text-emerald-500',
    },
    info: {
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/20',
      icon: 'bg-blue-500/10 text-blue-500',
    },
  };

  const color = colors[insight.type];

  return (
    <div className={clsx('p-3 rounded-[var(--radius-md)] border', color.bg, color.border)}>
      <div className="flex items-start gap-3">
        <div className={clsx('flex-shrink-0 p-1.5 rounded-[var(--radius-sm)]', color.icon)}>
          {icons[insight.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-[var(--text-primary)] text-sm">
              {insight.title}
            </span>
            <span className="ds-badge gray text-[10px] flex items-center gap-1">
              {categoryIcons[insight.category]}
              {insight.category}
            </span>
            {insight.metric && (
              <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                {insight.metric}
              </span>
            )}
          </div>
          <p className="text-[var(--text-secondary)] text-[12px] leading-relaxed">
            {insight.description}
          </p>
          {insight.suggestion && (
            <p className="text-[var(--text-tertiary)] text-[11px] mt-1.5 flex items-start gap-1">
              <Sparkles size={10} className="mt-0.5 flex-shrink-0" />
              <span>{insight.suggestion}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// JWT Viewer Component
// ============================================================================

interface JwtViewerProps {
  jwt: DecodedJwt;
}

export function JwtViewer({ jwt }: JwtViewerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 p-3 bg-[var(--bg-surface)] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Key size={14} className="text-amber-500" />
        <span className="font-medium text-sm text-[var(--text-primary)]">
          JWT Token
        </span>
        <span className="ds-badge gray text-[10px]">{jwt.location}</span>
        {jwt.isExpired ? (
          <span className="ds-badge rose text-[10px]">Expired</span>
        ) : (
          <span className="ds-badge emerald text-[10px]">Valid</span>
        )}
        <CopyButton
          text={`${btoa(JSON.stringify(jwt.header))}.${btoa(JSON.stringify(jwt.payload))}.${jwt.signature}`}
          className="ml-auto"
          title="Copy token"
        />
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-3 space-y-3 border-t border-[var(--border-subtle)]">
          {/* Header Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Header
              </span>
              <span className="ds-badge gray text-[9px]">
                {jwt.header.alg as string || 'unknown'} / {jwt.header.typ as string || 'JWT'}
              </span>
            </div>
            <CodeBlock
              content={JSON.stringify(jwt.header, null, 2)}
              language="json"
              maxHeight={150}
              showCopy={false}
            />
          </div>

          {/* Payload Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Payload
              </span>
            </div>
            <CodeBlock
              content={JSON.stringify(jwt.payload, null, 2)}
              language="json"
              maxHeight={200}
              showCopy={false}
            />
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-[var(--border-subtle)]">
            {jwt.issuer && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-[var(--text-tertiary)]">Issuer:</span>
                <span className="font-mono text-[var(--text-secondary)]">{jwt.issuer}</span>
              </div>
            )}
            {jwt.subject && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-[var(--text-tertiary)]">Subject:</span>
                <span className="font-mono text-[var(--text-secondary)]">{jwt.subject}</span>
              </div>
            )}
            {jwt.issuedAt && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <Clock size={10} className="text-[var(--text-tertiary)]" />
                <span className="text-[var(--text-tertiary)]">Issued:</span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {jwt.issuedAt.toLocaleString()}
                </span>
              </div>
            )}
            {jwt.expiresAt && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <Clock size={10} className="text-[var(--text-tertiary)]" />
                <span className="text-[var(--text-tertiary)]">Expires:</span>
                <span
                  className={clsx(
                    'font-mono',
                    jwt.isExpired ? 'text-rose-500' : 'text-[var(--text-secondary)]'
                  )}
                >
                  {jwt.expiresAt.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Cookie Card Component
// ============================================================================

interface CookieCardProps {
  cookie: ParsedCookie;
  showValue?: boolean;
}

export function CookieCard({ cookie, showValue = true }: CookieCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-2.5 bg-[var(--bg-surface)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[12px] font-medium text-[var(--text-primary)]">
          {cookie.name}
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {cookie.httpOnly && (
            <span className="ds-badge gray text-[9px]">HttpOnly</span>
          )}
          {cookie.secure && (
            <span className="ds-badge emerald text-[9px]">Secure</span>
          )}
          {cookie.sameSite && (
            <span className="ds-badge indigo text-[9px]">
              SameSite={cookie.sameSite}
            </span>
          )}
        </div>
        <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">
          {cookie.size} bytes
        </span>
      </div>

      {showValue && (
        <div
          className="mt-1.5 font-mono text-[11px] text-[var(--text-secondary)] break-all cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded || cookie.value.length <= 80
            ? cookie.value
            : `${cookie.value.substring(0, 80)}...`}
          {cookie.value.length > 80 && (
            <span className="text-[var(--accent-blue)] ml-1">
              {expanded ? '(less)' : '(more)'}
            </span>
          )}
        </div>
      )}

      {(cookie.domain || cookie.path || cookie.expires) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-[var(--border-subtle)]">
          {cookie.domain && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Domain: <span className="text-[var(--text-secondary)]">{cookie.domain}</span>
            </span>
          )}
          {cookie.path && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Path: <span className="text-[var(--text-secondary)]">{cookie.path}</span>
            </span>
          )}
          {cookie.expires && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Expires: <span className="text-[var(--text-secondary)]">{cookie.expires}</span>
            </span>
          )}
          {cookie.maxAge && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Max-Age: <span className="text-[var(--text-secondary)]">{cookie.maxAge}s</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Timing Bar Component
// ============================================================================

interface TimingBarProps {
  name: string;
  value: number;
  maxValue: number;
  color: string;
  formatValue: (v: number) => string;
}

export function TimingBar({ name, value, maxValue, color, formatValue }: TimingBarProps) {
  const percentage = Math.max((value / maxValue) * 100, 3);

  return (
    <div className="flex items-center gap-3">
      <span className="w-[90px] text-[11px] font-medium text-[var(--text-secondary)] truncate">
        {name}
      </span>
      <div className="flex-1 h-5 bg-[var(--bg-surface)] rounded-[var(--radius-sm)] overflow-hidden">
        <div
          className="h-full rounded-[var(--radius-sm)] flex items-center justify-end px-2
            text-[10px] font-mono font-medium text-white transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            minWidth: value > 0 ? '40px' : '0',
          }}
        >
          {percentage > 20 ? formatValue(value) : ''}
        </div>
      </div>
      <span className="w-[60px] text-right font-mono text-[11px] text-[var(--text-secondary)]">
        {formatValue(value)}
      </span>
    </div>
  );
}

// ============================================================================
// Waterfall Chart Component
// ============================================================================

interface WaterfallPhase {
  name: string;
  value: number;
  color: string;
}

interface WaterfallChartProps {
  phases: WaterfallPhase[];
  totalTime: number;
}

export function WaterfallChart({ phases, totalTime }: WaterfallChartProps) {
  if (phases.length === 0 || totalTime === 0) return null;

  return (
    <div className="p-3 bg-[var(--bg-surface)] rounded-[var(--radius-md)]">
      <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-2">
        Request Timeline
      </div>
      <div className="h-7 bg-[var(--bg-base)] rounded-[var(--radius-sm)] overflow-hidden flex">
        {phases.map((phase, i) => {
          const widthPercent = (phase.value / totalTime) * 100;
          if (widthPercent < 0.5) return null;

          return (
            <div
              key={phase.name}
              className="h-full relative group transition-opacity hover:opacity-90"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: phase.color,
                minWidth: phase.value > 0 ? '2px' : '0',
              }}
              title={`${phase.name}: ${phase.value.toFixed(1)}ms`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2.5">
        {phases.map(phase => (
          phase.value > 0 && (
            <div key={phase.name} className="flex items-center gap-1.5 text-[10px]">
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: phase.color }}
              />
              <span className="text-[var(--text-tertiary)]">{phase.name}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-[var(--text-tertiary)] opacity-50 mb-2">{icon}</div>
      <div className="text-sm font-medium text-[var(--text-tertiary)]">{title}</div>
      {description && (
        <div className="text-[12px] text-[var(--text-tertiary)] mt-1 max-w-[200px]">
          {description}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | React.ReactNode;
  subValue?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, subValue, icon }: StatCardProps) {
  return (
    <div className="ds-panel">
      <div className="ds-panel-body">
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)] mb-1">
          {icon}
          {label}
        </div>
        <div className="font-mono text-[var(--text-primary)]">{value}</div>
        {subValue && (
          <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{subValue}</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Stack Trace Component
// ============================================================================

interface StackTraceProps {
  stack: Array<{
    functionName: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  }>;
}

export function StackTrace({ stack }: StackTraceProps) {
  const [expanded, setExpanded] = useState(false);
  const displayStack = expanded ? stack : stack.slice(0, 3);

  return (
    <div className="space-y-1">
      {displayStack.map((frame, i) => {
        // Extract filename from URL
        let filename = frame.url;
        try {
          const url = new URL(frame.url);
          filename = url.pathname.split('/').pop() || frame.url;
        } catch {
          filename = frame.url.split('/').pop() || frame.url;
        }

        return (
          <div
            key={i}
            className="flex items-start gap-2 text-[11px] font-mono py-1 px-2 rounded hover:bg-[var(--bg-surface)] group"
          >
            <span className="text-[var(--text-tertiary)] select-none w-4">{i}</span>
            <span className="text-[var(--accent-violet)]">
              {frame.functionName || '(anonymous)'}
            </span>
            <span className="text-[var(--text-tertiary)]">@</span>
            <span
              className="text-[var(--text-secondary)] truncate flex-1"
              title={frame.url}
            >
              {filename}
            </span>
            <span className="text-[var(--accent-cyan)]">
              :{frame.lineNumber}:{frame.columnNumber}
            </span>
            <a
              href={frame.url}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={10} className="text-[var(--text-tertiary)]" />
            </a>
          </div>
        );
      })}
      {stack.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-[var(--accent-blue)] hover:underline px-2"
        >
          {expanded ? 'Show less' : `Show ${stack.length - 3} more frames`}
        </button>
      )}
    </div>
  );
}