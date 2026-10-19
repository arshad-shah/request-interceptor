/**
 * Card describing a single performance/security insight
 */

import { clsx } from 'clsx';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Shield,
  Database,
  AlertCircle,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { PerformanceInsight } from '../utils';

interface InsightCardProps {
  insight: PerformanceInsight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const icons = {
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
  };

  const categoryIcons = {
    performance: <Zap size={12} />,
    security: <Shield size={12} />,
    caching: <Database size={12} />,
    compression: <Layers size={12} />,
    'best-practice': <Sparkles size={12} />,
  };

  const colors = {
    error: {
      bg: 'bg-rose-500/5',
      border: 'border-rose-500/20',
      icon: 'bg-rose-500/10 text-rose-500',
    },
    warning: {
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/20',
      icon: 'bg-amber-500/10 text-amber-500',
    },
    success: {
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/20',
      icon: 'bg-emerald-500/10 text-emerald-500',
    },
    info: {
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/20',
      icon: 'bg-blue-500/10 text-blue-500',
    },
  };

  const color = colors[insight.type];

  return (
    <div className={clsx('p-3 rounded-[var(--radius-md)] border', color.bg, color.border)}>
      <div className="flex items-start gap-3">
        <div className={clsx('flex-shrink-0 p-1.5 rounded-[var(--radius-sm)]', color.icon)}>
          {icons[insight.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-[var(--text-primary)] text-sm">
              {insight.title}
            </span>
            <span className="ds-badge gray text-[10px] flex items-center gap-1">
              {categoryIcons[insight.category]}
              {insight.category}
            </span>
            {insight.metric && (
              <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                {insight.metric}
              </span>
            )}
          </div>
          <p className="text-[var(--text-secondary)] text-[12px] leading-relaxed">
            {insight.description}
          </p>
          {insight.suggestion && (
            <p className="text-[var(--text-tertiary)] text-[11px] mt-1.5 flex items-start gap-1">
              <Sparkles size={10} className="mt-0.5 flex-shrink-0" />
              <span>{insight.suggestion}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
