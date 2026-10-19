/**
 * Insights tab: detected JWTs and performance/security insights by severity
 */

import { useMemo } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import type { NetworkRequest } from '../../../types/network';
import { findJwtTokens, type PerformanceInsight } from '../utils';
import { InsightCard, JwtViewer, EmptyState } from '../components';
import type { InsightCounts } from './types';

interface InsightsTabProps {
  request: NetworkRequest;
  insights: PerformanceInsight[];
  insightCounts: InsightCounts;
}

export function InsightsTab({ request, insights, insightCounts }: InsightsTabProps) {
  const jwtTokens = useMemo(
    () => findJwtTokens(request),
    [request]
  );

  // Include JWT tokens in insights view
  const hasJwts = jwtTokens.length > 0;
  const hasInsights = insights.length > 0;

  if (!hasJwts && !hasInsights) {
    return (
      <EmptyState
        icon={<Sparkles size={32} />}
        title="No insights"
        description="Everything looks good!"
      />
    );
  }

  const errorInsights = insights.filter(i => i.type === 'error');
  const warningInsights = insights.filter(i => i.type === 'warning');
  const infoInsights = insights.filter(i => i.type === 'info');
  const successInsights = insights.filter(i => i.type === 'success');

  return (
    <div className="space-y-4">
      {/* Summary */}
      {hasInsights && (
        <div className="flex items-center gap-3 p-3 bg-[var(--bg-surface)] rounded-[var(--radius-md)]">
          <Zap size={16} className="text-[var(--accent-blue)]" />
          <span className="text-sm text-[var(--text-primary)]">
            {insights.length} insight{insights.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {insightCounts.errors > 0 && (
              <span className="ds-badge rose text-[10px]">
                {insightCounts.errors} error{insightCounts.errors !== 1 ? 's' : ''}
              </span>
            )}
            {insightCounts.warnings > 0 && (
              <span className="ds-badge amber text-[10px]">
                {insightCounts.warnings} warning{insightCounts.warnings !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* JWT Tokens */}
      {hasJwts && (
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
            JWT Tokens Detected
          </div>
          {jwtTokens.map((jwt, i) => (
            <JwtViewer key={i} jwt={jwt} />
          ))}
        </div>
      )}

      {/* Insights by severity */}
      {errorInsights.length > 0 && (
        <div className="space-y-2">
          {errorInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
      {warningInsights.length > 0 && (
        <div className="space-y-2">
          {warningInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
      {infoInsights.length > 0 && (
        <div className="space-y-2">
          {infoInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
      {successInsights.length > 0 && (
        <div className="space-y-2">
          {successInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
