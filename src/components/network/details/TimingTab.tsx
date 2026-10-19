/**
 * Timing tab: waterfall, phase breakdown and summary stats
 */

import { useMemo } from 'react';
import { Clock, Zap, Database, FileJson } from 'lucide-react';
import type { NetworkRequest } from '../../../types/network';
import { calculateTimingPhases, formatSize, formatTime } from '../../../lib/network-api';
import { TimingBar, WaterfallChart, EmptyState, StatCard } from '../components';

const TIMING_COLORS: Record<string, string> = {
  blocked: '#6b7280',  // gray
  dns: '#06b6d4',      // cyan
  connect: '#8b5cf6',  // violet
  ssl: '#f43f5e',      // rose
  send: '#3b82f6',     // blue
  wait: '#f59e0b',     // amber
  receive: '#10b981',  // emerald
};

export function TimingTab({ request }: { request: NetworkRequest }) {
  const timingPhases = useMemo(
    () => calculateTimingPhases(request.timing, request.duration),
    [request.timing, request.duration]
  );

  if (timingPhases.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={32} />}
        title="No timing data"
        description="Timing information not available"
      />
    );
  }

  const maxPhase = Math.max(...timingPhases.map(p => p.value), 1);
  const totalTime = timingPhases.reduce((sum, p) => sum + p.value, 0);

  // Prepare waterfall data
  const waterfallPhases = timingPhases.map(p => ({
    name: p.name,
    value: p.value,
    color: TIMING_COLORS[p.className] || TIMING_COLORS.receive,
  }));

  return (
    <div className="space-y-4">
      {/* Waterfall visualization */}
      <WaterfallChart phases={waterfallPhases} totalTime={totalTime} />

      {/* Phase breakdown */}
      <div className="space-y-2">
        {timingPhases.map(phase => (
          <TimingBar
            key={phase.name}
            name={phase.name}
            value={phase.value}
            maxValue={maxPhase}
            color={TIMING_COLORS[phase.className] || TIMING_COLORS.receive}
            formatValue={formatTime}
          />
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Duration"
          value={formatTime(request.duration || 0)}
          icon={<Clock size={10} />}
        />
        <StatCard
          label="Started At"
          value={
            request.startTime
              ? new Date(request.startTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '—'
          }
          icon={<Zap size={10} />}
        />
        {request.encodedSize !== undefined && (
          <StatCard
            label="Transfer Size"
            value={formatSize(request.encodedSize)}
            icon={<Database size={10} />}
          />
        )}
        {request.size !== undefined && request.size !== request.encodedSize && (
          <StatCard
            label="Resource Size"
            value={formatSize(request.size)}
            icon={<FileJson size={10} />}
          />
        )}
      </div>
    </div>
  );
}
