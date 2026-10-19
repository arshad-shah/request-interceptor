/**
 * Card showing a parsed cookie and its attributes
 */

import { useState } from 'react';
import type { ParsedCookie } from '../utils';

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
