/**
 * NetworkRequestDetails Component - Enhanced Version
 * Professional-grade detail panel with intelligent analysis, search, and advanced features
 * Inspired by Chrome DevTools Network panel
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import {
  X,
  Copy,
  Play,
  Link,
  Terminal,
  Search,
  Clock,
  Database,
  FileJson,
  Code,
  Eye,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Sparkles,
  Lock,
  Unlock,
  Cookie,
  RefreshCw,
  FileText,
  Hash,
  Globe,
  Server,
  Layers,
  Info,
  AlertTriangle,
  Zap,
  Shield,
} from 'lucide-react';
import type { NetworkRequest, ResponseBody, ResponseView } from '../../types/network';
import {
  getStatusClass,
  getStatusText,
  parseQueryParams,
  formatSize,
  formatTime,
  looksLikeJson,
  formatXml,
  calculateTimingPhases,
  generateCurl,
  copyToClipboard,
  getResponseBody,
  replayRequest,
  getCurrentTabId,
} from '../../lib/network-api';

// Local imports
import {
  parseCookies,
  extractSecurityInfo,
  findJwtTokens,
  analyzePerformance,
  getInitiatorInfo,
  getLanguageFromMime,
  type ExtendedDetailTab,
} from './utils';
import {
  Section,
  HeadersList,
  CodeBlock,
  InsightCard,
  JwtViewer,
  CookieCard,
  TimingBar,
  WaterfallChart,
  EmptyState,
  StatCard,
  StackTrace,
  CopyButton,
} from './components';

// ============================================================================
// Types
// ============================================================================

interface NetworkRequestDetailsProps {
  request: NetworkRequest;
  responseBody: ResponseBody | null;
  onClose: () => void;
  onLoadResponseBody: (body: ResponseBody | null) => void;
}

// ============================================================================
// Constants
// ============================================================================

const TIMING_COLORS: Record<string, string> = {
  blocked: '#6b7280',  // gray
  dns: '#06b6d4',      // cyan
  connect: '#8b5cf6',  // violet
  ssl: '#f43f5e',      // rose
  send: '#3b82f6',     // blue
  wait: '#f59e0b',     // amber
  receive: '#10b981',  // emerald
};

// ============================================================================
// Main Component
// ============================================================================

export function NetworkRequestDetails({
  request,
  responseBody,
  onClose,
  onLoadResponseBody,
}: NetworkRequestDetailsProps) {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ExtendedDetailTab>('headers');
  const [responseView, setResponseView] = useState<ResponseView>('preview');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Memoized Data ─────────────────────────────────────────────────────────
  const cookies = useMemo(
    () => parseCookies(request.requestHeaders, request.responseHeaders),
    [request.requestHeaders, request.responseHeaders]
  );

  const securityInfo = useMemo(
    () => extractSecurityInfo(request),
    [request]
  );

  const jwtTokens = useMemo(
    () => findJwtTokens(request),
    [request]
  );

  const insights = useMemo(
    () => analyzePerformance(request, responseBody),
    [request, responseBody]
  );

  const initiatorInfo = useMemo(
    () => getInitiatorInfo(request),
    [request]
  );

  const queryParams = useMemo(
    () => parseQueryParams(request.query),
    [request.query]
  );

  const timingPhases = useMemo(
    () => calculateTimingPhases(request.timing, request.duration),
    [request.timing, request.duration]
  );

  // Tab badge counts
  const cookieCount = cookies.request.length + cookies.response.length;
  const insightCounts = useMemo(() => ({
    total: insights.length,
    errors: insights.filter(i => i.type === 'error').length,
    warnings: insights.filter(i => i.type === 'warning').length,
  }), [insights]);

  // ─── Effects ───────────────────────────────────────────────────────────────
  
  // Load response body when response tab is selected
  useEffect(() => {
    if (activeTab === 'response' && !responseBody && !isLoading) {
      loadResponseBody();
    }
  }, [activeTab, request.requestId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F to search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchVisible(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      // Escape to close search or panel
      if (e.key === 'Escape') {
        if (isSearchVisible) {
          setIsSearchVisible(false);
          setSearchTerm('');
        } else {
          onClose();
        }
      }
    };

    const panel = panelRef.current;
    if (panel) {
      panel.addEventListener('keydown', handleKeyDown);
      return () => panel.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSearchVisible, onClose]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const loadResponseBody = async () => {
    setIsLoading(true);
    try {
      const tabId = await getCurrentTabId();
      if (tabId) {
        const body = await getResponseBody(tabId, request.requestId);
        onLoadResponseBody(body);
      }
    } catch (e) {
      console.error('Failed to load response body:', e);
      showToast('Failed to load response');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleCopy = useCallback(async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    showToast(success ? `${label} copied` : `Failed to copy`);
  }, [showToast]);

  const handleReplay = async () => {
    showToast('Replaying request...');
    try {
      const result = await replayRequest(request);
      if (result.error) {
        showToast(`Replay failed: ${result.error}`);
      } else {
        showToast(`Replay: ${result.status} ${result.statusText}`);
      }
    } catch {
      showToast('Replay failed');
    }
  };

  const handleDownloadResponse = () => {
    if (!responseBody?.body) {
      showToast('No response to download');
      return;
    }

    try {
      let content = responseBody.body;
      let mimeType = responseBody.mimeType || 'application/octet-stream';

      if (responseBody.base64Encoded) {
        const byteChars = atob(content);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        content = URL.createObjectURL(blob);
      } else {
        const blob = new Blob([content], { type: mimeType });
        content = URL.createObjectURL(blob);
      }

      const filename = request.filename || `response.${getExtension(mimeType)}`;
      const link = document.createElement('a');
      link.href = content;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(content);
      showToast('Download started');
    } catch {
      showToast('Download failed');
    }
  };

  // ─── Render Helpers ────────────────────────────────────────────────────────

  const renderGeneralInfo = () => {
    const items = [
      { label: 'Request URL', value: request.url, mono: true },
      { label: 'Request Method', value: request.method },
      {
        label: 'Status Code',
        value: request.statusCode
          ? `${request.statusCode} ${getStatusText(request.statusCode)}`
          : 'Pending',
        color: request.statusCode
          ? request.statusCode >= 400
            ? 'text-rose-500'
            : request.statusCode >= 300
            ? 'text-amber-500'
            : 'text-emerald-500'
          : undefined,
      },
      { label: 'Remote Address', value: request.ip || request.remoteIPAddress || '—' },
    ];

    if (request.protocol) {
      items.push({ label: 'Protocol', value: request.protocol.toUpperCase() });
    }
    if (request.mimeType) {
      items.push({ label: 'Content-Type', value: request.mimeType });
    }
    if (request.fromCache) {
      items.push({ label: 'Served From', value: 'Disk Cache' });
    }
    if (request.fromServiceWorker) {
      items.push({ label: 'Served From', value: 'Service Worker' });
    }

    return (
      <div className="space-y-0.5">
        {items.map(item => (
          <div key={item.label} className="ds-header-row">
            <span className="ds-header-name">{item.label}</span>
            <span
              className={clsx(
                'ds-header-value',
                item.mono && 'break-all',
                item.color
              )}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderResponseBody = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="ds-spinner" />
        </div>
      );
    }

    if (!responseBody?.body) {
      return (
        <EmptyState
          icon={<FileText size={32} />}
          title="No response body"
          description="Response body is empty or not available"
        />
      );
    }

    let content = responseBody.body;
    const mimeType = responseBody.mimeType || request.mimeType || '';

    // Handle base64 encoded content
    if (responseBody.base64Encoded) {
      if (mimeType.startsWith('image/')) {
        return (
          <div className="flex flex-col items-center gap-3">
            <img
              src={`data:${mimeType};base64,${content}`}
              alt="Response"
              className="max-w-full h-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)]"
            />
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {mimeType} • {formatSize(Math.ceil(content.length * 0.75))}
            </span>
          </div>
        );
      }

      // Try to decode base64
      try {
        content = atob(content);
      } catch {
        return (
          <EmptyState
            icon={<Database size={32} />}
            title="Binary content"
            description="Cannot display binary response"
          />
        );
      }
    }

    // Determine language for syntax highlighting
    let language = getLanguageFromMime(mimeType);
    if (language === 'text' && looksLikeJson(content)) {
      language = 'json';
    }

    // Raw view
    if (responseView === 'raw') {
      return (
        <CodeBlock
          content={content}
          language="text"
          searchTerm={searchTerm}
          maxHeight={500}
        />
      );
    }

    // Preview view with syntax highlighting
    return (
      <CodeBlock
        content={content}
        language={language}
        searchTerm={searchTerm}
        maxHeight={500}
      />
    );
  };

  const renderTiming = () => {
    if (timingPhases.length === 0) {
      return (
        <EmptyState
          icon={<Clock size={32} />}
          title="No timing data"
          description="Timing information not available"
        />
      );
    }

    const maxPhase = Math.max(...timingPhases.map(p => p.value), 1);
    const totalTime = timingPhases.reduce((sum, p) => sum + p.value, 0);

    // Prepare waterfall data
    const waterfallPhases = timingPhases.map(p => ({
      name: p.name,
      value: p.value,
      color: TIMING_COLORS[p.className] || TIMING_COLORS.receive,
    }));

    return (
      <div className="space-y-4">
        {/* Waterfall visualization */}
        <WaterfallChart phases={waterfallPhases} totalTime={totalTime} />

        {/* Phase breakdown */}
        <div className="space-y-2">
          {timingPhases.map(phase => (
            <TimingBar
              key={phase.name}
              name={phase.name}
              value={phase.value}
              maxValue={maxPhase}
              color={TIMING_COLORS[phase.className] || TIMING_COLORS.receive}
              formatValue={formatTime}
            />
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Duration"
            value={formatTime(request.duration || 0)}
            icon={<Clock size={10} />}
          />
          <StatCard
            label="Started At"
            value={
              request.startTime
                ? new Date(request.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '—'
            }
            icon={<Zap size={10} />}
          />
          {request.encodedSize !== undefined && (
            <StatCard
              label="Transfer Size"
              value={formatSize(request.encodedSize)}
              icon={<Database size={10} />}
            />
          )}
          {request.size !== undefined && request.size !== request.encodedSize && (
            <StatCard
              label="Resource Size"
              value={formatSize(request.size)}
              icon={<FileJson size={10} />}
            />
          )}
        </div>
      </div>
    );
  };

  const renderCookies = () => {
    if (cookieCount === 0) {
      return (
        <EmptyState
          icon={<Cookie size={32} />}
          title="No cookies"
          description="No cookies in this request"
        />
      );
    }

    return (
      <div className="space-y-3">
        {cookies.request.length > 0 && (
          <Section
            title="Request Cookies"
            icon={<Cookie size={14} />}
            badge={cookies.request.length}
            collapsed={collapsedSections.has('request-cookies')}
            onToggle={() => toggleSection('request-cookies')}
          >
            <div className="space-y-2">
              {cookies.request.map((cookie, i) => (
                <CookieCard key={`${cookie.name}-${i}`} cookie={cookie} />
              ))}
            </div>
          </Section>
        )}

        {cookies.response.length > 0 && (
          <Section
            title="Response Cookies (Set-Cookie)"
            icon={<Cookie size={14} />}
            badge={cookies.response.length}
            collapsed={collapsedSections.has('response-cookies')}
            onToggle={() => toggleSection('response-cookies')}
          >
            <div className="space-y-2">
              {cookies.response.map((cookie, i) => (
                <CookieCard key={`${cookie.name}-${i}`} cookie={cookie} />
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  };

  const renderInitiator = () => {
    return (
      <div className="space-y-3">
        {/* Initiator info */}
        <div className="p-3 bg-[var(--bg-surface)] rounded-[var(--radius-md)]">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={14} className="text-[var(--accent-blue)]" />
            <span className="font-medium text-sm text-[var(--text-primary)]">
              Initiator
            </span>
            <span className="ds-badge indigo text-[10px]">{initiatorInfo.type}</span>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {initiatorInfo.description}
          </p>
          {initiatorInfo.url && (
            <p className="text-[11px] text-[var(--text-tertiary)] font-mono mt-1 break-all">
              {initiatorInfo.url}
            </p>
          )}
        </div>

        {/* Call stack */}
        {initiatorInfo.stack && initiatorInfo.stack.length > 0 && (
          <Section
            title="Call Stack"
            icon={<Layers size={14} />}
            badge={initiatorInfo.stack.length}
            collapsed={collapsedSections.has('call-stack')}
            onToggle={() => toggleSection('call-stack')}
          >
            <StackTrace stack={initiatorInfo.stack} />
          </Section>
        )}

        {/* Security info */}
        <Section
          title="Security"
          icon={<Shield size={14} />}
          badge={securityInfo.isSecure ? undefined : '!'}
          badgeType={securityInfo.isSecure ? 'default' : 'warning'}
          collapsed={collapsedSections.has('security')}
          onToggle={() => toggleSection('security')}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              {securityInfo.isSecure ? (
                <>
                  <Lock size={14} className="text-emerald-500" />
                  <span className="text-[12px] text-emerald-500 font-medium">
                    Secure Connection
                  </span>
                </>
              ) : (
                <>
                  <Unlock size={14} className="text-amber-500" />
                  <span className="text-[12px] text-amber-500 font-medium">
                    Insecure Connection
                  </span>
                </>
              )}
            </div>

            <div className="ds-header-row">
              <span className="ds-header-name">Protocol</span>
              <span className="ds-header-value">{securityInfo.protocol}</span>
            </div>
            {securityInfo.keyExchange && (
              <div className="ds-header-row">
                <span className="ds-header-name">Key Exchange</span>
                <span className="ds-header-value">{securityInfo.keyExchange}</span>
              </div>
            )}
            {securityInfo.cipher && (
              <div className="ds-header-row">
                <span className="ds-header-name">Cipher</span>
                <span className="ds-header-value">{securityInfo.cipher}</span>
              </div>
            )}
            {securityInfo.subjectName && (
              <div className="ds-header-row">
                <span className="ds-header-name">Subject</span>
                <span className="ds-header-value">{securityInfo.subjectName}</span>
              </div>
            )}
          </div>
        </Section>
      </div>
    );
  };

  const renderInsights = () => {
    // Include JWT tokens in insights view
    const hasJwts = jwtTokens.length > 0;
    const hasInsights = insights.length > 0;

    if (!hasJwts && !hasInsights) {
      return (
        <EmptyState
          icon={<Sparkles size={32} />}
          title="No insights"
          description="Everything looks good!"
        />
      );
    }

    const errorInsights = insights.filter(i => i.type === 'error');
    const warningInsights = insights.filter(i => i.type === 'warning');
    const infoInsights = insights.filter(i => i.type === 'info');
    const successInsights = insights.filter(i => i.type === 'success');

    return (
      <div className="space-y-4">
        {/* Summary */}
        {hasInsights && (
          <div className="flex items-center gap-3 p-3 bg-[var(--bg-surface)] rounded-[var(--radius-md)]">
            <Zap size={16} className="text-[var(--accent-blue)]" />
            <span className="text-sm text-[var(--text-primary)]">
              {insights.length} insight{insights.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              {insightCounts.errors > 0 && (
                <span className="ds-badge rose text-[10px]">
                  {insightCounts.errors} error{insightCounts.errors !== 1 ? 's' : ''}
                </span>
              )}
              {insightCounts.warnings > 0 && (
                <span className="ds-badge amber text-[10px]">
                  {insightCounts.warnings} warning{insightCounts.warnings !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* JWT Tokens */}
        {hasJwts && (
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              JWT Tokens Detected
            </div>
            {jwtTokens.map((jwt, i) => (
              <JwtViewer key={i} jwt={jwt} />
            ))}
          </div>
        )}

        {/* Insights by severity */}
        {errorInsights.length > 0 && (
          <div className="space-y-2">
            {errorInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
        {warningInsights.length > 0 && (
          <div className="space-y-2">
            {warningInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
        {infoInsights.length > 0 && (
          <div className="space-y-2">
            {infoInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
        {successInsights.length > 0 && (
          <div className="space-y-2">
            {successInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Tab Configuration ─────────────────────────────────────────────────────

  const tabs: Array<{
    id: ExtendedDetailTab;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
    badgeType?: 'default' | 'warning' | 'error';
  }> = [
    { id: 'headers', label: 'Headers' },
    { id: 'payload', label: 'Payload' },
    { id: 'response', label: 'Response' },
    { id: 'timing', label: 'Timing' },
    {
      id: 'cookies',
      label: 'Cookies',
      badge: cookieCount > 0 ? cookieCount : undefined,
    },
    { id: 'initiator', label: 'Initiator' },
    {
      id: 'insights',
      label: 'Insights',
      icon: <Sparkles size={12} />,
      badge: insightCounts.errors > 0
        ? insightCounts.errors
        : insightCounts.warnings > 0
        ? insightCounts.warnings
        : insightCounts.total > 0
        ? insightCounts.total
        : undefined,
      badgeType: insightCounts.errors > 0
        ? 'error'
        : insightCounts.warnings > 0
        ? 'warning'
        : 'default',
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className={clsx(
        'absolute top-0 right-0 bottom-0',
        'bg-[var(--bg-base)] border-l border-[var(--border-default)]',
        'flex flex-col z-10 shadow-lg transition-all duration-200 outline-none',
        isExpanded ? 'w-full' : 'w-1/2 min-w-[420px] max-w-[600px]'
      )}
    >
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="ds-badge indigo font-mono text-[11px]">
              {request.method}
            </span>
            {request.statusCode && (
              <span className={clsx('ds-badge', getStatusClass(request.statusCode, request.status))}>
                {request.statusCode} {getStatusText(request.statusCode)}
              </span>
            )}
            {request.fromCache && (
              <span className="ds-badge gray text-[10px]">cached</span>
            )}
            {request.protocol && (
              <span className="ds-badge gray text-[10px]">{request.protocol}</span>
            )}
          </div>

          {/* URL */}
          <div
            className="font-mono text-[11px] text-[var(--text-tertiary)] break-all leading-relaxed"
            title={request.url}
          >
            {request.url}
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--text-tertiary)]">
            {request.duration !== undefined && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatTime(request.duration)}
              </span>
            )}
            {request.encodedSize !== undefined && (
              <span className="flex items-center gap-1">
                <Database size={10} />
                {formatSize(request.encodedSize)}
              </span>
            )}
            {request.type && (
              <span className="flex items-center gap-1">
                <FileJson size={10} />
                {request.type}
              </span>
            )}
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ds-icon-btn"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={onClose} className="ds-icon-btn" title="Close (Esc)">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ─── Search Bar ─────────────────────────────────────────────────────── */}
      {isSearchVisible && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
          <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search headers, body, cookies..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="ds-icon-btn"
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={() => {
              setIsSearchVisible(false);
              setSearchTerm('');
            }}
            className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            Close
          </button>
        </div>
      )}

      {/* ─── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-base)] border-b border-[var(--border-subtle)] overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'ds-tab flex items-center gap-1.5 whitespace-nowrap',
              activeTab === tab.id && 'active'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={clsx(
                  'ds-badge text-[9px]',
                  tab.badgeType === 'error' && 'rose',
                  tab.badgeType === 'warning' && 'amber',
                  (!tab.badgeType || tab.badgeType === 'default') && 'gray'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}

        {/* Search toggle */}
        <button
          onClick={() => setIsSearchVisible(true)}
          className="ds-icon-btn ml-auto"
          title="Search (⌘F)"
        >
          <Search size={14} />
        </button>
      </div>

      {/* ─── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Headers Tab */}
        {activeTab === 'headers' && (
          <div className="space-y-3">
            <Section
              title="General"
              icon={<Info size={14} />}
              collapsed={collapsedSections.has('general')}
              onToggle={() => toggleSection('general')}
            >
              {renderGeneralInfo()}
            </Section>

            <Section
              title="Response Headers"
              icon={<Server size={14} />}
              badge={request.responseHeaders?.length || 0}
              collapsed={collapsedSections.has('response-headers')}
              onToggle={() => toggleSection('response-headers')}
              actions={
                request.responseHeaders?.length ? (
                  <CopyButton
                    text={request.responseHeaders.map(h => `${h.name}: ${h.value}`).join('\n')}
                    title="Copy all"
                  />
                ) : undefined
              }
            >
              <HeadersList
                headers={request.responseHeaders}
                searchTerm={searchTerm}
                emptyText="No response headers"
              />
            </Section>

            <Section
              title="Request Headers"
              icon={<Globe size={14} />}
              badge={request.requestHeaders?.length || 0}
              collapsed={collapsedSections.has('request-headers')}
              onToggle={() => toggleSection('request-headers')}
              actions={
                request.requestHeaders?.length ? (
                  <CopyButton
                    text={request.requestHeaders.map(h => `${h.name}: ${h.value}`).join('\n')}
                    title="Copy all"
                  />
                ) : undefined
              }
            >
              <HeadersList
                headers={request.requestHeaders}
                searchTerm={searchTerm}
                emptyText="No request headers"
              />
            </Section>
          </div>
        )}

        {/* Payload Tab */}
        {activeTab === 'payload' && (
          <div className="space-y-3">
            <Section
              title="Query String Parameters"
              icon={<Hash size={14} />}
              badge={queryParams.length}
              collapsed={collapsedSections.has('query-params')}
              onToggle={() => toggleSection('query-params')}
              actions={
                queryParams.length > 0 ? (
                  <CopyButton
                    text={queryParams.map(p => `${p.name}=${p.value}`).join('&')}
                    title="Copy query string"
                  />
                ) : undefined
              }
            >
              {queryParams.length > 0 ? (
                <div className="space-y-0.5">
                  {queryParams.map((p, i) => (
                    <div key={`${p.name}-${i}`} className="ds-header-row">
                      <span className="ds-header-name">{p.name}</span>
                      <span className="ds-header-value break-all">{p.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[var(--text-tertiary)] italic text-sm py-2">
                  No query parameters
                </div>
              )}
            </Section>

            <Section
              title="Request Body"
              icon={<FileText size={14} />}
              collapsed={collapsedSections.has('request-body')}
              onToggle={() => toggleSection('request-body')}
              actions={
                request.postData ? (
                  <CopyButton text={request.postData} title="Copy body" />
                ) : undefined
              }
            >
              {request.postData ? (
                <CodeBlock
                  content={request.postData}
                  language={looksLikeJson(request.postData) ? 'json' : 'text'}
                  maxHeight={300}
                />
              ) : (
                <div className="text-[var(--text-tertiary)] italic text-sm py-2">
                  No request body
                </div>
              )}
            </Section>
          </div>
        )}

        {/* Response Tab */}
        {activeTab === 'response' && (
          <div className="space-y-3">
            {/* View toggle */}
            <div className="flex items-center gap-2 p-2 bg-[var(--bg-surface)] rounded-[var(--radius-md)]">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setResponseView('preview')}
                  className={clsx('ds-filter-tab', responseView === 'preview' && 'active')}
                >
                  <Eye size={12} />
                  Preview
                </button>
                <button
                  onClick={() => setResponseView('raw')}
                  className={clsx('ds-filter-tab', responseView === 'raw' && 'active')}
                >
                  <Code size={12} />
                  Raw
                </button>
              </div>

              <div className="ml-auto flex items-center gap-1">
                {responseBody?.body && (
                  <>
                    <CopyButton
                      text={responseBody.base64Encoded ? atob(responseBody.body) : responseBody.body}
                      title="Copy response"
                    />
                    <button
                      onClick={handleDownloadResponse}
                      className="ds-icon-btn"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={loadResponseBody}
                  className="ds-icon-btn"
                  title="Refresh"
                  disabled={isLoading}
                >
                  <RefreshCw size={14} className={clsx(isLoading && 'animate-spin')} />
                </button>
              </div>
            </div>

            {renderResponseBody()}

            {responseBody?.truncated && (
              <div className="flex items-center justify-center gap-2 text-[var(--text-tertiary)] text-sm py-3 border-t border-[var(--border-subtle)]">
                <AlertTriangle size={14} />
                Response truncated due to size
              </div>
            )}
          </div>
        )}

        {/* Timing Tab */}
        {activeTab === 'timing' && renderTiming()}

        {/* Cookies Tab */}
        {activeTab === 'cookies' && renderCookies()}

        {/* Initiator Tab */}
        {activeTab === 'initiator' && renderInitiator()}

        {/* Insights Tab */}
        {activeTab === 'insights' && renderInsights()}
      </div>

      {/* ─── Footer Actions ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-3 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)]">
        <button onClick={handleReplay} className="ds-btn primary">
          <Play size={14} />
          Replay
        </button>
        <button onClick={() => handleCopy(request.url, 'URL')} className="ds-btn">
          <Link size={14} />
          URL
        </button>
        <button onClick={() => handleCopy(generateCurl(request), 'cURL')} className="ds-btn">
          <Terminal size={14} />
          cURL
        </button>
        <button
          onClick={() => {
            const fetchCode = `fetch('${request.url}', ${JSON.stringify({
              method: request.method,
              headers: request.requestHeaders?.reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {}),
              body: request.postData || undefined,
            }, null, 2)})`;
            handleCopy(fetchCode, 'Fetch code');
          }}
          className="ds-btn"
          title="Copy as fetch()"
        >
          <Code size={14} />
          Fetch
        </button>
        <a
          href={request.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ds-btn ml-auto"
          title="Open in new tab"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* ─── Toast ──────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="ds-toast-container">
          <div className="ds-toast">{toastMessage}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'application/json': 'json',
    'text/html': 'html',
    'text/css': 'css',
    'text/javascript': 'js',
    'application/javascript': 'js',
    'text/plain': 'txt',
    'text/xml': 'xml',
    'application/xml': 'xml',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  
  for (const [mime, ext] of Object.entries(map)) {
    if (mimeType.includes(mime)) return ext;
  }
  return 'bin';
}

export default NetworkRequestDetails;