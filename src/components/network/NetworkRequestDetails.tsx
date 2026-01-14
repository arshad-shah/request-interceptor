/**
 * NetworkRequestDetails Component
 * Detail panel showing headers, payload, response, and timing for a selected request
 */

import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Play,
  Link,
  Terminal,
  ChevronDown,
} from 'lucide-react';
import type { NetworkRequest, ResponseBody, DetailTab, ResponseView } from '../../types/network';
import {
  getStatusClass,
  getStatusText,
  parseQueryParams,
  formatSize,
  formatTime,
  escapeHtml,
  syntaxHighlightJson,
  looksLikeJson,
  formatXml,
  calculateTimingPhases,
  generateCurl,
  copyToClipboard,
  getResponseBody,
  replayRequest,
  getCurrentTabId,
} from '../../lib/network-api';

interface NetworkRequestDetailsProps {
  request: NetworkRequest;
  responseBody: ResponseBody | null;
  onClose: () => void;
  onLoadResponseBody: (body: ResponseBody | null) => void;
}

export function NetworkRequestDetails({
  request,
  responseBody,
  onClose,
  onLoadResponseBody,
}: NetworkRequestDetailsProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('headers');
  const [responseView, setResponseView] = useState<ResponseView>('preview');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load response body when response tab is selected
  useEffect(() => {
    if (activeTab === 'response' && !responseBody) {
      loadResponseBody();
    }
  }, [activeTab, request.requestId]);

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
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(request.url);
    showToast(success ? 'URL copied to clipboard' : 'Failed to copy URL');
  };

  const handleCopyCurl = async () => {
    const curl = generateCurl(request);
    const success = await copyToClipboard(curl);
    showToast(success ? 'cURL command copied' : 'Failed to copy cURL');
  };

  const handleCopyResponse = async () => {
    if (!responseBody?.body) {
      showToast('No response body to copy');
      return;
    }
    let content = responseBody.body;
    if (responseBody.base64Encoded) {
      try {
        content = atob(content);
      } catch {
        showToast('Cannot copy binary content');
        return;
      }
    }
    const success = await copyToClipboard(content);
    showToast(success ? 'Response copied' : 'Failed to copy response');
  };

  const handleReplay = async () => {
    showToast('Replaying request...');
    try {
      const result = await replayRequest(request);
      if (result.error) {
        showToast(`Replay failed: ${result.error}`);
      } else {
        showToast(`Replay complete: ${result.status} ${result.statusText}`);
      }
    } catch {
      showToast('Replay failed');
    }
  };

  // Render general info
  const renderGeneralInfo = () => {
    const info = [
      { name: 'Request URL', value: request.url },
      { name: 'Request Method', value: request.method },
      {
        name: 'Status Code',
        value: request.statusCode
          ? `${request.statusCode} ${getStatusText(request.statusCode)}`
          : 'Pending',
      },
      { name: 'Remote Address', value: request.ip || request.remoteIPAddress || '-' },
    ];

    if (request.fromCache) {
      info.push({ name: 'Served From', value: 'Disk Cache' });
    }
    if (request.fromServiceWorker) {
      info.push({ name: 'Served From', value: 'Service Worker' });
    }
    if (request.mimeType) {
      info.push({ name: 'Content-Type', value: request.mimeType });
    }

    return info.map((item) => (
      <div key={item.name} className="ds-header-row">
        <span className="ds-header-name">{item.name}</span>
        <span className="ds-header-value">{escapeHtml(item.value)}</span>
      </div>
    ));
  };

  // Render headers section
  const renderHeaders = (headers: Array<{ name: string; value: string }> | undefined, emptyText: string) => {
    if (!headers || headers.length === 0) {
      return <div className="text-[var(--text-tertiary)] italic text-sm">{emptyText}</div>;
    }

    return headers.map((h, i) => (
      <div key={`${h.name}-${i}`} className="ds-header-row">
        <span className="ds-header-name">{escapeHtml(h.name)}</span>
        <span className="ds-header-value">{escapeHtml(h.value)}</span>
      </div>
    ));
  };

  // Render query parameters
  const renderQueryParams = () => {
    const params = parseQueryParams(request.query);
    if (params.length === 0) {
      return <div className="text-[var(--text-tertiary)] italic text-sm">No query parameters</div>;
    }

    return params.map((p, i) => (
      <div key={`${p.name}-${i}`} className="ds-header-row">
        <span className="ds-header-name">{escapeHtml(p.name)}</span>
        <span className="ds-header-value">{escapeHtml(p.value)}</span>
      </div>
    ));
  };

  // Render response body
  const renderResponseBody = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="ds-spinner" />
        </div>
      );
    }

    if (!responseBody?.body) {
      return (
        <div className="text-[var(--text-tertiary)] italic text-sm">
          No response body available
        </div>
      );
    }

    let content = responseBody.body;

    // Handle base64 encoded content
    if (responseBody.base64Encoded) {
      if (responseBody.mimeType?.startsWith('image/')) {
        return (
          <img
            src={`data:${responseBody.mimeType};base64,${content}`}
            alt="Response"
            className="max-w-full h-auto"
          />
        );
      }
      try {
        content = atob(content);
      } catch {
        return (
          <div className="text-[var(--text-tertiary)] italic text-sm">
            Binary content (base64 encoded)
          </div>
        );
      }
    }

    // Raw view
    if (responseView === 'raw') {
      return (
        <pre className="ds-code-block whitespace-pre-wrap break-all">
          {escapeHtml(content)}
        </pre>
      );
    }

    // Preview mode - format nicely
    const mimeType = responseBody.mimeType || request.mimeType || '';

    if (mimeType.includes('json') || looksLikeJson(content)) {
      try {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        return (
          <div
            className="ds-code-block"
            dangerouslySetInnerHTML={{ __html: syntaxHighlightJson(formatted) }}
          />
        );
      } catch {
        return (
          <pre className="ds-code-block whitespace-pre-wrap break-all">
            {escapeHtml(content)}
          </pre>
        );
      }
    }

    if (mimeType.includes('xml')) {
      return (
        <pre className="ds-code-block whitespace-pre-wrap break-all">
          {escapeHtml(formatXml(content))}
        </pre>
      );
    }

    return (
      <pre className="ds-code-block whitespace-pre-wrap break-all">
        {escapeHtml(content)}
      </pre>
    );
  };

  // Render timing
  const renderTiming = () => {
    const phases = calculateTimingPhases(request.timing, request.duration);

    if (phases.length === 0) {
      return (
        <div className="text-[var(--text-tertiary)] italic text-sm">
          No timing data available
        </div>
      );
    }

    const maxPhase = Math.max(...phases.map((p) => p.value), 1);

    return (
      <div className="space-y-3">
        {/* Timing Bars */}
        <div className="space-y-2">
          {phases.map((phase) => (
            <div key={phase.name} className="flex items-center gap-3">
              <span className="w-[120px] text-[11px] font-medium text-[var(--text-secondary)]">
                {phase.name}
              </span>
              <div className="flex-1 h-5 bg-[var(--bg-surface)] rounded-[var(--radius-sm)] overflow-hidden">
                <div
                  className={`h-full rounded-[var(--radius-sm)] flex items-center justify-end px-2
                    text-[10px] font-mono font-medium text-white min-w-[40px]
                    ${
                      phase.className === 'blocked'
                        ? 'bg-[var(--text-tertiary)]'
                        : phase.className === 'dns'
                        ? 'bg-[var(--accent-cyan)]'
                        : phase.className === 'connect'
                        ? 'bg-[var(--accent-violet)]'
                        : phase.className === 'ssl'
                        ? 'bg-[var(--accent-rose)]'
                        : phase.className === 'wait'
                        ? 'bg-[var(--accent-amber)]'
                        : 'bg-[var(--accent-emerald)]'
                    }
                  `}
                  style={{ width: `${(phase.value / maxPhase) * 100}%` }}
                >
                  {phase.value > maxPhase * 0.15 ? formatTime(phase.value) : ''}
                </div>
              </div>
              <span className="w-[70px] text-right font-mono text-[11px] text-[var(--text-secondary)]">
                {formatTime(phase.value)}
              </span>
            </div>
          ))}
        </div>

        {/* Timing Details */}
        <div className="ds-panel">
          <div className="ds-panel-body space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-tertiary)]">Total Duration</span>
              <span className="font-mono text-[var(--text-primary)]">
                {formatTime(request.duration)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-tertiary)]">Started At</span>
              <span className="font-mono text-[var(--text-primary)]">
                {request.startTime
                  ? new Date(request.startTime).toLocaleTimeString()
                  : '-'}
              </span>
            </div>
            {request.encodedSize && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">Transfer Size</span>
                <span className="font-mono text-[var(--text-primary)]">
                  {formatSize(request.encodedSize)}
                </span>
              </div>
            )}
            {request.fromCache && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">Served From</span>
                <span className="font-mono text-[var(--text-primary)]">Disk Cache</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="
        absolute top-0 right-0 bottom-0 w-1/2 min-w-[360px] max-w-[520px]
        bg-[var(--bg-base)] border-l border-[var(--border-default)]
        flex flex-col z-10 shadow-lg
      "
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="ds-badge indigo font-mono text-[11px]">
              {request.method}
            </span>
            {request.statusCode && (
              <span className={`ds-badge ${getStatusClass(request.statusCode, request.status)}`}>
                {request.statusCode}
              </span>
            )}
          </div>
          <span
            className="block font-mono text-[11px] text-[var(--text-tertiary)] break-all leading-relaxed"
            title={request.url}
          >
            {request.url}
          </span>
        </div>
        <button
          onClick={onClose}
          className="ds-icon-btn flex-shrink-0"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 bg-[var(--bg-base)] border-b border-[var(--border-subtle)]">
        {(['headers', 'payload', 'response', 'timing'] as DetailTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`ds-tab ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Headers Tab */}
        {activeTab === 'headers' && (
          <div className="space-y-3">
            {/* General */}
            <div className={`ds-section ${collapsedSections.has('general') ? 'collapsed' : ''}`}>
              <div
                className="ds-section-header"
                onClick={() => toggleSection('general')}
              >
                <span>General</span>
                <ChevronDown size={14} />
              </div>
              <div className="ds-section-content">{renderGeneralInfo()}</div>
            </div>

            {/* Response Headers */}
            <div className={`ds-section ${collapsedSections.has('response-headers') ? 'collapsed' : ''}`}>
              <div
                className="ds-section-header"
                onClick={() => toggleSection('response-headers')}
              >
                <span>Response Headers</span>
                <ChevronDown size={14} />
              </div>
              <div className="ds-section-content">
                {renderHeaders(request.responseHeaders, 'No response headers')}
              </div>
            </div>

            {/* Request Headers */}
            <div className={`ds-section ${collapsedSections.has('request-headers') ? 'collapsed' : ''}`}>
              <div
                className="ds-section-header"
                onClick={() => toggleSection('request-headers')}
              >
                <span>Request Headers</span>
                <ChevronDown size={14} />
              </div>
              <div className="ds-section-content">
                {renderHeaders(request.requestHeaders, 'No request headers')}
              </div>
            </div>
          </div>
        )}

        {/* Payload Tab */}
        {activeTab === 'payload' && (
          <div className="space-y-3">
            {/* Query Parameters */}
            <div className={`ds-section ${collapsedSections.has('query-params') ? 'collapsed' : ''}`}>
              <div
                className="ds-section-header"
                onClick={() => toggleSection('query-params')}
              >
                <span>Query Parameters</span>
                <ChevronDown size={14} />
              </div>
              <div className="ds-section-content">{renderQueryParams()}</div>
            </div>

            {/* Request Body */}
            <div className={`ds-section ${collapsedSections.has('request-body') ? 'collapsed' : ''}`}>
              <div
                className="ds-section-header"
                onClick={() => toggleSection('request-body')}
              >
                <span>Request Body</span>
                <ChevronDown size={14} />
              </div>
              <div className="ds-section-content">
                {request.postData ? (
                  <pre className="ds-code-block whitespace-pre-wrap break-all">
                    {escapeHtml(request.postData)}
                  </pre>
                ) : (
                  <div className="text-[var(--text-tertiary)] italic text-sm">
                    No request body
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Response Tab */}
        {activeTab === 'response' && (
          <div className="space-y-3">
            {/* View Toggle */}
            <div className="flex items-center gap-1 p-2 bg-[var(--bg-surface)] rounded-[var(--radius-md)]">
              <button
                onClick={() => setResponseView('preview')}
                className={`ds-filter-tab ${responseView === 'preview' ? 'active' : ''}`}
              >
                Preview
              </button>
              <button
                onClick={() => setResponseView('raw')}
                className={`ds-filter-tab ${responseView === 'raw' ? 'active' : ''}`}
              >
                Raw
              </button>
              <button
                onClick={handleCopyResponse}
                className="ds-icon-btn ml-auto"
                title="Copy Response"
              >
                <Copy size={14} />
              </button>
            </div>

            {renderResponseBody()}

            {responseBody?.truncated && (
              <div className="text-[var(--text-tertiary)] italic text-sm text-center pt-3 border-t border-[var(--border-subtle)]">
                Response truncated due to size
              </div>
            )}
          </div>
        )}

        {/* Timing Tab */}
        {activeTab === 'timing' && renderTiming()}
      </div>

      {/* Footer Actions */}
      <div className="flex gap-2 p-3 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)]">
        <button onClick={handleReplay} className="ds-btn primary">
          <Play size={14} />
          Replay
        </button>
        <button onClick={handleCopyUrl} className="ds-btn">
          <Link size={14} />
          Copy URL
        </button>
        <button onClick={handleCopyCurl} className="ds-btn">
          <Terminal size={14} />
          Copy cURL
        </button>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="ds-toast-container">
          <div className="ds-toast">{toastMessage}</div>
        </div>
      )}
    </div>
  );
}

export default NetworkRequestDetails;
