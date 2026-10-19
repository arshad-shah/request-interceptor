/**
 * Initiator tab: what triggered the request, its call stack and connection security
 */

import { useMemo } from 'react';
import { Globe, Layers, Shield, Lock, Unlock } from 'lucide-react';
import type { NetworkRequest } from '../../../types/network';
import { getInitiatorInfo, extractSecurityInfo } from '../utils';
import { Section, StackTrace } from '../components';
import type { SectionStateProps } from './types';

interface InitiatorTabProps extends SectionStateProps {
  request: NetworkRequest;
}

export function InitiatorTab({ request, collapsedSections, toggleSection }: InitiatorTabProps) {
  const initiatorInfo = useMemo(
    () => getInitiatorInfo(request),
    [request]
  );

  const securityInfo = useMemo(
    () => extractSecurityInfo(request),
    [request]
  );

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
}
