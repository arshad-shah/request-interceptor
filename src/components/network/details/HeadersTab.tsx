/**
 * Headers tab: general request info plus request/response headers
 */

import { clsx } from 'clsx';
import { Info, Server, Globe } from 'lucide-react';
import type { NetworkRequest } from '../../../types/network';
import { getStatusText, formatSize } from '../../../lib/network-api';
import { Section, HeadersList, CopyButton } from '../components';
import type { SectionStateProps } from './types';

interface HeadersTabProps extends SectionStateProps {
  request: NetworkRequest;
  searchTerm: string;
}

function GeneralInfo({ request }: { request: NetworkRequest }) {
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
}

export function HeadersTab({
  request,
  searchTerm,
  collapsedSections,
  toggleSection,
}: HeadersTabProps) {
  return (
    <div className="space-y-3">
      <Section
        title="General"
        icon={<Info size={14} />}
        collapsed={collapsedSections.has('general')}
        onToggle={() => toggleSection('general')}
      >
        <GeneralInfo request={request} />
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
  );
}
