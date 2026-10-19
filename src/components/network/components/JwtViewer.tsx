/**
 * Expandable viewer for a decoded JWT
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, Clock, Key } from 'lucide-react';
import type { DecodedJwt } from '../utils';
import { CopyButton } from './CopyButton';
import { CodeBlock } from './CodeBlock';

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
