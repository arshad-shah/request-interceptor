/**
 * Stacked timeline of request timing phases
 */

interface WaterfallPhase {
  name: string;
  value: number;
  color: string;
}

interface WaterfallChartProps {
  phases: WaterfallPhase[];
  totalTime: number;
}

export function WaterfallChart({ phases, totalTime }: WaterfallChartProps) {
  if (phases.length === 0 || totalTime === 0) return null;

  return (
    <div className="p-3 bg-[var(--bg-surface)] rounded-[var(--radius-md)]">
      <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-2">
        Request Timeline
      </div>
      <div className="h-7 bg-[var(--bg-base)] rounded-[var(--radius-sm)] overflow-hidden flex">
        {phases.map((phase, _i) => {
          const widthPercent = (phase.value / totalTime) * 100;
          if (widthPercent < 0.5) return null;

          return (
            <div
              key={phase.name}
              className="h-full relative group transition-opacity hover:opacity-90"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: phase.color,
                minWidth: phase.value > 0 ? '2px' : '0',
              }}
              title={`${phase.name}: ${phase.value.toFixed(1)}ms`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2.5">
        {phases.map(phase => (
          phase.value > 0 && (
            <div key={phase.name} className="flex items-center gap-1.5 text-[10px]">
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: phase.color }}
              />
              <span className="text-[var(--text-tertiary)]">{phase.name}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
