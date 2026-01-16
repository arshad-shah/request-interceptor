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
  ArrowUp,
  ArrowDown,
  MessageSquare,
} from 'lucide-react';
import type { NetworkRequest, ResponseBody, ResponseView, WebSocketFrame } from '../../types/network';
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
  parseRequestBody,
  getBodyTypeLabel,
  type ExtendedDetailTab,
  type ParsedFormField,
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
  const [bodyView, setBodyView] = useState<'parsed' | 'raw'>('parsed');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [wsFilter, setWsFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [wsSearch, setWsSearch] = useState('');
  const [selectedFrame, setSelectedFrame] = useState<WebSocketFrame | null>(null);
  
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

  const parsedBody = useMemo(() => {
    if (!request.postData) return null;
    const contentType = request.requestHeaders?.find(
      h => h.name.toLowerCase() === 'content-type'
    )?.value;
    return parseRequestBody(request.postData, contentType);
  }, [request.postData, request.requestHeaders]);

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
      // First check if request already has response body embedded
      if (request.responseBody?.body) {
        onLoadResponseBody(request.responseBody);
      } else {
        loadResponseBody();
      }
    }
  }, [activeTab, request.requestId, request.responseBody]);

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
    const body = responseBody || request.responseBody;
    if (!body?.body) {
      showToast('No response to download');
      return;
    }

    try {
      let content = body.body;
      let mimeType = body.mimeType || 'application/octet-stream';

      if (body.base64Encoded) {
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

    // WebSocket specific info
    if (request.type === 'websocket') {
      if (request.wsFramesSent !== undefined) {
        items.push({ label: 'Frames Sent', value: `${request.wsFramesSent} (${formatSize(request.wsSentSize || 0)})` });
      }
      if (request.wsFramesReceived !== undefined) {
        items.push({ label: 'Frames Received', value: `${request.wsFramesReceived} (${formatSize(request.wsReceivedSize || 0)})` });
      }
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

    // Use responseBody prop or fall back to request's embedded responseBody
    const body = responseBody || request.responseBody;

    if (!body?.body) {
      return (
        <EmptyState
          icon={<FileText size={32} />}
          title="No response body"
          description="Response body is empty or not available"
        />
      );
    }

    let content = body.body;
    const mimeType = body.mimeType || request.mimeType || '';

    // Handle base64 encoded content
    if (body.base64Encoded) {
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

  // ─── WebSocket Messages ────────────────────────────────────────────────────
  
  const filteredFrames = useMemo(() => {
    if (!request.wsFrames) return [];
    
    let frames = request.wsFrames;
    
    // Filter by direction
    if (wsFilter !== 'all') {
      frames = frames.filter(f => f.type === wsFilter);
    }
    
    // Filter by search
    if (wsSearch) {
      const search = wsSearch.toLowerCase();
      frames = frames.filter(f => f.data.toLowerCase().includes(search));
    }
    
    return frames;
  }, [request.wsFrames, wsFilter, wsSearch]);

  const renderMessages = () => {
    const frames = request.wsFrames || [];
    
    if (frames.length === 0) {
      return (
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="No messages yet"
          description="WebSocket messages will appear here once sent or received"
        />
      );
    }

    const formatFrameTime = (timestamp: number) => {
      const date = new Date(timestamp);
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      const s = String(date.getSeconds()).padStart(2, '0');
      const ms = String(date.getMilliseconds()).padStart(3, '0');
      return `${h}:${m}:${s}.${ms}`;
    };

    const formatFrameData = (data: string) => {
      // Try to parse as JSON for pretty display
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return data;
      }
    };

    const isJson = (data: string) => {
      try {
        JSON.parse(data);
        return true;
      } catch {
        return false;
      }
    };

    return (
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex-shrink-0">
          {/* Direction filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWsFilter('all')}
              className={clsx('ds-filter-tab', wsFilter === 'all' && 'active')}
            >
              All
              <span className="ds-badge gray text-[9px] ml-1">{frames.length}</span>
            </button>
            <button
              onClick={() => setWsFilter('sent')}
              className={clsx('ds-filter-tab', wsFilter === 'sent' && 'active')}
            >
              <ArrowUp size={10} className="text-emerald-500" />
              Sent
              <span className="ds-badge gray text-[9px] ml-1">
                {frames.filter(f => f.type === 'sent').length}
              </span>
            </button>
            <button
              onClick={() => setWsFilter('received')}
              className={clsx('ds-filter-tab', wsFilter === 'received' && 'active')}
            >
              <ArrowDown size={10} className="text-rose-500" />
              Received
              <span className="ds-badge gray text-[9px] ml-1">
                {frames.filter(f => f.type === 'received').length}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 flex items-center gap-2 px-2 py-1 bg-[var(--bg-base)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
            <Search size={12} className="text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={wsSearch}
              onChange={e => setWsSearch(e.target.value)}
              placeholder="Filter messages..."
              className="flex-1 bg-transparent border-none outline-none text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            {wsSearch && (
              <button onClick={() => setWsSearch('')} className="ds-icon-btn p-0.5">
                <X size={10} />
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-2">
            <span className="flex items-center gap-1">
              <ArrowUp size={10} className="text-emerald-500" />
              {formatSize(request.wsSentSize || 0)}
            </span>
            <span className="flex items-center gap-1">
              <ArrowDown size={10} className="text-rose-500" />
              {formatSize(request.wsReceivedSize || 0)}
            </span>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 flex overflow-hidden">
          {/* Message list */}
          <div className="flex-1 overflow-y-auto min-w-0">
            {filteredFrames.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] text-sm">
                No messages match your filter
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {filteredFrames.map((frame, index) => {
                  const isSent = frame.type === 'sent';
                  const isSelected = selectedFrame === frame;
                  
                  return (
                    <div
                      key={`${frame.timestamp}-${index}`}
                      onClick={() => setSelectedFrame(isSelected ? null : frame)}
                      className={clsx(
                        'flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors',
                        'hover:bg-[var(--bg-elevated)]',
                        isSelected && 'bg-[var(--accent-indigo)]/10 border-l-2 border-l-[var(--accent-indigo)]',
                        isSent ? 'bg-emerald-500/5' : 'bg-rose-500/5'
                      )}
                    >
                      {/* Direction icon */}
                      <div className={clsx(
                        'flex-shrink-0 p-1 rounded',
                        isSent ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                      )}>
                        {isSent ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                            {formatFrameTime(frame.timestamp)}
                          </span>
                          <span className={clsx(
                            'ds-badge text-[9px]',
                            frame.opcode === 1 ? 'blue' : 'violet'
                          )}>
                            {frame.opcode === 1 ? 'text' : 'binary'}
                          </span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {formatSize(frame.length)}
                          </span>
                          {isJson(frame.data) && (
                            <span className="ds-badge amber text-[9px]">JSON</span>
                          )}
                        </div>
                        <div className={clsx(
                          'font-mono text-[11px] break-all',
                          isSent ? 'text-emerald-400' : 'text-rose-400',
                          !isSelected && 'line-clamp-2'
                        )}>
                          {isSelected ? formatFrameData(frame.data) : frame.data}
                        </div>
                      </div>

                      {/* Copy button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(frame.data, 'Message');
                        }}
                        className="ds-icon-btn flex-shrink-0 opacity-0 group-hover:opacity-100"
                        title="Copy message"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected frame detail panel */}
          {selectedFrame && (
            <div className="w-1/2 border-l border-[var(--border-subtle)] flex flex-col bg-[var(--bg-base)]">
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'ds-badge',
                    selectedFrame.type === 'sent' ? 'emerald' : 'rose'
                  )}>
                    {selectedFrame.type === 'sent' ? 'Sent' : 'Received'}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
                    {formatFrameTime(selectedFrame.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CopyButton text={selectedFrame.data} title="Copy" />
                  <button
                    onClick={() => setSelectedFrame(null)}
                    className="ds-icon-btn"
                    title="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-3">
                <CodeBlock
                  content={formatFrameData(selectedFrame.data)}
                  language={isJson(selectedFrame.data) ? 'json' : 'text'}
                  maxHeight={400}
                />
              </div>
            </div>
          )}
        </div>
      </div>
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

  const wsFrameCount = request.wsFrames?.length || 0;
  
  const isWebSocket = request.type === 'websocket';
  
  const tabs: Array<{
    id: ExtendedDetailTab;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
    badgeType?: 'default' | 'warning' | 'error';
  }> = [
    { id: 'headers', label: 'Headers' },
    // For WebSocket: show Messages tab; For HTTP: show Payload tab
    ...(isWebSocket ? [{
      id: 'messages' as ExtendedDetailTab,
      label: 'Messages',
      badge: wsFrameCount > 0 ? wsFrameCount : undefined,
    }] : [{ id: 'payload' as ExtendedDetailTab, label: 'Payload' }]),
    // Hide Response tab for WebSocket requests
    ...(!isWebSocket ? [{ id: 'response' as ExtendedDetailTab, label: 'Response' }] : []),
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
      className="h-full w-full bg-[var(--bg-base)] flex flex-col outline-none overflow-hidden"
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
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-[var(--border-default)] scrollbar-track-transparent">
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
                  <div className="flex items-center gap-2">
                    {parsedBody && parsedBody.type !== 'text' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setBodyView('parsed')}
                          className={clsx('ds-filter-tab text-[10px]', bodyView === 'parsed' && 'active')}
                        >
                          Parsed
                        </button>
                        <button
                          onClick={() => setBodyView('raw')}
                          className={clsx('ds-filter-tab text-[10px]', bodyView === 'raw' && 'active')}
                        >
                          Raw
                        </button>
                      </div>
                    )}
                    <CopyButton text={request.postData} title="Copy body" />
                  </div>
                ) : undefined
              }
            >
              {request.postData ? (
                <>
                  {/* Parsed View */}
                  {bodyView === 'parsed' && parsedBody && parsedBody.type !== 'text' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] mb-2">
                        <span className="ds-badge gray">{getBodyTypeLabel(parsedBody.type)}</span>
                        {parsedBody.type === 'form-data' && Array.isArray(parsedBody.parsed) && (
                          <span>{parsedBody.parsed.length} fields</span>
                        )}
                        {parsedBody.type === 'url-encoded' && Array.isArray(parsedBody.parsed) && (
                          <span>{parsedBody.parsed.length} parameters</span>
                        )}
                      </div>
                      
                      {parsedBody.type === 'json' && parsedBody.parsed && (
                        <CodeBlock
                          content={JSON.stringify(parsedBody.parsed, null, 2)}
                          language="json"
                          maxHeight={300}
                        />
                      )}
                      
                      {(parsedBody.type === 'form-data' || parsedBody.type === 'url-encoded') && 
                        Array.isArray(parsedBody.parsed) && (
                        <div className="ds-header-group">
                          {(parsedBody.parsed as ParsedFormField[]).map((field, i) => (
                            <div key={`${field.name}-${i}`} className="ds-header-row">
                              <span className="ds-header-name flex items-center gap-1.5">
                                {field.name}
                                {field.isFile && (
                                  <span className="ds-badge violet text-[9px]">file</span>
                                )}
                              </span>
                              <span className="ds-header-value break-all">
                                {field.value}
                                {field.contentType && (
                                  <span className="text-[var(--text-tertiary)] text-[10px] ml-2">
                                    ({field.contentType})
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Raw View */
                    <CodeBlock
                      content={request.postData}
                      language={looksLikeJson(request.postData) ? 'json' : 'text'}
                      maxHeight={300}
                    />
                  )}
                </>
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
                {(responseBody?.body || request.responseBody?.body) && (
                  <>
                    <CopyButton
                      text={(() => {
                        const b = responseBody || request.responseBody;
                        return b?.base64Encoded ? atob(b.body) : (b?.body || '');
                      })()}
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

        {/* WebSocket Messages Tab */}
        {activeTab === 'messages' && renderMessages()}
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