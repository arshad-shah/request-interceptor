/**
 * NetworkRequestDetails Component - Enhanced Version
 * Professional-grade detail panel with intelligent analysis, search, and advanced features
 * Inspired by Chrome DevTools Network panel
 *
 * This container owns all panel state (so it survives tab switches) and delegates
 * rendering of each tab to the components in this folder.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { NetworkRequest, ResponseBody, ResponseView, WebSocketFrame } from '../../../types/network';
import { copyToClipboard, getResponseBody, getCurrentTabId } from '../../../lib/network-api';
import { parseCookies, analyzePerformance, type ExtendedDetailTab } from '../utils';
import { DetailsHeader } from './DetailsHeader';
import { DetailsSearchBar } from './DetailsSearchBar';
import { DetailsTabBar } from './DetailsTabBar';
import { DetailsFooter } from './DetailsFooter';
import { HeadersTab } from './HeadersTab';
import { PayloadTab, type BodyView } from './PayloadTab';
import { ResponseTab } from './ResponseTab';
import { TimingTab } from './TimingTab';
import { CookiesTab } from './CookiesTab';
import { InitiatorTab } from './InitiatorTab';
import { InsightsTab } from './InsightsTab';
import { MessagesTab, type WsDirectionFilter } from './MessagesTab';

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
  const [bodyView, setBodyView] = useState<BodyView>('parsed');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [wsFilter, setWsFilter] = useState<WsDirectionFilter>('all');
  const [wsSearch, setWsSearch] = useState('');
  const [selectedFrame, setSelectedFrame] = useState<WebSocketFrame | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Memoized Data ─────────────────────────────────────────────────────────
  const cookies = useMemo(
    () => parseCookies(request.requestHeaders, request.responseHeaders),
    [request.requestHeaders, request.responseHeaders]
  );

  const insights = useMemo(
    () => analyzePerformance(request, responseBody),
    [request, responseBody]
  );

  // Tab badge counts
  const cookieCount = cookies.request.length + cookies.response.length;
  const insightCounts = useMemo(() => ({
    total: insights.length,
    errors: insights.filter(i => i.type === 'error').length,
    warnings: insights.filter(i => i.type === 'warning').length,
  }), [insights]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

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

  const handleCopy = useCallback(async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    showToast(success ? `${label} copied` : `Failed to copy`);
  }, [showToast]);

  const closeSearch = () => {
    setIsSearchVisible(false);
    setSearchTerm('');
  };

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Latest values read by the auto-load effect below. That effect must only re-run
  // when the tab or request changes, not whenever the loading state flips.
  const autoLoadRef = useRef({ responseBody, isLoading, onLoadResponseBody, loadResponseBody });
  useEffect(() => {
    autoLoadRef.current = { responseBody, isLoading, onLoadResponseBody, loadResponseBody };
  });

  // Load response body when response tab is selected
  useEffect(() => {
    const latest = autoLoadRef.current;
    if (activeTab === 'response' && !latest.responseBody && !latest.isLoading) {
      // First check if request already has response body embedded
      if (request.responseBody?.body) {
        latest.onLoadResponseBody(request.responseBody);
      } else {
        latest.loadResponseBody();
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

  // ─── Render ────────────────────────────────────────────────────────────────

  const sectionState = { collapsedSections, toggleSection };

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className="h-full w-full bg-[var(--bg-base)] flex flex-col outline-none overflow-hidden"
    >
      <DetailsHeader request={request} onClose={onClose} />

      {isSearchVisible && (
        <DetailsSearchBar
          searchInputRef={searchInputRef}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onClose={closeSearch}
        />
      )}

      <DetailsTabBar
        request={request}
        cookieCount={cookieCount}
        insightCounts={insightCounts}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSearch={() => setIsSearchVisible(true)}
      />

      {/* ─── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-[var(--border-default)] scrollbar-track-transparent">
        {activeTab === 'headers' && (
          <HeadersTab request={request} searchTerm={searchTerm} {...sectionState} />
        )}

        {activeTab === 'payload' && (
          <PayloadTab
            request={request}
            bodyView={bodyView}
            setBodyView={setBodyView}
            {...sectionState}
          />
        )}

        {activeTab === 'response' && (
          <ResponseTab
            request={request}
            responseBody={responseBody}
            responseView={responseView}
            setResponseView={setResponseView}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onRefresh={loadResponseBody}
            showToast={showToast}
          />
        )}

        {activeTab === 'timing' && <TimingTab request={request} />}

        {activeTab === 'cookies' && <CookiesTab cookies={cookies} {...sectionState} />}

        {activeTab === 'initiator' && <InitiatorTab request={request} {...sectionState} />}

        {activeTab === 'insights' && (
          <InsightsTab request={request} insights={insights} insightCounts={insightCounts} />
        )}

        {activeTab === 'messages' && (
          <MessagesTab
            request={request}
            wsFilter={wsFilter}
            setWsFilter={setWsFilter}
            wsSearch={wsSearch}
            setWsSearch={setWsSearch}
            selectedFrame={selectedFrame}
            setSelectedFrame={setSelectedFrame}
            handleCopy={handleCopy}
          />
        )}
      </div>

      <DetailsFooter request={request} showToast={showToast} handleCopy={handleCopy} />

      {/* ─── Toast ──────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="ds-toast-container">
          <div className="ds-toast">{toastMessage}</div>
        </div>
      )}
    </div>
  );
}

export default NetworkRequestDetails;
