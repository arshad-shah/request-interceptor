/**
 * Response tab: preview/raw response body with copy, download and refresh
 */

import { clsx } from 'clsx';
import {
  Eye,
  Code,
  Download,
  RefreshCw,
  AlertTriangle,
  FileText,
  Database,
} from 'lucide-react';
import type { NetworkRequest, ResponseBody, ResponseView } from '../../../types/network';
import { formatSize, looksLikeJson } from '../../../lib/network-api';
import { getLanguageFromMime } from '../utils';
import { CodeBlock, CopyButton, EmptyState } from '../components';
import type { ShowToast } from './types';

interface ResponseBodyViewProps {
  request: NetworkRequest;
  responseBody: ResponseBody | null;
  responseView: ResponseView;
  isLoading: boolean;
  searchTerm: string;
}

function ResponseBodyView({
  request,
  responseBody,
  responseView,
  isLoading,
  searchTerm,
}: ResponseBodyViewProps) {
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
}

interface ResponseTabProps extends ResponseBodyViewProps {
  setResponseView: (view: ResponseView) => void;
  onRefresh: () => void;
  showToast: ShowToast;
}

export function ResponseTab({
  request,
  responseBody,
  responseView,
  setResponseView,
  isLoading,
  searchTerm,
  onRefresh,
  showToast,
}: ResponseTabProps) {
  const handleDownloadResponse = () => {
    const body = responseBody || request.responseBody;
    if (!body?.body) {
      showToast('No response to download');
      return;
    }

    try {
      let content = body.body;
      const mimeType = body.mimeType || 'application/octet-stream';

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

  return (
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
            onClick={onRefresh}
            className="ds-icon-btn"
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={clsx(isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <ResponseBodyView
        request={request}
        responseBody={responseBody}
        responseView={responseView}
        isLoading={isLoading}
        searchTerm={searchTerm}
      />

      {responseBody?.truncated && (
        <div className="flex items-center justify-center gap-2 text-[var(--text-tertiary)] text-sm py-3 border-t border-[var(--border-subtle)]">
          <AlertTriangle size={14} />
          Response truncated due to size
        </div>
      )}
    </div>
  );
}

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
