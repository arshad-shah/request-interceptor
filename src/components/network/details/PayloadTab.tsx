/**
 * Payload tab: query string parameters and the request body
 */

import { useMemo } from 'react';
import { clsx } from 'clsx';
import { Hash, FileText } from 'lucide-react';
import type { NetworkRequest } from '../../../types/network';
import { parseQueryParams, looksLikeJson } from '../../../lib/network-api';
import { parseRequestBody, getBodyTypeLabel, type ParsedFormField } from '../utils';
import { Section, CodeBlock, CopyButton } from '../components';
import type { SectionStateProps } from './types';

export type BodyView = 'parsed' | 'raw';

interface PayloadTabProps extends SectionStateProps {
  request: NetworkRequest;
  bodyView: BodyView;
  setBodyView: (view: BodyView) => void;
}

export function PayloadTab({
  request,
  bodyView,
  setBodyView,
  collapsedSections,
  toggleSection,
}: PayloadTabProps) {
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

  return (
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
  );
}
