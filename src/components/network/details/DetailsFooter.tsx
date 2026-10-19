/**
 * Details panel footer actions: replay, copy URL / cURL / fetch, open in tab
 */

import { Play, Link, Terminal, Code, ExternalLink } from 'lucide-react';
import type { NetworkRequest } from '../../../types/network';
import { replayRequest } from '../../../lib/network-api';
import { generateCurlCommand, generateFetchSnippet } from '../utils';
import type { CopyHandler, ShowToast } from './types';

interface DetailsFooterProps {
  request: NetworkRequest;
  showToast: ShowToast;
  handleCopy: CopyHandler;
}

export function DetailsFooter({ request, showToast, handleCopy }: DetailsFooterProps) {
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

  return (
    <div className="flex items-center gap-2 p-3 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)]">
      <button onClick={handleReplay} className="ds-btn primary">
        <Play size={14} />
        Replay
      </button>
      <button onClick={() => handleCopy(request.url, 'URL')} className="ds-btn">
        <Link size={14} />
        URL
      </button>
      <button onClick={() => handleCopy(generateCurlCommand(request), 'cURL')} className="ds-btn">
        <Terminal size={14} />
        cURL
      </button>
      <button
        onClick={() => handleCopy(generateFetchSnippet(request), 'Fetch code')}
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
  );
}
