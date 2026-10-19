/**
 * Cookies tab: request cookies and Set-Cookie response cookies
 */

import { Cookie } from 'lucide-react';
import type { ParsedCookie } from '../utils';
import { Section, CookieCard, EmptyState } from '../components';
import type { SectionStateProps } from './types';

interface CookiesTabProps extends SectionStateProps {
  cookies: { request: ParsedCookie[]; response: ParsedCookie[] };
}

export function CookiesTab({ cookies, collapsedSections, toggleSection }: CookiesTabProps) {
  const cookieCount = cookies.request.length + cookies.response.length;

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
}
